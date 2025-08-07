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
app.post('/api/register', async (req, res) => {
  const { role, username, email, password, vipCode, classCode } = req.body;
  console.log('Regisztrációs kérés feldolgozása:', { email, username, role });

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userExists = await client.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      throw new Error("Ez az e-mail cím már regisztrálva van.");
    }

    // --- Tanári regisztráció speciális kezelése ---
    if (role === 'teacher') {
      if (vipCode !== process.env.VIP_CODE) {
        throw new Error("Érvénytelen VIP kód.");
      }
    }
    // --- ------------------------------------ ---

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 3600000); // 1 óra

    const newUserQuery = `
      INSERT INTO Users (username, email, password_hash, role, email_verification_token, email_verification_expires) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
    `;
    const newUserResult = await client.query(newUserQuery, [username, email, passwordHash, role, verificationToken, verificationExpires]);
    const newUserId = newUserResult.rows[0].id;
    console.log(`Felhasználó sikeresen létrehozva az adatbázisban, ID: ${newUserId}`);

    // Ha tanár, a Teachers táblába is beillesztjük
    if (role === 'teacher') {
      await client.query(`INSERT INTO Teachers (user_id, vip_code, is_approved) VALUES ($1, $2, false);`, [newUserId, vipCode]);
      console.log(`Tanár adatok mentve a ${newUserId} ID-jű felhasználóhoz, jóváhagyásra vár.`);

      // --- 2. E-MAIL KÜLDÉSE: ÉRTESÍTŐ AZ ADMINNAK ---
      const approvalUrl = `${process.env.FRONTEND_URL}/approve-teacher/${newUserId}`; // Ezt az oldalt majd létre kell hozni
      const adminMailOptions = {
          from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
          to: process.env.MAIL_DEFAULT_SENDER, // Saját magadnak küldöd
          subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!',
          html: `
              <h1>Új Tanári Regisztráció</h1>
              <p>Egy új tanár regisztrált a Fókusz Mester oldalon, és a te jóváhagyásodra vár.</p>
              <ul>
                  <li><strong>Felhasználónév:</strong> ${username}</li>
                  <li><strong>E-mail:</strong> ${email}</li>
              </ul>
              <p>Kattints a linkre a fiók aktiválásához. FONTOS: Ez a link még nem működik teljesen, a funkciót később kell befejezni.</p>
              <a href="${approvalUrl}" style="padding: 10px; background-color: #2ecc71; color: white;">Jóváhagyás</a>
          `
      };
      await transporter.sendMail(adminMailOptions);
      console.log(`Admin értesítő e-mail elküldve a ${newUserId} ID-jű tanár jóváhagyásához.`);
    }

    // --- 1. E-MAIL KÜLDÉSE: MEGERŐSÍTŐ A FELHASZNÁLÓNAK (minden esetben) ---
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const userMailOptions = {
        from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
        to: email,
        subject: 'Erősítsd meg az e-mail címedet a Fókusz Mester oldalon!',
        html: `<p>Kattints a linkre a regisztrációd véglegesítéséhez: <a href="${verificationUrl}">Megerősítés</a></p>`
    };
    await transporter.sendMail(userMailOptions);
    console.log(`Megerősítő e-mail sikeresen elküldve a(z) ${email} címre.`);

    await client.query('COMMIT');
    res.status(201).json({ 
      success: true, 
      message: `Sikeres regisztráció! Elküldtünk egy megerősítő linket a(z) ${email} címre.` 
    });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Hiba történt a regisztráció során:', error);
    res.status(400).json({ success: false, message: error.message || "Szerverhiba történt." });
  } finally {
    if (client) client.release();
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