const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Adatbázis kapcsolat
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// E-mail küldő
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    secure: false, 
    auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD },
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware a felhasználói hitelesítés ellenőrzéséhez
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- API VÉGPONTOK ---

// A REGISZTRÁCIÓS VÉGPONT AZ OSZTÁLYHOZ CSATLAKOZÁS LOGIKÁJÁVAL
app.post('/api/register', async (req, res) => {
  // Most már a classCode-ot is kiolvassuk
  const { role, username, email, password, vipCode, classCode } = req.body;
  
  if (!username || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Tranzakció indítása a biztonságos adatkezelésért

    const userExists = await client.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      throw new Error("Ez az e-mail cím már regisztrálva van.");
    }

    if (role === 'teacher' && vipCode !== process.env.VIP_CODE) {
      throw new Error("Érvénytelen VIP kód.");
    }
    
    // --- ÚJ LOGIKA A DIÁKOK CSATLAKOZÁSÁHOZ ---
    let classId = null; // Létrehozunk egy változót az osztály ID tárolására
    if (role === 'student' && classCode) {
        console.log(`Osztálykód ellenőrzése: ${classCode}`);
        const classResult = await client.query('SELECT id, max_students FROM Classes WHERE class_code = $1 AND is_active = true', [classCode]);

        // 1. Ellenőrzés: Létezik-e a kód?
        if (classResult.rows.length === 0) {
            throw new Error("A megadott osztálykód érvénytelen vagy az osztály már nem aktív.");
        }
        
        classId = classResult.rows[0].id;
        const maxStudents = classResult.rows[0].max_students;

        // 2. Ellenőrzés: Nincs-e betelve az osztály?
        const memberCountResult = await client.query('SELECT COUNT(*) FROM ClassMemberships WHERE class_id = $1', [classId]);
        const memberCount = parseInt(memberCountResult.rows[0].count, 10);

        if (memberCount >= maxStudents) {
            throw new Error("Ez az osztály sajnos már betelt.");
        }
        console.log(`Osztály (ID: ${classId}) érvényes, van szabad hely.`);
    }
    // --- ÚJ LOGIKA VÉGE ---

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 3600000);

    const newUserQuery = `
      INSERT INTO Users (username, email, password_hash, role, email_verification_token, email_verification_expires) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
    `;
    const newUserResult = await client.query(newUserQuery, [username, email, passwordHash, role, verificationToken, verificationExpires]);
    const newUserId = newUserResult.rows[0].id;

    if (role === 'teacher') {
      await client.query(`INSERT INTO Teachers (user_id, vip_code, is_approved) VALUES ($1, $2, false);`, [newUserId, vipCode]);
      // ... (admin értesítő e-mail küldése változatlan)
    }

    // Ha a diák adott meg érvényes osztálykódot, hozzáadjuk az osztályhoz
    if (classId) {
        await client.query(`INSERT INTO ClassMemberships (user_id, class_id) VALUES ($1, $2);`, [newUserId, classId]);
        console.log(`Diák (User ID: ${newUserId}) hozzáadva az osztályhoz (Class ID: ${classId}).`);
    }

    // ... (felhasználó megerősítő e-mail küldése változatlan) ...

    await client.query('COMMIT'); // Véglegesítjük az összes adatbázis-műveletet
    res.status(201).json({ success: true, message: `Sikeres regisztráció! Megerősítő e-mailt küldtünk.` });

  } catch (error) {
    if (client) await client.query('ROLLBACK'); // Hiba esetén mindent visszavonunk
    console.error('Regisztrációs hiba:', error);
    // A frontendnek most már a konkrét hibaüzenetet küldjük vissza
    res.status(400).json({ success: false, message: error.message || "Szerverhiba történt." });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const userResult = await pool.query('SELECT * FROM Users WHERE email_verification_token = $1 AND email_verification_expires > NOW()', [token]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "A megerősítő link érvénytelen vagy lejárt."});
        }
        const user = userResult.rows[0];
        await pool.query('UPDATE Users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1', [user.id]);
        res.status(200).json({ success: true, message: "Sikeres megerősítés! Most már bejelentkezhetsz."});
    } catch (error) {
        console.error('Email megerősítési hiba:', error);
        res.status(500).json({ success: false, message: "Szerverhiba történt."});
    }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "E-mail és jelszó megadása kötelező." });
  }
  try {
    const userResult = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." });
    }
    const user = userResult.rows[0];
    
    if (!user.email_verified) {
        return res.status(403).json({ success: false, message: "Kérjük, először erősítsd meg az e-mail címedet!" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." });
    }

    if (user.role === 'teacher') {
        const teacherResult = await pool.query('SELECT is_approved FROM Teachers WHERE user_id = $1', [user.id]);
        if (teacherResult.rows.length === 0 || !teacherResult.rows[0].is_approved) {
            return res.status(403).json({ success: false, message: "A tanári fiókod még nem lett jóváhagyva." });
        }
    }
    
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.SECRET_KEY, { expiresIn: '1d' });
    res.status(200).json({
      success: true,
      token: token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Bejelentkezési hiba:', error);
    res.status(500).json({ success: false, message: "Szerverhiba történt." });
  }
});

app.get('/api/approve-teacher/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`UPDATE Teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id;`, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'A tanári felhasználó nem található.' });
    }
    res.status(200).json({ success: true, message: 'A tanári fiók sikeresen aktiválva lett.' });
  } catch (error) {
    console.error('Hiba a tanár jóváhagyása során:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

app.post('/api/classes/create', authenticateToken, async (req, res) => {
    const { userId, role } = req.user;
    const { className, maxStudents } = req.body;

    if (role !== 'teacher') {
        return res.status(403).json({ success: false, message: "Nincs jogosultságod osztály létrehozásához." });
    }
    
    if (!className || !maxStudents || maxStudents < 5 || maxStudents > 30) {
        return res.status(400).json({ success: false, message: "Hibás adatok. Az osztály nevének megadása kötelező, a létszám 5 és 30 között lehet." });
    }

    try {
        const classCode = `FKSZ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const newClassQuery = `
            INSERT INTO Classes (class_name, class_code, teacher_id, max_students) 
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const newClassResult = await pool.query(newClassQuery, [className, classCode, userId, maxStudents]);
        
        // Admin értesítő email küldése
        // Ezt a részt hozzáadhatod, ha szeretnéd
        
        res.status(201).json({ success: true, message: "Osztály sikeresen létrehozva.", class: newClassResult.rows[0] });
    } catch (error) {
        console.error("Hiba az osztály létrehozása során:", error);
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});

app.get('/api/teacher/classes', authenticateToken, async (req, res) => {
    const { userId, role } = req.user;
    if (role !== 'teacher') {
        return res.status(403).json({ success: false, message: "Nincs jogosultságod." });
    }
    try {
        const classesQuery = 'SELECT * FROM Classes WHERE teacher_id = $1 ORDER BY created_at DESC';
        const classesResult = await pool.query(classesQuery, [userId]);
        res.status(200).json({ success: true, classes: classesResult.rows });
    } catch (error) {
        console.error("Hiba a tanári osztályok lekérdezése során:", error);
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});

app.get('/api/admin/clear-users/:secret', async (req, res) => {
    const { secret } = req.params;
    if (secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: "Hozzáférés megtagadva." });
    }
    try {
        await pool.query('DELETE FROM Users');
        res.status(200).json({ success: true, message: "Minden felhasználó törölve." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Hiba a törlés során." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});