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
const validator = require('validator');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_USE_TLS === 'true',
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
  const { role, username, email, password, vipCode, classCode, referralCode, specialCode } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." });
  }

  const passwordOptions = { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 };
  if (!validator.isStrongPassword(password, passwordOptions)) {
      return res.status(400).json({ 
          success: false, 
          message: "A jelszó túl gyenge! A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt, számot és speciális karaktert (pl. ?, !, @, #)." 
      });
  }

  let isPermanentFree = false;
  if (specialCode && specialCode === process.env.SPECIAL_ACCESS_CODE) {
    isPermanentFree = true;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userExists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) throw new Error("Ez az e-mail cím már regisztrálva van.");
    let referrerId = null;
    if (referralCode) {
      const referrerResult = await client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode]);
      if (referrerResult.rows.length > 0) referrerId = referrerResult.rows[0].id;
    }
    if (role === 'teacher') {
      if (process.env.VIP_CODE && vipCode !== process.env.VIP_CODE) {
        throw new Error("Érvénytelen VIP kód.");
      }
    }
    let classId = null;
    if (role === 'student' && classCode) {
      const classResult = await client.query('SELECT id, max_students FROM classes WHERE class_code = $1 AND is_active = true', [classCode]);
      if (classResult.rows.length === 0) throw new Error("A megadott osztálykód érvénytelen vagy az osztály már nem aktív.");
      classId = classResult.rows[0].id;
      const maxStudents = classResult.rows[0].max_students;
      const memberCountResult = await client.query('SELECT COUNT(*) FROM classmemberships WHERE class_id = $1', [classId]);
      const memberCount = parseInt(memberCountResult.rows[0].count, 10);
      if (memberCount >= maxStudents) throw new Error("Ez az osztály sajnos már betelt.");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 3600000);
    const referralCodeNew = role === 'student' ? `FKSZ-${crypto.randomBytes(6).toString('hex').toUpperCase()}` : null;
    
    const insertUserQuery = `
      INSERT INTO users (username, email, password_hash, role, referral_code, email_verification_token, email_verification_expires, is_permanent_free, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id, created_at
    `;
    const newUserResult = await client.query(insertUserQuery, [
      username, email, passwordHash, role, referralCodeNew, verificationToken, verificationExpires, isPermanentFree
    ]);
    const newUserId = newUserResult.rows[0].id;
    const registrationDate = newUserResult.rows[0].created_at;
    if (referrerId) {
      await client.query('INSERT INTO referrals (referrer_user_id, referred_user_id) VALUES ($1, $2)', [referrerId, newUserId]);
    }
    if (role === 'teacher') {
      await client.query('INSERT INTO teachers (user_id, vip_code, is_approved) VALUES ($1, $2, false)', [newUserId, vipCode || null]);
    }
    if (role === 'student' && classId) {
      await client.query('INSERT INTO classmemberships (user_id, class_id) VALUES ($1, $2)', [newUserId, classId]);
    }
    
    const baseUrl = process.env.FRONTEND_URL || 'https://fokusz-mester-app.onrender.com';
    const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;
    
    const userMailOptions = {
      from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
      to: email,
      subject: 'Erősítsd meg az e-mail címedet!',
      html: `<p>Kérjük, kattints a linkre: <a href="${verificationUrl}">Megerősítés</a></p>`
    };
    await transporter.sendMail(userMailOptions);

    if (role === 'teacher') {
      const approvalUrl = `${baseUrl}/approve-teacher/${newUserId}`;
      const adminMailOptions = {
        from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
        to: process.env.MAIL_DEFAULT_SENDER,
        subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!',
        html: `<p>Új tanár: ${username} (${email})<br><a href="${approvalUrl}">Jóváhagyás</a></p>`
      };
      await transporter.sendMail(adminMailOptions);
    }
    
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: "Sikeres regisztráció! Ellenőrizd az emailjeidet.", user: { id: newUserId, createdAt: registrationDate } });
  } catch (err) {
    if(client) await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message || "Szerverhiba történt." });
  } finally {
    if(client) client.release();
  }
});

