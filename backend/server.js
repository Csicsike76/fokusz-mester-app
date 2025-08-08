const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path'); // EZ AZ EGYIK HIÁNYZÓ IMPORT
const fs = require('fs/promises'); // EZ A MÁSIK HIÁNYZÓ IMPORT
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

app.use(express.static(path.join(__dirname, '../templates')));  // Módosított elérési út

// Az index.html kiszolgálása
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'Matematika Tanár 2030-ra.html')); // Az index fájl helyes neve
});

// Például a /about oldal kiszolgálása
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'about.html'));  // Helyes fájl elérési út
});

// Például a /contact oldal kiszolgálása
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'contact.html'));  // Helyes fájl elérési út
});

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
  const { role, username, email, password, vipCode, classCode } = req.body;
  if (!username || !email || !password || !role) { return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." }); }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userExists = await client.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) { throw new Error("Ez az e-mail cím már regisztrálva van."); }
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
    const newUserQuery = `INSERT INTO Users (username, email, password_hash, role, email_verification_token, email_verification_expires) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`;
    const newUserResult = await client.query(newUserQuery, [username, email, passwordHash, role, verificationToken, verificationExpires]);
    const newUserId = newUserResult.rows[0].id;
    if (role === 'teacher') {
      await client.query(`INSERT INTO Teachers (user_id, vip_code, is_approved) VALUES ($1, $2, false);`, [newUserId, vipCode]);
      const approvalUrl = `${process.env.FRONTEND_URL}/approve-teacher/${newUserId}`;
      const adminMailOptions = { from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`, to: process.env.MAIL_DEFAULT_SENDER, subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!', html: `<p>Új tanár regisztrált: ${username} (${email}). Kattints a linkre a jóváhagyáshoz: <a href="${approvalUrl}">Jóváhagyás</a></p>`};
      await transporter.sendMail(adminMailOptions);
    }
    if (role === 'student' && classId) {
        await client.query(`INSERT INTO ClassMemberships (user_id, class_id) VALUES ($1, $2);`, [newUserId, classId]);
    }
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const userMailOptions = { from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`, to: email, subject: 'Erősítsd meg az e-mail címedet a Fókusz Mester oldalon!', html: `<p>Kattints a linkre a regisztrációd véglegesítéséhez: <a href="${verificationUrl}">Megerősítés</a></p>`};
    await transporter.sendMail(userMailOptions);
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: `Sikeres regisztráció! Megerősítő e-mailt küldtünk.` });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: error.message || "Szerverhiba történt." });
  } finally {
    if (client) client.release();
  }
});

app.post('/api/register', async (req, res) => {
  const { role, username, email, password, vipCode, classCode } = req.body;
  if (!username || !email || !password || !role) { return res.status(400).json({ success: false, message: "Minden kötelező mezőt ki kell tölteni." }); }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userExists = await client.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) { throw new Error("Ez az e-mail cím már regisztrálva van."); }
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
    const newUserQuery = `INSERT INTO Users (username, email, password_hash, role, email_verification_token, email_verification_expires) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`;
    const newUserResult = await client.query(newUserQuery, [username, email, passwordHash, role, verificationToken, verificationExpires]);
    const newUserId = newUserResult.rows[0].id;
    if (role === 'teacher') {
      await client.query(`INSERT INTO Teachers (user_id, vip_code, is_approved) VALUES ($1, $2, false);`, [newUserId, vipCode]);
      const approvalUrl = `${process.env.FRONTEND_URL}/approve-teacher/${newUserId}`;
      const adminMailOptions = { from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`, to: process.env.MAIL_DEFAULT_SENDER, subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!', html: `<p>Új tanár regisztrált: ${username} (${email}). Kattints a linkre a jóváhagyáshoz: <a href="${approvalUrl}">Jóváhagyás</a></p>`};
      await transporter.sendMail(adminMailOptions);
    }
    if (role === 'student' && classId) {
        await client.query(`INSERT INTO ClassMemberships (user_id, class_id) VALUES ($1, $2);`, [newUserId, classId]);
    }
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const userMailOptions = { from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`, to: email, subject: 'Erősítsd meg az e-mail címedet a Fókusz Mester oldalon!', html: `<p>Kattints a linkre a regisztrációd véglegesítéséhez: <a href="${verificationUrl}">Megerősítés</a></p>`};
    await transporter.sendMail(userMailOptions);
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: `Sikeres regisztráció! Megerősítő e-mailt küldtünk.` });
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
    res.status(200).json({ success: true, token: token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Szerverhiba történt." });
  }
});

app.get('/api/approve-teacher/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`UPDATE Teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id;`, [userId]);
    if (result.rows.length === 0) { return res.status(404).json({ success: false, message: 'A tanári felhasználó nem található.' }); }
    res.status(200).json({ success: true, message: 'A tanári fiók sikeresen aktiválva lett.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Szerverhiba történt a jóváhagyás során.' });
  }
});

