const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
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
        pass: process.env.MAIL_PASSWORD, // Az Alkalmazásjelszó
    },
});

const app = express();
app.use(cors());
app.use(express.json());

// --- API VÉGPONTOK ---

app.get('/api', (req, res) => {
  res.json({ message: "Szia! Ez a Fókusz Mester API válasza." });
});

// A REGISZTRÁCIÓS VÉGPONT TELJES LOGIKÁVAL
app.post('/api/register', async (req, res) => {
  const { role, username, email, password, vipCode, classCode } = req.body;
  console.log('Regisztrációs kérés feldolgozása:', { email, username, role });

  // 1. Alapvető validálás
  if (!username || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." });
  }

  try {
    // 2. Ellenőrizzük, hogy az e-mail cím foglalt-e
    const userExists = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Ez az e-mail cím már regisztrálva van." });
    }

    // 3. Jelszó titkosítása ("hashelése")
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Felhasználó mentése az adatbázisba
    const newUserQuery = `
      INSERT INTO Users (username, email, password_hash, role) 
      VALUES ($1, $2, $3, $4) RETURNING id, email;
    `;
    const newUserResult = await pool.query(newUserQuery, [username, email, passwordHash, role]);
    const newUser = newUserResult.rows[0];
    
    console.log(`Felhasználó sikeresen létrehozva az adatbázisban, ID: ${newUser.id}`);

    // 5. Megerősítő e-mail küldése (még nem implementáljuk a token logikát, csak egy üdvözlő emailt)
    const mailOptions = {
        from: process.env.MAIL_DEFAULT_SENDER,
        to: newUser.email,
        subject: 'Sikeres regisztráció a Fókusz Mester oldalon!',
        html: `<h1>Üdvözlünk, ${username}!</h1><p>Sikeresen regisztráltál a Fókusz Mester oldalra. Hamarosan küldjük a megerősítő linket.</p>`
    };

    await transporter.sendMail(mailOptions);
    console.log(`Megerősítő e-mail sikeresen elküldve a(z) ${newUser.email} címre.`);

    // 6. Sikeres válasz küldése a frontendnek
    res.status(201).json({ 
      success: true, 
      message: `Sikeres regisztráció! Kérjük, erősítsd meg az e-mail címedet (ellenőrizd a postafiókodat).` 
    });

  } catch (error) {
    console.error('Hiba történt a regisztráció során:', error);
    res.status(500).json({ success: false, message: "Szerverhiba történt a regisztráció során. Kérjük, próbáld újra később." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});