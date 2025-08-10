// backend/server.js

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer =require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

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

app.post('/api/register', async (req, res) => {
  const { role, username, email, password, vipCode, classCode, referralCode } = req.body;
  if (!username || !email || !password || !role) { return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." }); }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userExists = await client.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) { throw new Error("Ez az e-mail cím már regisztrálva van."); }
    let referrerId = null;
    if (referralCode) {
        const referrerResult = await client.query('SELECT id FROM Users WHERE referral_code = $1', [referralCode]);
        if (referrerResult.rows.length > 0) { referrerId = referrerResult.rows[0].id; }
    }
    if (role === 'teacher' && vipCode !== process.env.VIP_CODE) { throw new Error("Érvénytelen VIP kód."); }
    let classId = null;
    if (role === 'student' && classCode) {
        const classResult = await client.query('SELECT id, max_students FROM Classes WHERE class_code = $1 AND is_active = true', [classCode]);
        if (classResult.rows.length === 0) { throw new Error("A megadott osztálykód érvénytelen vagy az osztály már nem aktív."); }
        classId = classResult.rows[0].id;
        const maxStudents = classResult.rows[0].max_students;
        const memberCountResult = await client.query('SELECT COUNT(*) FROM ClassMemberships WHERE class_id = $1', [classId]);
        const memberCount = parseInt(memberCountResult.rows[0].count, 10);
        if (memberCount >= maxStudents) { throw new Error("Ez az osztály sajnos már betelt."); }
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 3600000);
    const newReferralCode = `FKSZ-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const newUserQuery = `INSERT INTO Users (username, email, password_hash, role, referral_code, email_verification_token, email_verification_expires, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id, created_at;`;
    const newUserResult = await client.query(newUserQuery, [username, email, passwordHash, role, newReferralCode, verificationToken, verificationExpires]);
    const newUserId = newUserResult.rows[0].id;
    const registrationDate = newUserResult.rows[0].created_at;
    if (referrerId) {
        await client.query('INSERT INTO Referrals (referrer_user_id, referred_user_id) VALUES ($1, $2)', [referrerId, newUserId]);
    }
    if (role === 'teacher') {
      await client.query(`INSERT INTO Teachers (user_id, vip_code, is_approved) VALUES ($1, $2, false);`, [newUserId, vipCode]);
      const approvalUrl = `${process.env.FRONTEND_URL}/approve-teacher/${newUserId}`;
      const adminMailOptions = { from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`, to: process.env.MAIL_DEFAULT_SENDER, subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!', html: `<p>Új tanár: ${username} (${email}). <a href="${approvalUrl}">Jóváhagyás</a></p>`};
      await transporter.sendMail(adminMailOptions);
    }
    if (role === 'student' && classId) {
        await client.query(`INSERT INTO ClassMemberships (user_id, class_id) VALUES ($1, $2);`, [newUserId, classId]);
    }
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const userMailOptions = { from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`, to: email, subject: 'Erősítsd meg az e-mail címedet!', html: `<p>Kattints a linkre a regisztrációdhoz: <a href="${verificationUrl}">Megerősítés</a></p>`};
    await transporter.sendMail(userMailOptions);
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: `Sikeres regisztráció! Megerősítő e-mailt küldtünk.`, user: { id: newUserId, createdAt: registrationDate } });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: error.message || "Szerverhiba történt." });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const userResult = await pool.query('SELECT * FROM Users WHERE email_verification_token = $1 AND email_verification_expires > NOW()', [token]);
        if (userResult.rows.length === 0) { return res.status(400).json({ success: false, message: "A megerősítő link érvénytelen vagy lejárt."}); }
        const user = userResult.rows[0];
        await pool.query('UPDATE Users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1', [user.id]);
        res.status(200).json({ success: true, message: "Sikeres megerősítés! Most már bejelentkezhetsz."});
    } catch (error) {
        res.status(500).json({ success: false, message: "Szerverhiba történt a megerősítés során."});
    }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { return res.status(400).json({ success: false, message: "E-mail és jelszó megadása kötelező." }); }
  try {
    const userResult = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) { return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." }); }
    const user = userResult.rows[0];
    if (!user.email_verified) { return res.status(403).json({ success: false, message: "Kérjük, először erősítsd meg az e-mail címedet!" }); }
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) { return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." }); }
    if (user.role === 'teacher') {
        const teacherResult = await pool.query('SELECT is_approved FROM Teachers WHERE user_id = $1', [user.id]);
        if (teacherResult.rows.length === 0 || !teacherResult.rows[0].is_approved) { return res.status(403).json({ success: false, message: "A tanári fiókod még nem lett jóváhagyva." }); }
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.SECRET_KEY, { expiresIn: '1d' });
    res.status(200).json({ success: true, token: token, user: { id: user.id, username: user.username, email: user.email, role: user.role, referral_code: user.referral_code, createdAt: user.created_at } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Szerverhiba történt." });
  }
});

app.get('/api/curriculums', async (req, res) => {
    const { subject, grade, q } = req.query; 
    let queryText = 'SELECT * FROM curriculums WHERE is_published = true';
    const queryParams = [];
    if (subject) {
        queryParams.push(subject);
        queryText += ` AND subject = $${queryParams.length}`;
    }
    if (grade) {
        queryParams.push(grade);
        queryText += ` AND grade = $${queryParams.length}`;
    }
    if (q) {
        queryParams.push(`%${q.toLowerCase()}%`);
        queryText += ` AND LOWER(title) ILIKE $${queryParams.length}`;
    }
    queryText += ' ORDER BY subject, grade, title;';
    try {
        const result = await pool.query(queryText, queryParams);
        if (subject || grade || q) {
            return res.status(200).json({ success: true, data: result.rows });
        }
        const groupedData = {
            freeLessons: {},
            freeTools: [],
            premiumCourses: [],
            premiumTools: []
        };
        result.rows.forEach(item => {
            const subjectKey = item.subject || 'altalanos';
            switch (item.category) {
                case 'free_lesson':
                    if (!groupedData.freeLessons[subjectKey]) { groupedData.freeLessons[subjectKey] = []; }
                    groupedData.freeLessons[subjectKey].push(item);
                    break;
                case 'free_tool': groupedData.freeTools.push(item); break;
                case 'premium_course': groupedData.premiumCourses.push(item); break;
                case 'premium_tool': groupedData.premiumTools.push(item); break;
                default: break;
            }
        });
        res.status(200).json({ success: true, data: groupedData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});

app.get('/api/quiz/:slug', async (req, res) => {
  const { slug } = req.params;
  const correctedSlug = slug.replace(/_/g, '-');

  const fsPath = path.join(__dirname, 'data', 'tananyag', `${correctedSlug}.json`);

  let curriculum = null;
  let questions = [];
  let dbContent = {};
  let fileContent = {};

  try {
    // 1) Próbáljuk DB-ből
    const curRes = await pool.query('SELECT * FROM curriculums WHERE slug = $1', [correctedSlug]);
    if (curRes.rows.length > 0) {
      curriculum = curRes.rows[0];

      // DB JSON parse – ha rossz, ne dobjunk 500-at, csak logoljuk és megyünk tovább
      if (curriculum.content) {
        try {
          dbContent = JSON.parse(curriculum.content);
        } catch (e) {
          console.warn(`[quiz] Hibás JSON a curriculums.content-ben (${correctedSlug}):`, e.message);
          dbContent = {};
        }
      }

      // Kérdések (ha vannak)
      const qRes = await pool.query('SELECT * FROM quizquestions WHERE curriculum_id = $1', [curriculum.id]);
      questions = qRes.rows || [];
    }
  } catch (err) {
    console.warn(`[quiz] DB lekérdezési hiba (${correctedSlug}):`, err.message);
    // Nem dobunk 500-at, megyünk a fájlos fallbackre
  }

  // 2) Fallback fájlból (ha nincs DB vagy hiányos)
  try {
    const raw = await fs.readFile(fsPath, 'utf8');
    fileContent = JSON.parse(raw);
  } catch (e) {
    // ha nincs fájl, semmi gond; csak akkor gond, ha a végén nincs semmi tartalom
    if (!curriculum && Object.keys(dbContent).length === 0) {
      return res.status(404).json({ success: false, message: "A kért tananyag nem található." });
    }
  }

  // 3) Összefésülés: DB meta + DB content + fájltartalom (a fájl felülírhat)
  const base = {
    slug: correctedSlug,
    category: curriculum?.category ?? fileContent.category ?? 'free_tool',
    title: curriculum?.title ?? fileContent.title ?? 'Tartalom',
    description: curriculum?.description ?? fileContent.description ?? '',
    id: curriculum?.id,
  };

  const merged = { ...base, ...dbContent, ...fileContent };
  merged.questions = questions;        // ha nincs DB-s kérdés, üres tömb
  delete merged.content;               // ne küldjük vissza a nyers JSON-t

  return res.status(200).json({ success: true, data: merged });
});


app.get('/api/help', async (req, res) => {
    const { q } = req.query;
    try {
        let queryText = 'SELECT * FROM helparticles';
        const queryParams = [];
        if (q && q.trim().length > 2) {
            queryParams.push(`%${q.trim().toLowerCase()}%`);
            queryText += ' WHERE LOWER(question) ILIKE $1 OR LOWER(answer) ILIKE $1 OR LOWER(keywords) ILIKE $1';
        }
        queryText += ' ORDER BY category, id;';
        const result = await pool.query(queryText, queryParams);
        const articlesByCategory = result.rows.reduce((acc, article) => {
            const { category } = article;
            if (!acc[category]) { acc[category] = []; }
            acc[category].push(article);
            return acc;
        }, {});
        res.status(200).json({ success: true, data: articlesByCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: "Szerverhiba történt a súgó cikkek lekérdezésekor." });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});