app.get('/api/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const userResult = await pool.query('SELECT id FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()', [token]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "A megerősítő link érvénytelen vagy lejárt."});
        }
        const user = userResult.rows[0];
        await pool.query('UPDATE users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1', [user.id]);
        res.status(200).json({ success: true, message: "Sikeres megerősítés! Most már bejelentkezhetsz."});
    } catch (error) {
        res.status(500).json({ success: false, message: "Szerverhiba történt a megerősítés során."});
    }
});

app.get('/api/approve-teacher/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query('UPDATE teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id', [userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "A tanár nem található." });
        }
        res.status(200).json({ success: true, message: "A tanári fiók sikeresen jóváhagyva." });
    } catch (error) {
        console.error("Tanár jóváhagyási hiba:", error);
        res.status(500).json({ success: false, message: "Hiba történt a jóváhagyás során."});
    }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { return res.status(400).json({ success: false, message: "E-mail és jelszó megadása kötelező." }); }
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) { return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." }); }
    const user = userResult.rows[0];
    
    if (!user.email_verified) {
        return res.status(403).json({ success: false, message: "Kérjük, először erősítsd meg az e-mail címedet!" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) { return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó." }); }
    
    if (user.role === 'teacher') {
        const teacherResult = await pool.query('SELECT is_approved FROM teachers WHERE user_id = $1', [user.id]);
        if (teacherResult.rows.length === 0 || !teacherResult.rows[0].is_approved) { return res.status(403).json({ success: false, message: "A tanári fiókod még nem lett jóváhagyva." }); }
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.SECRET_KEY, { expiresIn: '1d' });
    res.status(200).json({ success: true, token: token, user: { id: user.id, username: user.username, email: user.email, role: user.role, referral_code: user.referral_code, createdAt: user.created_at } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Szerverhiba történt." });
  }
});

app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(200).json({ success: true, message: "Ha az e-mail cím regisztrálva van, kiküldtünk egy linket a jelszó visszaállításához." });
        }
        const user = userResult.rows[0];

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 óra

        await pool.query('UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3', [token, expires, user.id]);
        
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
        const mailOptions = {
            from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
            to: user.email,
            subject: 'Jelszó Visszaállítása',
            html: `<p>Jelszó visszaállítási kérelmet kaptunk. A linkre kattintva állíthatsz be új jelszót:</p><p><a href="${resetUrl}">Új jelszó beállítása</a></p><p>A link 1 órán át érvényes. Ha nem te kérted a visszaállítást, hagyd figyelmen kívül ezt az e-mailt.</p>`
        };

        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ success: true, message: "Ha az e-mail cím regisztrálva van, kiküldtünk egy linket a jelszó visszaállításához." });

    } catch (error) {
        console.error("Jelszó-visszaállítási hiba (kérelem):", error);
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});

app.post('/api/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const passwordOptions = { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 };
        if (!validator.isStrongPassword(password, passwordOptions)) {
            return res.status(400).json({ success: false, message: "A jelszó túl gyenge! A követelményeknek meg kell felelnie." });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()', [token]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "A jelszó-visszaállító link érvénytelen vagy lejárt." });
        }
        const user = userResult.rows[0];

        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2', [passwordHash, user.id]);

        res.status(200).json({ success: true, message: "Jelszó sikeresen módosítva! Most már bejelentkezhetsz az új jelszavaddal." });

    } catch (error) {
        console.error("Jelszó-visszaállítási hiba (beállítás):", error);
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});

app.get('/api/teacher/classes', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: "Hozzáférés megtagadva: csak tanárok kérhetik le az osztályaikat." });
        }
        const teacherId = req.user.userId;
        const query = `
            SELECT c.id, c.class_name, c.class_code, c.max_students, COUNT(cm.user_id) AS student_count
            FROM classes c
            LEFT JOIN classmemberships cm ON c.id = cm.class_id
            WHERE c.teacher_id = $1
            GROUP BY c.id
            ORDER BY c.created_at DESC;
        `;
        const { rows } = await pool.query(query, [teacherId]);
        res.status(200).json({ success: true, classes: rows });
    } catch (error) {
        console.error("Hiba az osztályok lekérdezésekor:", error);
        res.status(500).json({ success: false, message: "Szerverhiba történt az osztályok lekérdezésekor." });
    }
});

