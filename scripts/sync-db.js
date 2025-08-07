const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const quizzesDirectory = path.join(__dirname, '..', 'src', 'data', 'quizzes');

async function syncDatabase() {
  console.log('Adatbázis szinkronizáció megkezdése...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const files = await fs.readdir(quizzesDirectory);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log(`${jsonFiles.length} darab .json fájl található.`);

    for (const fileName of jsonFiles) {
      const filePath = path.join(quizzesDirectory, fileName);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const quizData = JSON.parse(fileContent);

      // A slug-ot a FÁJLNÉVBŐL generáljuk
      const slug = path.parse(fileName).name;
      
      const { title, subject, grade, category, questions } = quizData;

      if (!title || !subject || !grade || !category || !questions) {
          console.warn(`Figyelmeztetés: A(z) ${fileName} fájl hiányos. A fájl kihagyva.`);
          continue;
      }

      const upsertCurriculumQuery = `
        INSERT INTO Curriculums (slug, title, subject, grade, category, is_published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        ON CONFLICT (slug) 
        DO UPDATE SET
          title = EXCLUDED.title,
          subject = EXCLUDED.subject,
          grade = EXCLUDED.grade,
          category = EXCLUDED.category,
          updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await client.query(upsertCurriculumQuery, [slug, title, subject, grade, category]);
      const curriculumId = result.rows[0].id;
      console.log(`Tananyag mentve/frissítve a '${slug}' slug-gal. ID: ${curriculumId}`);

      await client.query('DELETE FROM QuizQuestions WHERE curriculum_id = $1', [curriculumId]);
      for (const question of questions) {
        const insertQuestionQuery = `INSERT INTO QuizQuestions (curriculum_id, question_type, description, options, answer, answer_regex) VALUES ($1, $2, $3, $4, $5, $6);`;
        await client.query(insertQuestionQuery, [curriculumId, question.type, question.description, JSON.stringify(question.options || null), JSON.stringify(question.answer || null), question.answerRegex || null]);
      }
      console.log(`${questions.length} kérdés mentve a(z) ${curriculumId} ID-jű tananyaghoz.`);
    }

    await client.query('COMMIT');
    console.log('✅ Adatbázis szinkronizáció sikeresen befejeződött!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Hiba történt a szinkronizáció során:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncDatabase();