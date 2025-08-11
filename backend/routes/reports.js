// backend/routes/reports.js
const express = require('express');

/**
 * Reports router
 * - heti jelentés lekérdezése (diáknak, szülőnek)
 *
 * Feltételezett táblák:
 *  - weekly_reports (id, user_id, week_start, week_end, minutes_spent, strengths jsonb, weaknesses jsonb, created_at)
 *  - parent_students (parent_user_id, student_user_id)
 */
module.exports = function reportsRouter(pool, authenticateToken) {
  const router = express.Router();

  // Saját heti jelentés (auth: student) – legutóbbi
  router.get('/me/weekly', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ success: false, message: 'Csak diákként kérhető le.' });
      }
      const q = `
        SELECT *
        FROM weekly_reports
        WHERE user_id = $1
        ORDER BY week_end DESC
        LIMIT 1;
      `;
      const { rows } = await pool.query(q, [req.user.userId]);
      return res.json({ success: true, report: rows[0] || null });
    } catch (err) {
      console.error('GET /api/reports/me/weekly error:', err);
      return res.status(500).json({ success: false, message: 'Szerverhiba.' });
    }
  });

  // Szülő – valamelyik gyerek legutóbbi heti jelentése (auth: parent)
  router.get('/child/:childId/weekly', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'parent' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Csak szülő vagy admin kérheti le.' });
      }
      const childId = parseInt(req.params.childId, 10);
      if (!Number.isFinite(childId)) {
        return res.status(400).json({ success: false, message: 'Érvénytelen childId.' });
      }

      // jogosultság: a gyerek hozzá van-e kötve a szülőhöz?
      if (req.user.role === 'parent') {
        const rel = await pool.query(
          'SELECT 1 FROM parent_students WHERE parent_user_id = $1 AND student_user_id = $2',
          [req.user.userId, childId]
        );
        if (rel.rows.length === 0) {
          return res.status(403).json({ success: false, message: 'Nincs jogosultság ehhez a gyermekhez.' });
        }
      }

      const q = `
        SELECT *
        FROM weekly_reports
        WHERE user_id = $1
        ORDER BY week_end DESC
        LIMIT 1;
      `;
      const { rows } = await pool.query(q, [childId]);
      return res.json({ success: true, report: rows[0] || null });
    } catch (err) {
      console.error('GET /api/reports/child/:childId/weekly error:', err);
      return res.status(500).json({ success: false, message: 'Szerverhiba.' });
    }
  });

  return router;
};
