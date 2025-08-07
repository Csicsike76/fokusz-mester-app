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

// A REGISZTRÁCIÓS VÉGPONT JAVÍTOTT HIBAKEZELÉSSEL
// A REGISZTRÁCIÓS VÉGPONT TELJES LOGIKÁVAL
// A REGISZTRÁCIÓS VÉGPONT JAVÍTOTT ADMIN LINKKEL
app.post('/api/register', async (req, res) => {
  const { role, username, email, password, vipCode, classCode } = req.body;
  
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userExists = await client.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      throw new Error("Ez az e-mail cím már regisztrálva van.");
    }

    if (role === 'teacher' && vipCode !== process.env.VIP_CODE) {
      throw new Error("Érvénytelen VIP kód.");
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

      // JAVÍTÁS ITT: A link most a frontend oldalra mutat, de a frontend
      // fogja meghívni a backendet. Ez a helyes SPA (Single Page App) megközelítés.
      const approvalUrl = `${process.env.FRONTEND_URL}/approve-teacher/${newUserId}`;
      
      const adminMailOptions = {
          from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
          to: process.env.MAIL_DEFAULT_SENDER,
          subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!',
          html: `<p>Új tanár regisztrált: ${username} (${email}). Kattints a linkre a jóváhagyáshoz: <a href="${approvalUrl}">Jóváhagyás</a></p>`
      };
      await transporter.sendMail(adminMailOptions);
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const userMailOptions = {
        from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
        to: email,
        subject: 'Erősítsd meg az e-mail címedet a Fókusz Mester oldalon!',
        html: `<p>Kattints a linkre a regisztrációd véglegesítéséhez: <a href="${verificationUrl}">Megerősítés</a></p>`
    };
    await transporter.sendMail(userMailOptions);

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: `Sikeres regisztráció! Elküldtünk egy megerősítő linket a(z) ${email} címre.` });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Hiba történt a regisztráció során:', error);
    res.status(400).json({ success: false, message: error.message || "Szerverhiba történt." });
  } finally {
    if (client) client.release();
  }
});

// A TANÁR-JÓVÁHAGYÓ VÉGPONT JAVÍTVA
app.get('/api/approve-teacher/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`Jóváhagyási kérés érkezett a ${userId} ID-jű felhasználóhoz.`);

  try {
    const updateQuery = `UPDATE Teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id;`;
    const result = await pool.query(updateQuery, [userId]);

    if (result.rows.length === 0) {
      // Itt már nem HTML-t, hanem JSON-t küldünk vissza
      return res.status(404).json({ success: false, message: 'A tanári felhasználó nem található.' });
    }

    console.log(`A(z) ${userId} ID-jű tanár sikeresen jóváhagyva.`);
    
    // TODO: E-mail küldése a tanárnak, hogy a fiókja aktív lett.

    // Sikeres JSON választ küldünk vissza
    res.status(200).json({ success: true, message: 'A tanári fiók sikeresen aktiválva lett.' });

  } catch (error) {
    console.error('Hiba a tanár jóváhagyása során:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt a jóváhagyás során.' });
  }
});
app.post('/api/classes/create', authenticateToken, async (req, res) => {
    const { userId, role } = req.user;
    const { className, maxStudents } = req.body;

    if (role !== 'teacher') {
        return res.status(403).json({ success: false, message: "Nincs jogosultságod osztály létrehozásához." });
    }
    
    if (!className || !maxStudents) {
        return res.status(400).json({ success: false, message: "Az osztály neve és a maximális létszám megadása kötelező." });
    }
    if (maxStudents < 5 || maxStudents > 30) { // JAVÍTÁS ITT
        return res.status(400).json({ success: false, message: "A létszám 5 és 30 között lehet." });
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

    // ÚJ VÉDPONT: A BEJELENTKEZETT TANÁR OSZTÁLYAINAK LEKÉRDEZÉSE
app.get('/api/teacher/classes', authenticateToken, async (req, res) => {
    const { userId, role } = req.user;

    // Ellenőrizzük, hogy a felhasználó valóban tanár-e
    if (role !== 'teacher') {
        return res.status(403).json({ success: false, message: "Nincs jogosultságod." });
    }

    try {
        // Lekérdezzük az összes osztályt, amit ez a tanár hozott létre
        const classesQuery = 'SELECT * FROM Classes WHERE teacher_id = $1 ORDER BY created_at DESC';
        const classesResult = await pool.query(classesQuery, [userId]);

        res.status(200).json({ success: true, classes: classesResult.rows });

    } catch (error) {
        console.error("Hiba a tanári osztályok lekérdezése során:", error);
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

// A BEJELENTKEZÉSI VÉGPONT JAVÍTVA A TANÁRI JÓVÁHAGYÁS ELLENŐRZÉSÉVEL
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Az e-mail cím és a jelszó megadása kötelező." });
  }

  try {
    // 1. Megkeressük a felhasználót az e-mail alapján
    const userResult = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." });
    }
    let user = userResult.rows[0];

    // 2. Ellenőrizzük, hogy az e-mail címe meg van-e erősítve
    if (!user.email_verified) {
        return res.status(403).json({ success: false, message: "Kérjük, először erősítsd meg az e-mail címedet!" });
    }

    // 3. Ellenőrizzük a jelszót
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." });
    }

    // 4. JAVÍTÁS ITT: Ha a felhasználó szerepköre 'teacher',
    //    ellenőrizzük a 'Teachers' táblában, hogy jóvá van-e hagyva.
    if (user.role === 'teacher') {
        const teacherResult = await pool.query('SELECT is_approved FROM Teachers WHERE user_id = $1', [user.id]);
        
        // Ha nincs is bejegyzés róla, vagy nincs jóváhagyva, nem léphet be tanárként
        if (teacherResult.rows.length === 0 || !teacherResult.rows[0].is_approved) {
            return res.status(403).json({ success: false, message: "A tanári fiókod még nem lett jóváhagyva egy adminisztrátor által." });
        }
    }

    // 5. Ha minden ellenőrzés sikeres, létrehozzuk a tokent
    const tokenPayload = {
      userId: user.id,
      role: user.role
    };
    const token = jwt.sign(tokenPayload, process.env.SECRET_KEY, { expiresIn: '1d' });

    console.log(`Sikeres bejelentkezés: ${user.email}, szerepkör: ${user.role}`);

    // 6. Visszaküldjük a tokent és a felhasználói adatokat
    res.status(200).json({
      success: true,
      message: "Sikeres bejelentkezés!",
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Hiba történt a bejelentkezés során:', error);
    res.status(500).json({ success: false, message: "Szerverhiba történt a bejelentkezés során." });
  }
});
// A többi végpont (verify-email, login, etc.) és a szerver indítása itt következik, változatlanul.
// Az egyszerűség kedvéért a korábbi teljes kódból ezeket a részeket is beillesztheted ide.


// "TITKOS" VÉGPONT A FELHASZNÁLÓK TÖRLÉSÉRE
app.get('/api/admin/clear-users/:secret', async (req, res) => {
    const { secret } = req.params;

    // Ellenőrizzük a titkos kulcsot
    if (secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: "Hozzáférés megtagadva." });
    }

    try {
        await pool.query('DELETE FROM Users');
        console.log('ADMIN: Minden felhasználó sikeresen törölve az adatbázisból.');
        res.status(200).json({ success: true, message: "Minden felhasználó törölve." });
    } catch (error) {
        console.error('Hiba a felhasználók törlése során:', error);
        res.status(500).json({ success: false, message: "Hiba a törlés során." });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});