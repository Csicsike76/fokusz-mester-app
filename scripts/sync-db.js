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

async function syncSingleFile(client, filePath, syncFunction) {
    const fileName = path.basename(filePath);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        await syncFunction(client, fileName, data);
    } catch (error) {
        console.error(`❌ Hiba a(z) ${fileName} fájl feldolgozása közben. A fájl kihagyva. Hiba: ${error.message}`);
    }
}

async function syncCurriculums(client, fileName, data) {
    const slug = path.parse(fileName).name;
    const { title, subject, grade, category, description, questions, characters } = data;

    if (!title || !subject || grade === undefined || !category) {
        console.warn(`⏩ Kihagyva: ${fileName} (hiányzó alapvető metaadatok).`);
        return;
    }

    const contentObject = {};
    if (characters) {
        contentObject.characters = characters;
    }
    
    const contentJson = Object.keys(contentObject).length > 0 ? JSON.stringify(contentObject) : null;
    
    const upsertQuery = `INSERT INTO Curriculums (slug, title, subject, grade, category, description, content, is_published) VALUES ($1, $2, $3, $4, $5, $6, $7, true) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, subject = EXCLUDED.subject, grade = EXCLUDED.grade, category = EXCLUDED.category, description = EXCLUDED.description, content = EXCLUDED.content, is_published = true RETURNING id;`;
    
    const result = await client.query(upsertQuery, [slug, title, subject, grade, category, description || null, contentJson]);
    const curriculumId = result.rows[0].id;

    await client.query('DELETE FROM QuizQuestions WHERE curriculum_id = $1', [curriculumId]);
    if (questions && Array.isArray(questions) && questions.length > 0) {
        for (const q of questions) {
            const insertQuestionQuery = `INSERT INTO QuizQuestions (curriculum_id, question_type, description, options, answer, explanation) VALUES ($1, $2, $3, $4, $5, $6);`;
            await client.query(insertQuestionQuery, [curriculumId, q.type, q.description, JSON.stringify(q.options), JSON.stringify(q.answer), q.explanation || null]);
        }
    }
}

async function syncHelpArticles(client, fileName, data) {
    const articles = Array.isArray(data) ? data : [data];
    for (const article of articles) {
        if (article && article.category && article.question && article.answer) {
            const { category, question, answer, keywords } = article;
            const query = `INSERT INTO helparticles (category, question, answer, keywords) VALUES ($1, $2, $3, $4)`;
            await client.query(query, [category, question, answer, keywords || null]);
        }
    }
}

async function syncDirectory(client, directoryPath, syncFunction) {
    try {
        const files = await fs.readdir(directoryPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        console.log(`Feldolgozás indul: ${jsonFiles.length} db .json fájl a(z) ${path.basename(directoryPath)} mappából.`);
        for (const fileName of jsonFiles) {
            // Minden fájlt egy külön tranzakcióban dolgozunk fel, hogy egy hiba ne akassza meg a többit.
            await client.query('BEGIN');
            try {
                await syncSingleFile(client, path.join(directoryPath, fileName), syncFunction);
                await client.query('COMMIT');
            } catch (fileError) {
                console.error(`Hiba a(z) ${fileName} tranzakciója közben, a változtatások visszavonva. Hiba: ${fileError.message}`);
                await client.query('ROLLBACK');
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') { throw error; }
        console.log(`Figyelmeztetés: A(z) ${directoryPath} mappa nem létezik vagy üres, kihagyva.`);
    }
}


async function syncDatabase() {
  const client = await pool.connect();
  try {
    console.log('Régi adatok törlése...');
    // A törlést a ciklusokon kívül végezzük el, egyszer.
    await client.query('DELETE FROM QuizQuestions');
    await client.query('DELETE FROM Curriculums');
    await client.query('DELETE FROM HelpArticles');

    await syncDirectory(client, quizzesDir, syncCurriculums);
    await syncDirectory(client, helpDir, syncHelpArticles);
    
    console.log('✅ Adatbázis szinkronizáció sikeresen befejeződött!');
  } catch (error) {
    console.error('❌ Kritikus hiba történt a szinkronizáció során:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncDatabase();