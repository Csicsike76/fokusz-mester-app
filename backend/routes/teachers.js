// backend/routes/teachers.js
const express = require('express');

/**
 * Teachers router
 * - tanári osztályok listázása (alias a meglévő teacher/classes-hez)
 * - házi feladat / tartalom kiosztás (alap váz)
 *
 * Feltételezett táblák:
 *  - classes (id, class_name, class_code, teacher_id, max_students, is_active, created_at, is_approved)
 *  - class_homeworks (id, class_id, slug, due_at, created_at)
 */
module.exports = function teachersRouter(pool, authenticateToken) {
  const router = express.Router();

  // Tanár saját osztályai (auth: teacher)
  router.get('/classes', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Csak tanár kérheti le.' });
      }
      const teacherId = req.user.userId;
      const q = `
        SELECT c.id, c.class_name, c.class_code, c.max_students, c.is_active,
               COUNT(cm.user_id)::int AS student_count
        FROM classes c
        LEFT JOIN classmemberships cm ON cm.class_id = c.id
        WHERE c.teacher_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC;
      `;
      const { rows } = await pool.query(q, [teacherId]);
      return res.json({ success: true, classes: rows });
    } catch (err) {
      console.error('GET /api/teachers/classes error:', err);
      return res.status(500).json({ success: false, message: 'Szerverhiba.' });
    }
  });

  // Házi feladat / tartalom kiosztása egy osztálynak
  router.post('/classes/:classId/assign-homework', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Csak tanár hívhatja.' });
      }
      const classId = parseInt(req.params.classId, 10);
      const { slug, due_at } = req.body;

      if (!Number.isFinite(classId) || !slug) {
        return res.status(400).json({ success: false, message: 'classId és slug kötelező.' });
      }

      // osztály a tanárhoz tartozik-e?
      const c1 = await pool.query('SELECT id, teacher_id FROM classes WHERE id = $1', [classId]);
      if (c1.rows.length === 0) return res.status(404).json({ success: false, message: 'Osztály nem található.' });
      if (c1.rows[0].teacher_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Nem a te osztályod.' });
      }

      await pool.query(
        `INSERT INTO class_homeworks (class_id, slug, due_at, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [classId, slug, due_at || null]
      );

      return res.json({ success: true, message: 'Kiosztva.' });
    } catch (err) {
      console.error('POST /api/teachers/classes/:classId/assign-homework error:', err);
      return res.status(500).json({ success: false, message: 'Szerverhiba.' });
    }
  });

  return router;
};
