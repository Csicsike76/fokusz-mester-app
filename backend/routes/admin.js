const express = require('express');
const pool = require('../config/db');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/approve-teacher-by-link/:userId', async (req, res) => {
    const { userId } = req.params;
    const { secret } = req.query;

    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(403).send('Hozzáférés megtagadva: érvénytelen biztonsági kulcs.');
    }

    try {
        const result = await pool.query(
            'UPDATE teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id',
            [userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).send('A tanár nem található.');
        }
        
        res.send(`
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <title>Jóváhagyás Sikeres</title>
                <meta charset="UTF-8">
                <style>body { font-family: sans-serif; text-align: center; padding-top: 50px; }</style>
            </head>
            <body>
                <p>A tanári fiók sikeresen jóváhagyva.</p>
                <p>Ez az ablak hamarosan bezáródik.</p>
                <script>
                    setTimeout(() => window.close(), 3000);
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Tanár jóváhagyási hiba:', error);
        res.status(500).send('Szerverhiba történt a jóváhagyás során.');
    }
});

router.post('/approve-teacher/:userId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'UPDATE teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id',
            [userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'A tanár nem található.' });
        }
        return res.status(200).json({ success: true, message: 'A tanári fiók sikeresen jóváhagyva.'});
    } catch (error) {
        console.error('Tanár jóváhagyási hiba (admin):', error);
        return res.status(500).json({ success: false, message: 'Szerverhiba történt a jóváhagyás során.'});
    }
});

router.get('/users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.username, u.email, u.role, u.created_at, t.is_approved
            FROM users u
            LEFT JOIN teachers t ON u.id = t.user_id
            ORDER BY u.created_at DESC;
        `;
        const { rows } = await pool.query(query);
        res.status(200).json({ success: true, users: rows });
    } catch (error) {
        console.error("Hiba a felhasználók lekérdezésekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a felhasználók lekérdezésekor.' });
    }
});

router.get('/messages', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email, subject, message, is_archived, created_at FROM contact_messages ORDER BY created_at DESC'
        );
        res.status(200).json({ success: true, messages: rows });
    } catch (error) {
        console.error("Hiba a kapcsolatfelvételi üzenetek lekérdezésekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt az üzenetek lekérdezésekor.'});
    }
});

router.get('/clear-users/:secret', async (req, res) => {
  const { secret } = req.params;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ message: 'Hozzáférés megtagadva.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Minden felhasználói adat sikeresen törölve.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Adatbázis törlési hiba:", error);
    res.status(500).json({ success: false, message: 'Hiba történt a törlés során.' });
  } finally {
    client.release();
  }
});

module.exports = router;