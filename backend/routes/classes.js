// backend/routes/classes.js
const express = require('express');

/**
 * Classes router
 * - osztályhoz tartozó diákok listája
 * - alap statisztikák váz
 *
 * Feltételezett táblák:
 *  - classmemberships (user_id, class_id)
 *  - users (id, username, email, role)
 */
module.exports = function classesRouter(pool, authenticateToken) {
  const router = express.Router();

  // Osztály diákjai (auth: teacher – csak a saját osztályaira)
  router.get('/:classId/students', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Csak tanár vagy admin kérheti le.' });
      }
      const classId = parseInt(req.params.classId, 10);
      if (!Number.isFinite(classId)) {
        return res.status(400).json({ success: false, message: 'Érvénytelen classId.' });
      }

      // jogosultság-ellenőrzés
      if (req.user.role === 'teacher') {
        const c1 = await pool.query('SELECT id, teacher_id FROM classes WHERE id = $1', [classId]);
        if (c1.rows.length === 0) return res.status(404).json({ success: false, message: 'Osztály nem található.' });
        if (c1.rows[0].teacher_id !== req.user.userId) {
          return res.status(403).json({ success: false, message: 'Nem a te osztályod.' });
        }
      }

      const q = `
        SELECT u.id, u.username, u.email
        FROM classmemberships cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.class_id = $1
        ORDER BY u.username;
      `;
      const { rows } = await pool.query(q, [classId]);
      return res.json({ success: true, students: rows });
    } catch (err) {
      console.error('GET /api/classes/:classId/students error:', err);
      return res.status(500).json({ success: false, message: 'Szerverhiba.' });
    }
  });

  return router;
};
