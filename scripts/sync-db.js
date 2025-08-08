const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const quizzesDirectory = path.join(__dirname, '..', 'data', 'quizzes');

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
      console.log(`\n--- Feldolgozás: ${fileName} ---`);

      let quizData;
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        quizData = JSON.parse(fileContent);
      } catch (parseErr) {
        console.error(`❌ JSON hiba a fájlban: ${fileName}\n   ${parseErr.message}`);
        continue;
      }

      if (!quizData.title) quizData.title = path.parse(fileName).name;
      if (!quizData.subject) quizData.subject = 'ismeretlen';
      if (!quizData.grade) quizData.grade = 0;
      if (!quizData.category) quizData.category = 'free';
      if (!Array.isArray(quizData.questions)) quizData.questions = [];

      const { title, subject, grade, category, questions } = quizData;
      const slug = path.parse(fileName).name;

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

      let curriculumId;
      try {
        const { rows } = await client.query(upsertCurriculumQuery, [slug, title, subject, grade, category]);
        curriculumId = rows[0].id;
        console.log(`✔️  Tananyag upsertelve: ${slug} (id=${curriculumId})`);
      } catch (e) {
        console.error(`❌ Curriculums mentési hiba (${fileName}): ${e.message}`);
        continue;
      }

      await client.query('DELETE FROM QuizQuestions WHERE curriculum_id = $1', [curriculumId]);

      const insertQuestionQuery = `
        INSERT INTO QuizQuestions
          (curriculum_id, question_type, description, options, answer, explanation, answer_regex)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7);
      `;

      let inserted = 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        try {
          await client.query(insertQuestionQuery, [
            curriculumId,
            q.type || 'single-choice',
            q.description || '',
            JSON.stringify(q.options ?? null),
            JSON.stringify(q.answer ?? null),
            q.explanation ?? null,
            q.answerRegex ?? null
          ]);
          inserted++;
        } catch (e) {
          console.error(`❌ Kérdés beszúrási hiba (${fileName} | kérdés #${i + 1}): ${e.message}`);
        }
      }

      console.log(`→ ${inserted}/${questions.length} kérdés beszúrva (${fileName}).`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Adatbázis szinkronizáció sikeresen befejeződött!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Hiba történt a szinkronizáció során:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncDatabase();