app.post('/api/classes/create', authenticateToken, async (req, res) => {
    const { className, maxStudents } = req.body;
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: "Hozzáférés megtagadva: csak tanárok hozhatnak létre osztályt." });
        }
        if (!className || !maxStudents) {
            return res.status(400).json({ success: false, message: "Osztálynév és maximális létszám megadása kötelező." });
        }
        const teacherId = req.user.userId;
        const classCode = `OSZTALY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        
        const query = `
            INSERT INTO classes (class_name, class_code, teacher_id, max_students, is_active, is_approved)
            VALUES ($1, $2, $3, $4, true, true)
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [className, classCode, teacherId, maxStudents]);
        res.status(201).json({ success: true, message: "Osztály sikeresen létrehozva!", class: rows[0] });

    } catch (error) {
        console.error("Hiba az osztály létrehozásakor:", error);
        res.status(500).json({ success: false, message: "Szerverhiba történt az osztály létrehozásakor." });
    }
});

app.get('/api/curriculums', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM curriculums WHERE is_published = true ORDER BY subject, grade, title;');
        const groupedData = { freeLessons: {}, freeTools: [], premiumCourses: [], premiumTools: [] };
        result.rows.forEach(item => {
            const subjectKey = item.subject || 'altalanos';
            switch (item.category) {
                case 'free_lesson': if (!groupedData.freeLessons[subjectKey]) groupedData.freeLessons[subjectKey] = []; groupedData.freeLessons[subjectKey].push(item); break;
                case 'free_tool': groupedData.freeTools.push(item); break;
                case 'premium_course': groupedData.premiumCourses.push(item); break;
                case 'premium_tool': groupedData.premiumTools.push(item); break;
                default: break;
            }
        });
        res.status(200).json({ success: true, data: groupedData });
    } catch (error) { res.status(500).json({ success: false, message: "Szerverhiba történt." }); }
});

app.get('/api/quiz/:slug', async (req, res) => {
    const { slug } = req.params;
    const correctedSlug = slug.replace(/_/g, '-');
    try {
        const curriculumResult = await pool.query('SELECT * FROM curriculums WHERE slug = $1', [correctedSlug]);
        if (curriculumResult.rows.length === 0) return res.status(404).json({ success: false, message: "A kért tananyag nem található." });
        const curriculum = curriculumResult.rows[0];
        const contentData = curriculum.content ? JSON.parse(curriculum.content) : {};
        const questionsResult = await pool.query('SELECT * FROM quizquestions WHERE curriculum_id = $1', [curriculum.id]);
        const responseData = { ...curriculum, ...contentData, questions: questionsResult.rows };
        delete responseData.content;
        res.status(200).json({ success: true, data: responseData });
    } catch (error) { res.status(500).json({ success: false, message: "Szerverhiba történt." }); }
});

app.get('/api/help', async (req, res) => {
    const { q } = req.params;
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
            if (!acc[category]) acc[category] = [];
            acc[category].push(article);
            return acc;
        }, {});
        res.status(200).json({ success: true, data: articlesByCategory });
    } catch (error) { res.status(500).json({ success: false, message: "Szerverhiba a súgó cikkek lekérdezésekor." }); }
});

app.get('/api/admin/clear-users/:secret', async (req, res) => {
    const { secret } = req.params;
    if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ message: "Hozzáférés megtagadva." });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE classmemberships, teachers, referrals, users RESTART IDENTITY CASCADE;');
        await client.query('COMMIT');
        res.status(200).json({ success: true, message: "Minden felhasználói adat sikeresen törölve." });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: "Hiba történt a törlés során." });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});