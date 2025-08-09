const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const quizzesDir = path.join(__dirname, '..', 'backend', 'data', 'quizzes');
const helpDir = path.join(__dirname, '..', 'backend', 'data', 'help');

async function syncSingleDirectory(client, directoryPath, syncFunction) {
    try {
        await fs.mkdir(directoryPath, { recursive: true });
        const files = await fs.readdir(directoryPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        console.log(`Feldolgozás: ${jsonFiles.length} db .json fájl a(z) ${path.basename(directoryPath)} mappából.`);
        for (const fileName of jsonFiles) {
            const filePath = path.join(directoryPath, fileName);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            await syncFunction(client, fileName, data);
        }
    } catch (error) {
        if (error.code !== 'ENOENT') { throw error; }
        console.log(`Figyelmeztetés: A(z) ${directoryPath} mappa nem létezik vagy üres, kihagyva.`);
    }
}

async function syncCurriculums(client, fileName, data) {
    const slug = path.parse(fileName).name;
    const { title, subject, grade, category, description, content, questions } = data;
    if (!title || !subject || grade === undefined || !category) { return; }
    const upsertQuery = `INSERT INTO Curriculums (slug, title, subject, grade, category, description, content) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, subject = EXCLUDED.subject, grade = EXCLUDED.grade, category = EXCLUDED.category, description = EXCLUDED.description, content = EXCLUDED.content RETURNING id;`;
    const result = await client.query(upsertQuery, [slug, title, subject, grade, category, description || null, content ? JSON.stringify(content) : null]);
    const curriculumId = result.rows[0].id;
    await client.query('DELETE FROM QuizQuestions WHERE curriculum_id = $1', [curriculumId]);
    if (questions && questions.length > 0) {
        for (const q of questions) {
            const insertQuestionQuery = `INSERT INTO QuizQuestions (curriculum_id, question_type, description, options, answer, explanation) VALUES ($1, $2, $3, $4, $5, $6);`;
            await client.query(insertQuestionQuery, [curriculumId, q.type, q.description, JSON.stringify(q.options), JSON.stringify(q.answer), q.explanation || null]);
        }
    }
}

async function syncHelpArticles(client, fileName, articles) {
    for (const article of articles) {
        const { category, question, answer, keywords } = article;
        const query = `INSERT INTO helparticles (category, question, answer, keywords) VALUES ($1, $2, $3, $4)`;
        await client.query(query, [category, question, answer, keywords || null]);
    }
}

async function syncDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await syncSingleDirectory(client, quizzesDir, syncCurriculums);
    
    // JAVÍTÁS ITT: A tábla nevét kisbetűvel kell írni
    await client.query('DELETE FROM helparticles');
    
    await syncSingleDirectory(client, helpDir, syncHelpArticles);
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