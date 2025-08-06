// Szükséges csomagok betöltése
const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Adatbázis kapcsolat létrehozása
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// A mappa, ahol a kvíz JSON fájlokat tároljuk
const quizzesDirectory = path.join(__dirname, '..', 'src', 'data', 'quizzes');

// A fő szinkronizáló függvény
async function syncDatabase() {
  console.log('Adatbázis szinkronizáció megkezdése...');
  
  try {
    const files = await fs.readdir(quizzesDirectory);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log(`${jsonFiles.length} darab .json fájl található.`);

    for (const fileName of jsonFiles) {
      console.log(`--- Fájl feldolgozása: ${fileName} ---`);
      const slug = path.parse(fileName).name;
      const filePath = path.join(quizzesDirectory, fileName);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const quizData = JSON.parse(fileContent);

      const { title, subject, grade, questions } = quizData;

      if (!title || !subject || !grade || !questions) {
          console.warn(`Figyelmeztetés: A(z) ${fileName} fájl hiányos, a 'title', 'subject', 'grade', vagy 'questions' kulcs hiányzik. A fájl kihagyva.`);
          continue;
      }

      const upsertCurriculumQuery = `
        INSERT INTO Curriculums (slug, title, subject, grade, is_published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        ON CONFLICT (slug) 
        DO UPDATE SET
          title = EXCLUDED.title,
          subject = EXCLUDED.subject,
          grade = EXCLUDED.grade,
          updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await pool.query(upsertCurriculumQuery, [slug, title, subject, grade]);
      const curriculumId = result.rows[0].id;
      console.log(`Tananyag mentve/frissítve a '${slug}' slug-gal. ID: ${curriculumId}`);

      await pool.query('DELETE FROM QuizQuestions WHERE curriculum_id = $1', [curriculumId]);

      for (const question of questions) {
        const insertQuestionQuery = `
          INSERT INTO QuizQuestions (curriculum_id, question_type, description, options, answer, answer_regex)
          VALUES ($1, $2, $3, $4, $5, $6);
        `;
        await pool.query(insertQuestionQuery, [
          curriculumId,
          question.type,
          question.description,
          JSON.stringify(question.options || null),
          JSON.stringify(question.answer || null),
          question.answerRegex || null
        ]);
      }
      console.log(`${questions.length} kérdés mentve a(z) ${curriculumId} ID-jű tananyaghoz.`);
    }

    console.log('✅ Adatbázis szinkronizáció sikeresen befejeződött!');

  } catch (error) {
    console.error('❌ Hiba történt a szinkronizáció során:', error);
  } finally {
    await pool.end();
  }
}

syncDatabase();