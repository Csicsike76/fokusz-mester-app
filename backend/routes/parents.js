// backend/routes/parents.js
const express = require('express');

/**
 * Parents router
 * Feltételezi, hogy:
 *  - users táblában van 'role' mező (student / parent / teacher / …)
 *  - parent_students (parent_user_id, student_user_id) kapcsolótábla létezik
 */
module.exports = function parentsRouter(pool, authenticateToken) {
  const router = express.Router();

  // Szülő saját gyerekei (auth: parent)
  router.get('/children', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'parent' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Csak szülő vagy admin kérheti le.' });
      }
      const parentId = req.user.userId;

      const q = `
        SELECT u.id, u.username, u.email, u.created_at
        FROM parent_students ps
        JOIN users u ON u.id = ps.student_user_id
        WHERE ps.parent_user_id = $1
        ORDER BY u.username;
      `;
      const { rows } = await pool.query(q, [parentId]);
      return res.json({ success: true, children: rows });
    } catch (err) {
      console.error('GET /api/parents/children error:', err);
      return res.status(500).json({ success: false, message: 'Szerverhiba.' });
    }
  });

  // Gyermek hozzárendelése (auth: parent vagy admin)
  router.post('/link-child', authenticateToken, async (req, res) => {
    try {
      const { child_user_id } = req.body;
      if (!child_user_id) {
        return res.status(400).json({ success: false, message: 'child_user_id kötelező.' });
      }

      if (req.user.role !== 'parent' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Csak szülő vagy admin hívhatja.' });
      }

      // ellenőrizzük, hogy a child létezik és student
      const c1 = await pool.query('SELECT id, role FROM users WHERE id = $1', [child_user_id]);
      if (c1.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'A megadott diák nem található.' });
      }
      if (c1.rows[0].role !== 'student') {
        return res.status(400).json({ success: false, message: 'Csak diák kapcsolható szülőhöz.' });
      }

      const parentId = req.user.role === 'admin' ? (req.body.parent_user_id || req.user.userId) : req.user.userId;

      await pool.query(
        `INSERT INTO parent_students (parent_user_id, student_user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [parentId, child_user_id]
      );

      return res.json({ success: true, message: 'Kapcsolat létrehozva (ha nem létezett).' });
    } catch (err) {
      console.error('POST /api/parents/link-child error:', err);
      return res.status(500).json({ success: false, message: 'Szerverhiba.' });
    }
  });

  // Kapcsolat törlése (auth: parent vagy admin)
  router.delete('/link-child/:childId', authenticateToken, async (req, res) => {
    try {
      const childId = parseInt(req.params.childId, 10);
      if (!Number.isFinite(childId)) {
        return res.status(400).json({ success: false, message: 'Érvénytelen childId.' });
      }

      if (req.user.role !== 'parent' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Csak szülő vagy admin hívhatja.' });
      }

      const parentId = req.user.role === 'admin' ? (req.body?.parent_user_id || req.user.userId) : req.user.userId;

      const del = await pool.query(
        'DELETE FROM parent_students WHERE parent_user_id = $1 AND student_user_id = $2',
        [parentId, childId]
      );

      return res.json({ success: true, removed: del.rowCount });
    } catch (err) {
      console.error('DELETE /api/parents/link-child/:childId error:', err);
      return res.status(500).json({ success: false, message: 'Szerverhiba.' });
    }
  });

  return router;
};
