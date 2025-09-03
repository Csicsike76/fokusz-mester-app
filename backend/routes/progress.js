const express = require('express');
const pool = require('../config/db');
const transporter = require('../config/mailer');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.post('/quiz/submit-result', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { slug, score, totalQuestions, level } = req.body;

    if (!slug || typeof score === 'undefined' || !totalQuestions || !level) {
        return res.status(400).json({ success: false, message: 'Hiányos adatok a kvíz eredményének mentéséhez.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const curriculumResult = await client.query('SELECT id, title FROM curriculums WHERE slug = $1', [slug]);
        if (curriculumResult.rows.length === 0) {
            throw new Error('A megadott tananyag nem található az adatbázisban.');
        }
        const { id: curriculumId, title: curriculumTitle } = curriculumResult.rows[0];
        const scorePercentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
        
        const insertQueryOld = `
            INSERT INTO user_quiz_results (user_id, curriculum_id, completed_questions, total_questions, score_percentage, completed_at, level)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6)
            ON CONFLICT (user_id, curriculum_id, level) DO UPDATE SET
                completed_questions = EXCLUDED.completed_questions,
                total_questions = EXCLUDED.total_questions,
                score_percentage = EXCLUDED.score_percentage,
                completed_at = NOW();
        `;
        await client.query(insertQueryOld, [userId, curriculumId, score, totalQuestions, scorePercentage, level]);

        const insertQueryNew = `
            INSERT INTO student_progress (user_id, activity_type, quiz_slug, score_percentage, completed_at, metadata)
            VALUES ($1, 'quiz_completed', $2, $3, NOW(), $4);
        `;
        await client.query(insertQueryNew, [userId, slug, scorePercentage, JSON.stringify({ level, score, totalQuestions })]);

        await client.query('COMMIT');
        
        const userDetails = await pool.query('SELECT real_name, parental_email FROM users WHERE id = $1', [userId]);
        if (userDetails.rows.length > 0 && userDetails.rows[0].parental_email) {
            const { real_name, parental_email } = userDetails.rows[0];
            const mailOptions = {
                from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
                to: parental_email,
                subject: `Fókusz Mester - ${real_name} új kvízt töltött ki!`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>Kedves Szülő!</h2>
                        <p>Gyermeke, <strong>${real_name}</strong>, sikeresen befejezett egy gyakorló kvízt a Fókusz Mester platformon.</p>
                        <h3>Részletek:</h3>
                        <ul>
                            <li><strong>Tananyag:</strong> ${curriculumTitle}</li>
                            <li><strong>Elért eredmény:</strong> ${score} / ${totalQuestions} pont (${scorePercentage.toFixed(0)}%)</li>
                            <li><strong>Nehézségi szint:</strong> ${level}</li>
                            <li><strong>Dátum:</strong> ${new Date().toLocaleString('hu-HU')}</li>
                        </ul>
                        <p>A diákok haladását Ön is nyomon követheti a tanári felületen, amennyiben regisztrált tanárként is használja a rendszert.</p>
                        <p>Üdvözlettel,<br>A Fókusz Mester csapata</p>
                    </div>
                `,
            };
            transporter.sendMail(mailOptions).catch(err => console.error("Szülői értesítő e-mail küldési hiba:", err));
        }

        res.status(200).json({ success: true, message: 'Eredmény sikeresen elmentve.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Hiba a kvíz eredményének mentésekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt az eredmény mentésekor.' });
    } finally {
        client.release();
    }
});

router.post('/lesson/viewed', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { slug } = req.body;
    if (!slug) {
        return res.status(400).json({ success: false, message: 'Hiányzó tananyag azonosító.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const curriculumResult = await client.query('SELECT title FROM curriculums WHERE slug = $1', [slug]);
        if (curriculumResult.rows.length === 0) {
            throw new Error('A megadott tananyag nem található az adatbázisban.');
        }
        const { title: curriculumTitle } = curriculumResult.rows[0];

        await client.query(
            `INSERT INTO student_progress (user_id, activity_type, lesson_slug, started_at, completed_at)
             VALUES ($1, 'lesson_viewed', $2, NOW(), NOW())`,
            [userId, slug]
        );

        await client.query('COMMIT');

        const userDetails = await pool.query('SELECT real_name, parental_email FROM users WHERE id = $1', [userId]);
        if (userDetails.rows.length > 0 && userDetails.rows[0].parental_email) {
            const { real_name, parental_email } = userDetails.rows[0];
            const mailOptions = {
                from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
                to: parental_email,
                subject: `Fókusz Mester - ${real_name} új leckét tekintett meg!`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>Kedves Szülő!</h2>
                        <p>Gyermeke, <strong>${real_name}</strong>, megtekintett egy új tananyagot a Fókusz Mester platformon.</p>
                        <h3>Részletek:</h3>
                        <ul>
                            <li><strong>Tananyag:</strong> ${curriculumTitle}</li>
                            <li><strong>Dátum:</strong> ${new Date().toLocaleString('hu-HU')}</li>
                        </ul>
                        <p>Üdvözlettel,<br>A Fókusz Mester csapata</p>
                    </div>
                `,
            };
            transporter.sendMail(mailOptions).catch(err => console.error("Szülői értesítő e-mail küldési hiba:", err));
        }

        res.status(200).json({ success: true, message: 'Lecke megtekintése rögzítve.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Hiba a lecke megtekintésének rögzítésekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    } finally {
        client.release();
    }
});

module.exports = router;