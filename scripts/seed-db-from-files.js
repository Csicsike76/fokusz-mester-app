require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Adatbázis-kapcsolat beállítása
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('HIBA: A DATABASE_URL környezeti változó hiányzik.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
});

async function seedDatabase() {
  const client = await pool.connect();
  console.log('Adatbázis-kapcsolat sikeres. Adatfeltöltés a JSON fájlokból indul...');

  try {
    await client.query('BEGIN');

    // Töröljük a régi adatokat, hogy frissen tölthessük fel
    await client.query('DELETE FROM helparticles;');
    await client.query('DELETE FROM curriculums;');

    // --- Súgó cikkek feltöltése ---
    const helpDir = path.resolve(__dirname, '..', 'backend', 'data', 'help');
    const helpFiles = fs.readdirSync(helpDir).filter(file => file.endsWith('.json'));
    
    console.log(`Talált ${helpFiles.length} súgó JSON fájl a feldolgozáshoz.`);

    for (const file of helpFiles) {
      const filePath = path.join(helpDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const articles = JSON.parse(fileContent);

      for (const article of articles) {
        // A slug egyedi azonosító lesz a címből generálva
        const slug = article.question.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // speciális karakterek eltávolítása
          .replace(/\s+/g, '-')         // szóközök cseréje kötőjelre
          .slice(0, 50);               // maximum 50 karakter

        await client.query(
          `INSERT INTO helparticles (slug, title, content, category, tags)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (slug) DO NOTHING;`,
          [slug, article.question, article.answer, article.category, article.keywords || '']
        );
      }
    }
    console.log('✅ Súgó cikkek sikeresen betöltve az adatbázisba.');

    // --- Keresőhöz szükséges tananyagok (Curriculums) feltöltése ---
    // Itt csak néhány példát adunk hozzá, hogy a kereső is működjön
    const sampleCurriculums = [
      { slug: 'matek-kviz-bevezeto', title: 'Bevezető matematika kvíz', subject: 'Matematika', category: 'free_lesson', description: 'Teszteld tudásod!' },
      { slug: 'fizika-kviz-alapok', title: 'Fizika alapjai kvíz', subject: 'Fizika', category: 'premium_lesson', description: 'Kérdések a mechanikából.' },
      { slug: 'vip-kodok-tanaroknak', title: 'VIP kódok használata tanároknak', subject: 'Általános', category: 'free_tool', description: 'Minden, amit a tanári regisztrációról tudni kell.' }
    ];

    for (const curriculum of sampleCurriculums) {
        await client.query(
            `INSERT INTO curriculums (slug, title, subject, category, description, is_published)
             VALUES ($1, $2, $3, $4, $5, true)
             ON CONFLICT (slug) DO NOTHING;`,
            [curriculum.slug, curriculum.title, curriculum.subject, curriculum.category, curriculum.description]
        );
    }
    console.log('✅ Keresőhöz szükséges minta tananyagok betöltve.');

    await client.query('COMMIT');
    console.log('🚀 Adatbázis sikeresen feltöltve a helyi JSON fájlok alapján.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('HIBA az adatbázis feltöltése közben, a változások visszavonva:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();