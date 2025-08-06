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
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

const app = express();
app.use(cors());
app.use(express.json());

// --- API VÉGPONTOK ---

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

// A szerver indítása
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});