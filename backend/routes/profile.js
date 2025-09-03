// --- START OF FILE backend/routes/profile.js ---

const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { getFullUserProfile } = require('../utils/user');

const router = express.Router();

router.get('/recommendations', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const threshold = 80;

    try {
        const query = `
            SELECT DISTINCT ON (sp.quiz_slug)
                sp.quiz_slug,
                sp.score_percentage,
                c.title
            FROM student_progress sp
            JOIN curriculums c ON sp.quiz_slug = c.slug
            WHERE sp.user_id = $1
              AND sp.activity_type = 'quiz_completed'
              AND sp.score_percentage < $2
            ORDER BY sp.quiz_slug, sp.completed_at DESC;
        `;
        const { rows } = await pool.query(query, [userId, threshold]);

        res.status(200).json({ success: true, recommendations: rows });
    } catch (error) {
        console.error("Ajánlások lekérdezési hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt az ajánlások lekérdezésekor.' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userProfile = await getFullUserProfile(req.user.userId);
        if (!userProfile) {
            return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
        }
        res.status(200).json({ success: true, user: userProfile });
    } catch (error) {
        console.error("Profil lekérdezési hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a profil adatok lekérdezésekor.' });
    }
});

router.put('/', authenticateToken, async (req, res) => {
    const { username } = req.body;
    const userId = req.user.userId;

    if (!username || username.trim() === '') {
        return res.status(400).json({ success: false, message: 'A felhasználónév nem lehet üres.' });
    }
    try {
        // JAVÍTÁS: Külön paramétereket ($1, $2) használunk az adatbázis-típusok inkonzisztenciája miatt.
        await pool.query(
            'UPDATE users SET username = $1, real_name = $2 WHERE id = $3', 
            [username.trim(), username.trim(), userId]
        );
        
        const updatedUserProfile = await getFullUserProfile(userId);
        if (!updatedUserProfile) {
             return res.status(404).json({ success: false, message: 'A frissített felhasználó nem található.' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Felhasználónév sikeresen frissítve.', 
            user: updatedUserProfile 
        });

    } catch (error) {
        console.error("Profil frissítési hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

router.post('/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'A régi és új jelszó megadása is kötelező.' });
    }

    try {
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
        }
        
        const user = userResult.rows[0];
        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: 'A régi jelszó helytelen.' });
        }

        const passwordOptions = { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 };
        if (!validator.isStrongPassword(newPassword, passwordOptions)) {
            return res.status(400).json({ success: false, message: 'Az új jelszó túl gyenge.' });
        }
        
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user.userId]);
        
        res.status(200).json({ success: true, message: 'Jelszó sikeresen módosítva.' });

    } catch (error) {
        console.error("Jelszócsere hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a jelszócsere során.' });
    }
});

router.get('/stats', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const completedLessonsResult = await pool.query(
            'SELECT COUNT(DISTINCT lesson_slug) FROM student_progress WHERE user_id = $1 AND activity_type = \'lesson_viewed\'',
            [userId]
        );
        const completed_lessons_count = parseInt(completedLessonsResult.rows[0].count, 10);

        const bestQuizResultsResult = await pool.query(
            `SELECT c.title, uqr.score_percentage
             FROM user_quiz_results uqr
             JOIN curriculums c ON uqr.curriculum_id = c.id
             WHERE uqr.user_id = $1
             ORDER BY uqr.score_percentage DESC
             LIMIT 3`,
            [userId]
        );
        const best_quiz_results = bestQuizResultsResult.rows;

        const mostPracticedSubjectsResult = await pool.query(
            `SELECT c.subject, COUNT(c.subject) as lesson_count
             FROM student_progress sp
             JOIN curriculums c ON sp.quiz_slug = c.slug
             WHERE sp.user_id = $1 AND c.subject IS NOT NULL
             GROUP BY c.subject
             ORDER BY lesson_count DESC
             LIMIT 3`,
            [userId]
        );
        const most_practiced_subjects = mostPracticedSubjectsResult.rows;

        res.status(200).json({
            success: true,
            stats: {
                completed_lessons_count,
                best_quiz_results,
                most_practiced_subjects,
            }
        });

    } catch (error) {
        console.error("Statisztika lekérdezési hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a statisztikák lekérdezésekor.' });
    }
});

router.delete('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        const deleteResult = await client.query('DELETE FROM users WHERE id = $1', [userId]);

        if (deleteResult.rowCount === 0) {
            throw new Error('A felhasználó nem található a törléshez.');
        }

        await client.query('COMMIT');
        
        res.status(200).json({ success: true, message: 'A fiók és a hozzá kapcsolódó összes adat sikeresen törölve.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Fióktörlési hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a fiók törlése során.' });
    } finally {
        client.release();
    }
});

module.exports = router;
// --- END OF FILE backend/routes/profile.js ---