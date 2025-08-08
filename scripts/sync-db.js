const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const dataDirectory = path.join(__dirname, '..', 'backend', 'data');

async function syncDatabase() {
  console.log('Adatbázis szinkronizáció megkezdése...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const files = await fs.readdir(dataDirectory);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log(`${jsonFiles.length} darab .json fájl található.`);

    for (const fileName of jsonFiles) {
      const filePath = path.join(dataDirectory, fileName);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      let data;
      try {
        data = JSON.parse(fileContent);
      } catch (e) {
        console.warn(`Figyelmeztetés: A(z) ${fileName} fájl nem érvényes JSON. Kihagyva.`);
        continue;
      }
      
      const slug = path.parse(fileName).name;
      const { title, subject, grade, category, description, content, questions } = data;

      if (!title || !subject || grade === undefined || !category) {
          console.warn(`Figyelmeztetés: Hiányos metaadatok a(z) ${fileName} fájlban. Kihagyva.`);
          continue;
      }

      const upsertCurriculumQuery = `
        INSERT INTO Curriculums (slug, title, subject, grade, category, description, content, is_published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
        ON CONFLICT (slug) 
        DO UPDATE SET
          title = EXCLUDED.title, subject = EXCLUDED.subject, grade = EXCLUDED.grade, category = EXCLUDED.category,
          description = EXCLUDED.description, content = EXCLUDED.content, updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await client.query(upsertCurriculumQuery, [slug, title, subject, grade, category, description || null, content ? JSON.stringify(content) : null]);
      const curriculumId = result.rows[0].id;

      await client.query('DELETE FROM QuizQuestions WHERE curriculum_id = $1', [curriculumId]);
      
      if (questions && Array.isArray(questions) && questions.length > 0) {
        for (const q of questions) {
          if (!q.type || !q.description || !q.options || !q.answer) {
            console.warn(`Figyelmeztetés: Hiányos kérdés a(z) ${fileName} fájlban. Kihagyva.`);
            continue;
          }
          const insertQuestionQuery = `INSERT INTO QuizQuestions (curriculum_id, question_type, description, options, answer, explanation) VALUES ($1, $2, $3, $4, $5, $6);`;
          await client.query(insertQuestionQuery, [curriculumId, q.type, q.description, JSON.stringify(q.options), JSON.stringify(q.answer), q.explanation || null]);
        }
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Adatbázis szinkronizáció sikeresen befejeződött!');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Hiba történt a szinkronizáció során:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

syncDatabase();