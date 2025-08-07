const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    secure: false, 
    auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD },
});

const app = express();
app.use(cors());
app.use(express.json());

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

app.post('/api/register', async (req, res) => {
  const { role, username, email, password, vipCode, classCode } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userExists = await client.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Ez az e-mail cím már regisztrálva van." });
    }

    if (role === 'teacher' && vipCode !== process.env.VIP_CODE) {
      return res.status(403).json({ success: false, message: "Érvénytelen VIP kód." });
    }

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
      // Admin értesítő email küldése (korábbi kódból)
    }

    if (role === 'student' && classCode) {
      const classResult = await client.query('SELECT id, max_students FROM Classes WHERE class_code = $1 AND is_active = true', [classCode]);
      if (classResult.rows.length === 0) {
        throw new Error("A megadott osztálykód érvénytelen.");
      }
      const classId = classResult.rows[0].id;
      const maxStudents = classResult.rows[0].max_students;

      const memberCountResult = await client.query('SELECT COUNT(*) FROM ClassMemberships WHERE class_id = $1', [classId]);
      const memberCount = parseInt(memberCountResult.rows[0].count, 10);

      if (memberCount >= maxStudents) {
        throw new Error("Ez az osztály sajnos már betelt.");
      }
      await client.query(`INSERT INTO ClassMemberships (user_id, class_id) VALUES ($1, $2);`, [newUserId, classId]);
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    // E-mail küldés (korábbi kódból)

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: `Sikeres regisztráció! Megerősítő e-mailt küldtünk.` });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Regisztrációs hiba:', error);
    res.status(500).json({ success: false, message: error.message || "Szerverhiba történt." });
  } finally {
    client.release();
  }
});

app.post('/api/classes/create', authenticateToken, async (req, res) => {
    const { userId, role } = req.user;
    const { className, maxStudents } = req.body;

    if (role !== 'teacher') {
        return res.status(403).json({ success: false, message: "Nincs jogosultságod osztály létrehozásához." });
    }
    
    if (!className || !maxStudents || maxStudents < 5 || maxStudents > 50) {
        return res.status(400).json({ success: false, message: "Hibás adatok. Az osztály nevének megadása kötelező, a létszám 5 és 50 között lehet." });
    }

    try {
        const classCode = `FKSZ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const newClassQuery = `
            INSERT INTO Classes (class_name, class_code, teacher_id, max_students) 
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const newClassResult = await pool.query(newClassQuery, [className, classCode, userId, maxStudents]);
        // Admin értesítő email küldése (korábbi kódból)
        res.status(201).json({ success: true, message: "Osztály sikeresen létrehozva.", class: newClassResult.rows[0] });
    } catch (error) {
        console.error("Hiba az osztály létrehozása során:", error);
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});

    app.post('/api/register', async (req, res) => {
  const { role, username, email, password } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." });
  }

  try {
    const userExists = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Ez az e-mail cím már regisztrálva van." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 3600000); // 1 óra

    const newUserQuery = `
      INSERT INTO Users (username, email, password_hash, role, email_verification_token, email_verification_expires) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING email;
    `;
    const newUserResult = await pool.query(newUserQuery, [username, email, passwordHash, role, verificationToken, verificationExpires]);
    const newUserEmail = newUserResult.rows[0].email;
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const mailOptions = {
        from: process.env.MAIL_DEFAULT_SENDER,
        to: newUserEmail,
        subject: 'Erősítsd meg az e-mail címedet a Fókusz Mester oldalon!',
        html: `<p>Kattints a linkre a regisztrációd véglegesítéséhez: <a href="${verificationUrl}">Megerősítés</a></p>`
    };
    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      success: true, 
      message: `Sikeres regisztráció! Elküldtünk egy megerősítő linket a(z) ${email} címre.` 
    });

  } catch (error) {
    console.error('Regisztrációs hiba:', error);
    res.status(500).json({ success: false, message: "Szerverhiba történt." });
  }
});

app.get('/api/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const userResult = await pool.query(
            'SELECT * FROM Users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
            [token]
        );
        if (userResult.rows.length === 0) {
            return res.status(400).send('<h1>A megerősítő link érvénytelen vagy lejárt.</h1>');
        }
        const user = userResult.rows[0];
        await pool.query(
            'UPDATE Users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1',
            [user.id]
        );
        res.send('<h1>Sikeres megerősítés! Most már bejelentkezhetsz.</h1>');
    } catch (error) {
        console.error('Email megerősítési hiba:', error);
        res.status(500).send('<h1>Szerverhiba.</h1>');
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

// A többi végpont (verify-email, login, etc.) és a szerver indítása itt következik, változatlanul.
// Az egyszerűség kedvéért a korábbi teljes kódból ezeket a részeket is beillesztheted ide.

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});