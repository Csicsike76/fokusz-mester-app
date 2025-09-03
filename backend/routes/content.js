const express = require('express');
const path = require('path');
const fsSync = require('fs');
const fsp = require('fs/promises');
const pool = require('../config/db');
const { authenticateTokenOptional } = require('../middleware/auth');
const { getFullUserProfile } = require('../utils/user');

const router = express.Router();

router.get('/help', async (req, res) => {
  const q = (req.query.q || '').toString().trim().toLowerCase();

  try {
    let queryText = 'SELECT * FROM helparticles';
    const queryParams = [];

    if (q && q.length >= 2) {
      queryParams.push(`%${q}%`);
      queryText += `
        WHERE LOWER(COALESCE(title,'')) ILIKE $1
           OR LOWER(COALESCE(content,'')) ILIKE $1
           OR LOWER(COALESCE(category,'')) ILIKE $1
           OR LOWER(COALESCE(tags,'')) ILIKE $1
      `;
    }
    queryText += ' ORDER BY category, title;';
    const result = await pool.query(queryText, queryParams);
    const articlesByCategory = result.rows.reduce((acc, article) => {
      const category = article.category || 'Egyéb';
      if (!acc[category]) acc[category] = [];

      acc[category].push({
        question: article.title,
        answer: article.content,
        category: article.category,
        keywords: article.tags,
      });
      return acc;
    }, {});
    res.status(200).json({ success: true, data: articlesByCategory });
  } catch (error) {
    console.error('/api/help hiba:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba a súgó cikkek lekérdezésekor.' });
  }
});

router.get('/curriculums', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT title, slug, subject, grade, category, description
      FROM curriculums
      WHERE is_published = true
      ORDER BY
        category,
        COALESCE(subject, 'zzz'),
        COALESCE(grade, 999),
        title
    `);
    const groupedData = {
      freeLessons: {},
      freeTools: [],
      premiumCourses: [],
      premiumTools: []
    };
    for (const row of rows) {
      const item = {
        title: row.title,
        slug: row.slug,
        subject: row.subject || null,
        grade: row.grade,
        description: row.description || null,
        category: row.category
      };
      switch (row.category) {
        case 'free_lesson': {
          const key = row.subject || 'altalanos';
          if (!groupedData.freeLessons[key]) groupedData.freeLessons[key] = [];
          groupedData.freeLessons[key].push(item);
          break;
        }
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
          groupedData.freeTools.push(item);
      }
    }
    res.status(200).json({
      success: true,
      data: groupedData,
      meta: { count: rows.length, timestamp: new Date().toISOString() }
    });
  } catch (err) {
    console.error('❌ /api/curriculums hiba:', err);
    res.status(500).json({ success: false, message: 'Szerverhiba a tananyagok lekérdezésekor.' });
  }
});

router.get('/search', authenticateTokenOptional, async (req, res) => {
  const searchTerm = (req.query.q || '').toString().trim();

  if (!searchTerm || searchTerm.length < 3) {
    return res.status(400).json({ success: false, message: 'A kereséshez legalább 3 karakter szükséges.' });
  }

  try {
    let queryText = `
      SELECT title, slug, subject, grade, category, description
      FROM curriculums
      WHERE is_published = true AND (
        LOWER(title) ILIKE $1 OR
        LOWER(slug) ILIKE $1 OR
        LOWER(description) ILIKE $1
      )
    `;
    const queryParams = [`%${searchTerm.toLowerCase()}%`];

    if (!req.user) {
      queryText += ` AND (category = 'free_lesson' OR category = 'free_tool')`;
    }

    queryText += ` ORDER BY title LIMIT 10;`;
    
    const { rows } = await pool.query(queryText, queryParams);
    
    res.status(200).json({
      success: true,
      data: rows,
      meta: { count: rows.length, timestamp: new Date().toISOString() }
    });
  } catch (err) {
    console.error('❌ /api/search hiba:', err);
    res.status(500).json({ success: false, message: 'Szerverhiba a keresés során.' });
  }
});

router.get('/quiz/:slug', authenticateTokenOptional, async (req, res) => {
  try {
    const raw = req.params.slug || '';
    const slug = raw.replace(/_/g, '-');

    const curriculumResult = await pool.query('SELECT category FROM curriculums WHERE slug = $1', [slug]);
    const isPremium = curriculumResult.rows.length > 0 && 
                      (curriculumResult.rows[0].category === 'premium_course' || curriculumResult.rows[0].category === 'premium_tool');

    if (isPremium) {
      if (!req.user) {
        return res.status(403).json({ 
          success: false, 
          message: 'Ez a tartalom prémium. A megtekintéséhez bejelentkezés és előfizetés szükséges.', 
          code: 'AUTH_REQUIRED' 
        });
      }

      const userProfile = await getFullUserProfile(req.user.userId);

      if (!userProfile || (!userProfile.is_subscribed && userProfile.role !== 'teacher')) {
         return res.status(403).json({ 
           success: false, 
           message: 'Ez egy prémium tartalom. A megtekintéséhez aktív előfizetés szükséges.',
           code: 'SUBSCRIPTION_REQUIRED'
         });
      }
    }
    
    const tananyagDir = path.resolve(__dirname, '..', 'data', 'tananyag');
    const helpDir = path.resolve(__dirname, '..', 'data', 'help');
    
    const possiblePaths = [
      path.join(tananyagDir, `${slug}.json`),
      path.join(tananyagDir, `${slug}.js`),
      path.join(helpDir, `${slug}.json`),
      path.join(helpDir, `${slug}.js`)
    ];

    let foundPath = null;
    for (const p of possiblePaths) {
        if (fsSync.existsSync(p)) {
            foundPath = p;
            break;
        }
    }

    if (!foundPath) {
      if (curriculumResult.rows.length > 0) {
        console.error(`❌ Adatbázis/fájlrendszer inkonzisztencia: a '${slug}' slug létezik az adatbázisban, de a hozzá tartozó fájl nem található.`);
        return res.status(500).json({
          success: false,
          message: 'A kért tananyag létezik, de a tartalomfájl jelenleg nem elérhető. A hibát rögzítettük.',
        });
      }
      return res.status(404).json({
        success: false,
        message: `Nem található a tartalom: ${slug}.`,
      });
    }

    let data;
    if (foundPath.endsWith('.json')) {
      const text = await fsp.readFile(foundPath, 'utf8');
      data = JSON.parse(text);
      console.log(`📄 Betöltve JSON: ${foundPath}`);
    } else {
      delete require.cache[foundPath];
      const mod = require(foundPath);
      data = (mod && mod.default) ? mod.default : mod;
      console.log(`🧩 Betöltve JS modul: ${foundPath}`);
    }

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { }
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error(`❌ Hiba a(z) /api/quiz/${req.params.slug} feldgozásakor:`, err);
    return res.status(500).json({ success: false, message: 'Szerverhiba történt a tartalom betöltésekor.' });
  }
});

module.exports = router;