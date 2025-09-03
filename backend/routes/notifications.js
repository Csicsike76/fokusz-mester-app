const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, message, type, read, sent_at 
             FROM notifications 
             WHERE user_id = $1 
             ORDER BY sent_at DESC`,
            [req.user.userId]
        );
        res.status(200).json({ success: true, notifications: result.rows });
    } catch (error) {
        console.error("❌ Hiba az értesítések lekérdezésekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

router.post('/mark-read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
            [req.user.userId]
        );
        res.status(200).json({ success: true, message: 'Az értesítések olvasottá téve.' });
    } catch (error) {
        console.error("❌ Hiba az értesítések olvasottá tételekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

module.exports = router;