app.post('/api/classes/create', authenticateToken, async (req, res) => {
    const { userId, role } = req.user;
    const { className, maxStudents } = req.body;
    if (role !== 'teacher') { return res.status(403).json({ success: false, message: "Nincs jogosultságod." }); }
    if (!className) { return res.status(400).json({ success: false, message: "Az osztály nevének megadása kötelező." }); }
    if (!maxStudents || maxStudents < 5 || maxStudents > 30) { return res.status(400).json({ success: false, message: "A létszám 5 és 30 között kell, hogy legyen." }); }
    try {
        const classCode = `FKSZ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; 
        const newClassResult = await pool.query(`INSERT INTO Classes (class_name, class_code, teacher_id, max_students) VALUES ($1, $2, $3, $4) RETURNING *;`, [className, classCode, userId, maxStudents]);
        res.status(201).json({ success: true, message: "Osztály sikeresen létrehozva.", class: newClassResult.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});

app.get('/api/teacher/classes', authenticateToken, async (req, res) => {
    const { userId, role } = req.user;
    if (role !== 'teacher') { return res.status(403).json({ success: false, message: "Nincs jogosultságod." }); }
    try {
        const classesQuery = `SELECT c.*, COUNT(cm.user_id)::int AS student_count FROM Classes c LEFT JOIN ClassMemberships cm ON c.id = cm.class_id WHERE c.teacher_id = $1 GROUP BY c.id ORDER BY c.created_at DESC;`;
        const classesResult = await pool.query(classesQuery, [userId]);
        res.status(200).json({ success: true, classes: classesResult.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});

app.get('/api/curriculums', async (req, res) => {
    const { subject, grade, q } = req.query; 
    let queryText = 'SELECT * FROM Curriculums WHERE is_published = true';
    const queryParams = [];
    
    let paramIndex = 1;
    if (subject) {
        queryParams.push(subject);
        queryText += ` AND subject = $${paramIndex++}`;
    }
    if (grade) {
        queryParams.push(grade);
        queryText += ` AND grade = $${paramIndex++}`;
    }
    if (q) {
        queryParams.push(`%${q}%`);
        queryText += ` AND title ILIKE $${paramIndex++}`;
    }

    queryText += ' ORDER BY subject, grade, title;';

    try {
        const result = await pool.query(queryText, queryParams);
        
        // Ha szűrés van érvényben, egyszerű listát adunk vissza
        if (subject || grade || q) {
            return res.status(200).json({ success: true, data: result.rows });
        }
        
        // Ha nincs szűrés (főoldali lekérdezés), akkor csoportosítunk
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
                    if (!groupedData.freeLessons[subjectKey]) {
                        groupedData.freeLessons[subjectKey] = [];
                    }
                    groupedData.freeLessons[subjectKey].push(item);
                    break;
                case 'free_tool':
                    groupedData.freeTools.push(item);
                    break;
                case 'premium_course':
                    groupedData.premiumCourses.push(item);
                    break;
                case 'premium_tool':
                    groupedData.premiumTools.push(item);
                    break;
                default:
                    // Ismeretlen kategóriájú elemeket egyelőre figyelmen kívül hagyunk
                    break;
            }
        });

        res.status(200).json({ success: true, data: groupedData });

    } catch (error) {
        console.error("Hiba a tananyagok lekérdezése során:", error);
        res.status(500).json({ success: false, message: "Szerverhiba történt a tananyagok lekérdezésekor." });
    }
});

app.get('/api/tool/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        // JAVÍTÁS ITT: Most már a saját 'data' mappájában keres
        const filePath = path.join(__dirname, 'data', `${slug}.json`);
        
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const toolData = JSON.parse(fileContent);
        res.status(200).json({ success: true, data: toolData });
    } catch (error) {
        console.error(`Hiba a(z) ${slug}.json fájl beolvasása során:`, error);
        res.status(404).json({ success: false, message: "Az eszköz adatai nem találhatóak." });
    }
});

app.get('/api/admin/clear-users/:secret', async (req, res) => {
    const { secret } = req.params;
    if (secret !== process.env.ADMIN_SECRET) { return res.status(403).json({ message: "Hozzáférés megtagadva." }); }
    try {
        const dropQuery = `DROP TABLE IF EXISTS ClassMemberships; DROP TABLE IF EXISTS Teachers; DROP TABLE IF EXISTS Classes; DROP TABLE IF EXISTS Users;`;
        const createQuery = `CREATE TABLE Users ( id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL, email_verified BOOLEAN DEFAULT false, email_verification_token VARCHAR(255), email_verification_expires TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE Teachers ( user_id INTEGER PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE, vip_code VARCHAR(50) UNIQUE, is_approved BOOLEAN DEFAULT false ); CREATE TABLE Classes ( id SERIAL PRIMARY KEY, class_name VARCHAR(255) NOT NULL, class_code VARCHAR(50) UNIQUE NOT NULL, teacher_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE, max_students INTEGER NOT NULL DEFAULT 35, is_active BOOLEAN DEFAULT true, is_approved BOOLEAN DEFAULT true, discount_status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE ClassMemberships ( user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE, class_id INTEGER NOT NULL REFERENCES Classes(id) ON DELETE CASCADE, PRIMARY KEY (user_id, class_id) );`;
        await pool.query(dropQuery);
        await pool.query(createQuery);
        res.status(200).json({ success: true, message: "Minden felhasználói adat sikeresen törölve." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Hiba a törlés során." });
    }
});

app.get('/api/quiz/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const curriculumQuery = 'SELECT * FROM Curriculums WHERE slug = $1';
        const curriculumResult = await pool.query(curriculumQuery, [slug]);

        if (curriculumResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "A kért tananyag nem található." });
        }
        const curriculum = curriculumResult.rows[0];

        const questionsQuery = 'SELECT * FROM QuizQuestions WHERE curriculum_id = $1';
        const questionsResult = await pool.query(questionsQuery, [curriculum.id]);

        res.status(200).json({
            success: true,
            quiz: {
                title: curriculum.title,
                questions: questionsResult.rows
            }
        });

    } catch (error) {
        console.error(`Hiba a(z) ${slug} kvíz lekérdezése során:`, error);
        res.status(500).json({ success: false, message: "Szerverhiba történt." });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});
