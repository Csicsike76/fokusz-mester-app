const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken'); // Itt van az új csomag
require('dotenv').config();

// --- ADATBÁZIS KAPCSOLAT LÉTREHOZÁSA ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- E-MAIL KÜLDŐ (TRANSPORTER) BEÁLLÍTÁSA ---
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

const app = express();
app.use(cors());
app.use(express.json());

// --- API VÉGPONTOK ---

app.get('/api', (req, res) => {
  res.json({ message: "Szia! Ez a Fókusz Mester API válasza." });
});

// A REGISZTRÁCIÓS VÉGPONT (már meglévő)
app.post('/api/register', async (req, res) => {
  const { role, username, email, password, vipCode, classCode } = req.body;
  console.log('Regisztrációs kérés feldolgozása:', { email, username, role });

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

    const newUserQuery = `
      INSERT INTO Users (username, email, password_hash, role) 
      VALUES ($1, $2, $3, $4) RETURNING id, email;
    `;
    const newUserResult = await pool.query(newUserQuery, [username, email, passwordHash, role]);
    const newUser = newUserResult.rows[0];
    
    console.log(`Felhasználó sikeresen létrehozva az adatbázisban, ID: ${newUser.id}`);

    const mailOptions = {
        from: process.env.MAIL_DEFAULT_SENDER,
        to: newUser.email,
        subject: 'Sikeres regisztráció a Fókusz Mester oldalon!',
        html: `<h1>Üdvözlünk, ${username}!</h1><p>Sikeresen regisztráltál a Fókusz Mester oldalra. Hamarosan küldjük a megerősítő linket.</p>`
    };

    await transporter.sendMail(mailOptions);
    console.log(`Megerősítő e-mail sikeresen elküldve a(z) ${newUser.email} címre.`);

    res.status(201).json({ 
      success: true, 
      message: `Sikeres regisztráció! Kérjük, erősítsd meg az e-mail címedet (ellenőrizd a postafiókodat).` 
    });

  } catch (error) {
    console.error('Hiba történt a regisztráció során:', error);
    res.status(500).json({ success: false, message: "Szerverhiba történt a regisztráció során. Kérjük, próbáld újra később." });
  }
});

// A BEJELENTKEZÉSI VÉGPONT (ez az új rész)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Bejelentkezési kérés feldolgozása:', { email });

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Az e-mail cím és a jelszó megadása kötelező." });
  }

  try {
    const userResult = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." });
    }
    const user = userResult.rows[0];

    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." });
    }

    const tokenPayload = {
      userId: user.id,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, process.env.SECRET_KEY, { expiresIn: '1d' });

    console.log(`Sikeres bejelentkezés: ${user.email}, token létrehozva.`);

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


// A SZERVER INDÍTÁSA
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});