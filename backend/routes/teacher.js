const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const stripe = require('../config/stripe');
const { authenticateToken, authorizeTeacher } = require('../middleware/auth');
const router = express.Router();

router.get('/classes', authenticateToken, authorizeTeacher, async (req, res) => {
  try {
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
    console.error('Hiba az osztályok lekérdezésekor:', error);
    res
      .status(500)
      .json({ success: false, message: 'Szerverhiba történt az osztályok lekérdezésekor.' });
  }
});

router.post('/create-class-checkout-session', authenticateToken, authorizeTeacher, async (req, res) => {
    const { className, maxStudents } = req.body;
    const teacherId = req.user.userId;

    if (!className || !maxStudents || maxStudents < 5 || maxStudents > 30) {
        return res.status(400).json({ success: false, message: 'Érvénytelen osztályadatok.' });
    }

    const priceId = process.env.STRIPE_PRICE_ID_TEACHER_CLASS;
    if (!priceId) {
        return res.status(500).json({ success: false, message: 'A tanári csomag árazása nincs beállítva a szerveren.' });
    }

    try {
        const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [teacherId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'A tanár felhasználó nem található.' });
        }
        const teacherEmail = userResult.rows[0].email;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: teacherEmail,
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/dashboard/teacher?class_creation_success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard/teacher?class_creation_canceled=true`,
            metadata: {
                type: 'teacher_class_payment',
                userId: teacherId,
                className: className,
                maxStudents: maxStudents,
            },
        });

        res.json({ success: true, url: session.url });

    } catch (error) {
        console.error('❌ Hiba a tanári osztály Checkout session létrehozásakor:', error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a fizetési folyamat indításakor.' });
    }
});

router.post('/classes/create', authenticateToken, authorizeTeacher, async (req, res) => {
  const { className, maxStudents } = req.body;
  
  if (!className || !maxStudents) {
    return res
      .status(400)
      .json({ success: false, message: 'Osztálynév és maximális létszám megadása kötelező.' });
  }
  try {
    const teacherId = req.user.userId;
    const classCode = `OSZTALY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const query = `
      INSERT INTO classes (class_name, class_code, teacher_id, max_students, is_active, is_approved)
      VALUES ($1,$2,$3,$4,true,true)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [className, classCode, teacherId, maxStudents]);
    res.status(201).json({ success: true, message: 'Osztály sikeresen létrehozva!', class: rows[0] });
  } catch (error) {
    console.error('Hiba az osztály létrehozásakor:', error);
    res
      .status(500)
      .json({ success: false, message: 'Szerverhiba történt az osztály létrehozásakor.' });
  }
});

router.get('/class/:classId/students', authenticateToken, authorizeTeacher, async (req, res) => {
    const { classId } = req.params;
    const teacherId = req.user.userId;
    try {
        const classCheck = await pool.query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2', [classId, teacherId]);
        if (classCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Nincs jogosultsága ehhez az osztályhoz." });
        }
        
        const query = `
            SELECT u.id, u.real_name, u.email
            FROM users u
            JOIN classmemberships cm ON u.id = cm.user_id
            WHERE cm.class_id = $1
            ORDER BY u.real_name;
        `;
        const { rows } = await pool.query(query, [classId]);
        res.status(200).json({ success: true, students: rows });
    } catch (error) {
        console.error(`❌ Hiba a(z) ${classId} osztály diákjainak lekérdezésekor:`, error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

router.get('/student/:studentId/progress', authenticateToken, authorizeTeacher, async (req, res) => {
    const { studentId } = req.params;
    const teacherId = req.user.userId;
    try {
        const accessCheck = await pool.query(`
            SELECT 1 FROM classmemberships cm
            JOIN classes c ON cm.class_id = c.id
            WHERE cm.user_id = $1 AND c.teacher_id = $2
        `, [studentId, teacherId]);
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Nincs jogosultsága ennek a diáknak az adataihoz." });
        }

        const query = `
            SELECT sp.activity_type, sp.lesson_slug, sp.quiz_slug, sp.score_percentage, sp.completed_at, sp.metadata,
                   c.title AS curriculum_title
            FROM student_progress sp
            LEFT JOIN curriculums c ON sp.quiz_slug = c.slug OR sp.lesson_slug = c.slug
            WHERE sp.user_id = $1
            ORDER BY sp.completed_at DESC, sp.started_at DESC;
        `;
        const { rows } = await pool.query(query, [studentId]);
        res.status(200).json({ success: true, progress: rows });
    } catch (error) {
        console.error(`❌ Hiba a(z) ${studentId} diák haladásának lekérdezésekor:`, error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

module.exports = router;