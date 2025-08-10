// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();

/* ===== ENV ===== */
const {
  DATABASE_URL,
  PORT = 3001,
  CLIENT_URL = 'http://localhost:3000', // ide mutat a verify link
  SECRET_KEY = 'change-me',
  VIP_CODE,                              // egyetlen fix VIP kód (Render env-ben)
  MAIL_SERVER,
  MAIL_PORT,
  MAIL_USERNAME,
  MAIL_PASSWORD,
  MAIL_DEFAULT_SENDER,                   // feladó + admin értesítés
  MAIL_USE_TLS
} = process.env;

/* ===== DB ===== */
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

/* ===== MIDDLEWARE ===== */
app.use(express.json());
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:3000', 'https://localhost:3000'],
    credentials: true
  })
);

/* ===== MAILER ===== */
const transporter = nodemailer.createTransport({
  host: MAIL_SERVER,
  port: Number(MAIL_PORT || 587),
  secure: String(MAIL_USE_TLS).toLowerCase() === 'true',
  auth: {
    user: MAIL_USERNAME,
    pass: MAIL_PASSWORD
  }
});

/* ===== HELPERS ===== */
function buildVerifyUrl(token) {
  return `${CLIENT_URL.replace(/\/+$/, '')}/verify-email/${token}`;
}

async function sendVerificationEmail(to, token) {
  const verifyUrl = buildVerifyUrl(token);
  const mail = {
    from: MAIL_DEFAULT_SENDER,
    to,
    subject: 'Erősítsd meg az e-mail címed',
    html: `
      <p>Szia!</p>
      <p>Kérjük, erősítsd meg az e-mail címed az alábbi gombbal:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#2ecc71;color:#fff;border-radius:6px;text-decoration:none">E-mail megerősítése</a></p>
      <p>Ha a gomb nem működik, ezt a linket másold be a böngészőbe:<br>${verifyUrl}</p>
    `
  };
  await transporter.sendMail(mail);
}

async function notifyAdminAboutTeacherRequest(user) {
  if (!MAIL_DEFAULT_SENDER) return;
  const mail = {
    from: MAIL_DEFAULT_SENDER,
    to: MAIL_DEFAULT_SENDER,
    subject: 'Új tanári regisztráció jóváhagyásra vár',
    html: `
      <p>Új tanári regisztráció érkezett.</p>
      <ul>
        <li>Név: ${user.name || '-'}</li>
        <li>E-mail: ${user.email}</li>
      </ul>
      <p>A felhasználó e-mail megerősítése után a Teacher Dashboard oldalon jóváhagyható.</p>
    `
  };
  try { await transporter.sendMail(mail); } catch {}
}

/* ===== ROUTES ===== */

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Regisztráció – VIP kódot NEM generálunk/mentünk; csak összehasonlítunk az ENV-ben lévővel
app.post('/api/register', async (req, res) => {
  const { name, email, password, vipCode, referralCode } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'E-mail és jelszó kötelező.' });
  }

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Ezzel az e-mail címmel már van fiók.' });
    }

    let role = 'student';
    if (vipCode && VIP_CODE && String(vipCode).trim() === String(VIP_CODE).trim()) {
      role = 'teacher_pending'; // tanári szerep jóváhagyásra vár
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const insertSql = `
      INSERT INTO users (name, email, password_hash, role, is_verified, verify_token, referral_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, role
    `;
    const { rows } = await pool.query(insertSql, [
      name || null,
      email.toLowerCase(),
      passwordHash,
      role,
      false,
      verifyToken,
      referralCode || null
    ]);

    const user = rows[0];

    await sendVerificationEmail(email, verifyToken);
    if (role === 'teacher_pending') {
      await notifyAdminAboutTeacherRequest(user);
    }

    return res.json({
      success: true,
      message: 'Sikeres regisztráció! Nézd meg a postafiókodat és erősítsd meg az e-mail címed.'
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ success: false, message: 'Szerver hiba a regisztrációnál.' });
  }
});

// E-mail megerősítés – siker esetén a frontend siker oldalára irányítunk
app.get('/api/verify-email/:token', async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ success: false, message: 'Hiányzó token.' });

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE verify_token = $1', [token]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Érvénytelen vagy már felhasznált token.' });
    }

    await pool.query('UPDATE users SET is_verified = true, verify_token = NULL WHERE id = $1', [rows[0].id]);

    return res.redirect(`${CLIENT_URL.replace(/\/+$/, '')}/verify-email/success`);
  } catch (err) {
    console.error('VERIFY ERROR:', err);
    return res.status(500).json({ success: false, message: 'Szerver hiba az e-mail megerősítésnél.' });
  }
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
