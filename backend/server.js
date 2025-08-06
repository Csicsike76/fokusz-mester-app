const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
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

app.get('/api', (req, res) => {
  res.json({ message: "Szia! Ez a Fókusz Mester API válasza." });
});

// A REGISZTRÁCIÓS VÉGPONT TELJES LOGIKÁVAL
app.post('/api/register', async (req, res) => {
  const { role, username, email, password, vipCode } = req.body;
  console.log('Regisztrációs kérés feldolgozása:', { email, username, role });

  if (!username || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." });
  }

  try {
    const userExists = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Ez az e-mail cím már regisztrálva van." });
    }

    if (role === 'teacher') {
      if (!vipCode || vipCode !== process.env.VIP_CODE) {
        console.warn(`Sikertelen tanári regisztrációs kísérlet hibás VIP kóddal: ${vipCode}`);
        return res.status(403).json({ success: false, message: "Érvénytelen VIP kód." });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const newUserQuery = `INSERT INTO Users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id;`;
      const newUserResult = await client.query(newUserQuery, [username, email, passwordHash, role]);
      const newUserId = newUserResult.rows[0].id;

      if (role === 'teacher') {
        const newTeacherQuery = `INSERT INTO Teachers (user_id, vip_code, is_approved) VALUES ($1, $2, false);`;
        await client.query(newTeacherQuery, [newUserId, vipCode]);
        console.log(`Tanár adatok mentve a ${newUserId} ID-jű felhasználóhoz, jóváhagyásra vár.`);

        const hostname = req.headers.host.includes('onrender.com') ? req.headers.host : 'fokusz-mester-backend.onrender.com';
        const approvalUrl = `https://${hostname}/api/approve-teacher/${newUserId}`;
        
        const adminMailOptions = {
            from: process.env.MAIL_DEFAULT_SENDER,
            to: process.env.MAIL_DEFAULT_SENDER,
            subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!',
            html: `
                <h1>Új Tanári Regisztráció</h1>
                <p>Egy új tanár regisztrált a Fókusz Mester oldalon, és a te jóváhagyásodra vár.</p>
                <ul>
                    <li><strong>Felhasználónév:</strong> ${username}</li>
                    <li><strong>E-mail:</strong> ${email}</li>
                </ul>
                <p>Kattints az alábbi linkre a fiók aktiválásához:</p>
                <a href="${approvalUrl}" style="padding: 10px 20px; background-color: #2ecc71; color: white; text-decoration: none; border-radius: 5px;">
                    Jóváhagyás
                </a>
            `
        };
        await transporter.sendMail(adminMailOptions);
        console.log(`Admin értesítő e-mail elküldve a ${newUserId} ID-jű tanár jóváhagyásához.`);
      }
      
      await client.query('COMMIT');

      res.status(201).json({ 
        success: true, 
        message: role === 'teacher' 
          ? `Sikeres regisztráció! A fiókodat egy adminisztrátornak jóvá kell hagynia, mielőtt be tudnál lépni.`
          : `Sikeres regisztráció! Kérjük, ellenőrizd az e-mail postafiókodat.`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Hiba történt a regisztráció során:', error);
    res.status(500).json({ success: false, message: "Szerverhiba történt. Kérjük, próbáld újra később." });
  }
});

// A BEJELENTKEZÉSI VÉGPONT (már meglévő)
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

// VÉGPONT A TANÁROK JÓVÁHAGYÁSÁRA
app.get('/api/approve-teacher/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`Jóváhagyási kérés érkezett a ${userId} ID-jű felhasználóhoz.`);

  try {
    const updateQuery = `UPDATE Teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id;`;
    const result = await pool.query(updateQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).send('<h1>Hiba</h1><p>A tanári felhasználó nem található.</p>');
    }

    console.log(`A(z) ${userId} ID-jű tanár sikeresen jóváhagyva.`);
    
    // TODO: Itt lehetne egy e-mailt küldeni a tanárnak, hogy a fiókja aktív lett.

    res.status(200).send('<h1>Sikeres Jóváhagyás!</h1><p>A tanári fiók sikeresen aktiválva lett.</p>');

  } catch (error) {
    console.error('Hiba a tanár jóváhagyása során:', error);
    res.status(500).send('<h1>Szerverhiba</h1><p>Hiba történt a jóváhagyás során.</p>');
  }
});

// A SZERVER INDÍTÁSA
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});