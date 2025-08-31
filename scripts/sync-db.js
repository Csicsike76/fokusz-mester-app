require('dotenv').config();
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

function wantSSL(url) {
  if (!url) return false;
  const sslEnv = String(process.env.DB_SSL || '').toLowerCase();
  if (sslEnv === 'true' || sslEnv === '1') return true;
  if (sslEnv === 'false' || sslEnv === '0') return false;
  if (/\b(render\.com|railway\.app|neon\.tech|supabase\.co|heroku|aws|azure|gcp)\b/i.test(url)) return true;
  return false;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('HIBA: A DATABASE_URL környezeti változó hiányzik a .env fájlból.');
}

const pgConfig = {
  connectionString: DATABASE_URL,
  ssl: wantSSL(DATABASE_URL) ? { rejectUnauthorized: false } : false,
};

function readJsonFolder(folderAbsPath) {
  if (!fs.existsSync(folderAbsPath)) return [];
  const files = fs.readdirSync(folderAbsPath).filter(f => f.toLowerCase().endsWith('.json'));
  const items = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(folderAbsPath, file), 'utf8');
      const parsed = JSON.parse(raw);
      const slugFromFile = path.basename(file, '.json');
      if (Array.isArray(parsed)) {
          parsed.forEach(p => {
              if(!p.slug) p.slug = slugFromFile;
              items.push(p)
          });
      } else if (parsed && typeof parsed === 'object') {
        if(!parsed.slug) parsed.slug = slugFromFile;
        items.push(parsed);
      }
    } catch (e) {
      console.warn(`⚠️ JSON olvasási hiba: ${file}: ${e.message}`);
    }
  }
  return items;
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function syncCurriculums(client, dataDir) {
  const items = readJsonFolder(dataDir);
  if (items.length === 0) {
    console.warn(`Figyelmeztetés: A(z) ${dataDir} mappa üres vagy nem létezik. Tananyagok szinkronizálása kihagyva.`);
    return;
  }

  console.log(`${items.length} db tananyag feldolgozása indul...`);
  
  for (const item of items) {
    const title = item.title || 'Névtelen tananyag';
    const slug = item.slug || slugify(title);
    const subject = item.subject || null;
    const grade = item.grade === 0 ? 0 : (item.grade || null);
    const description = item.description || null;
    const isPublished = typeof item.is_published === 'boolean' ? item.is_published : true;
    const category = item.category || 'free_lesson';

    const curriculumResult = await client.query(
      `INSERT INTO curriculums (slug, title, subject, grade, category, description, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         subject = EXCLUDED.subject,
         grade = EXCLUDED.grade,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         is_published = EXCLUDED.is_published,
         updated_at = NOW()
       RETURNING id;`,
      [slug, title, subject, grade, category, description, isPublished]
    );

    const curriculumId = curriculumResult.rows[0].id;
    
    if (Array.isArray(item.questions) && item.questions.length > 0) {
      await client.query('DELETE FROM quizquestions WHERE curriculum_id = $1', [curriculumId]);
      
      for (let i = 0; i < item.questions.length; i++) {
        const question = item.questions[i];
        await client.query(
          `INSERT INTO quizquestions (curriculum_id, question_data, order_num, difficulty_level) VALUES ($1, $2, $3, $4);`,
          [curriculumId, question, i, question.difficulty || 'medium']
        );
      }
    }
  }
  console.log('Tananyagok szinkronizálása kész.');
}

async function syncHelpArticles(client, dataDir) {
  const items = readJsonFolder(dataDir);
  if (items.length === 0) {
    console.warn(`Figyelmeztetés: A(z) ${dataDir} mappa üres vagy nem létezik. Súgócikkek szinkronizálása kihagyva.`);
    return;
  }
  console.log(`${items.length} db súgócikk feldolgozása indul...`);
  for (const h of items) {
    const title = h.question || 'Cím nélkül';
    const content = h.answer || '';
    const keywords = h.keywords || null;
    const category = h.category || 'Általános';
    const slug = slugify(title);
    
    await client.query(
      `INSERT INTO helparticles (slug, title, content, category, tags, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         category = EXCLUDED.category,
         tags = EXCLUDED.tags,
         updated_at = NOW();`,
      [slug, title, content, category, keywords]
    );
  }
  console.log('Súgócikkek szinkronizálása kész.');
}

async function run() {
  const rootDir = path.resolve(__dirname, '..');
  const dataTananyagDir = path.join(rootDir, 'backend', 'data', 'tananyag');
  const dataHelpDir = path.join(rootDir, 'backend', 'data', 'help');

  const client = new Client(pgConfig);
  await client.connect();

  try {
    console.log('Szinkronizáció indul...');
    await client.query('BEGIN');
    
    console.log('Régi adatok törlése...');
    await client.query('TRUNCATE TABLE curriculums, helparticles RESTART IDENTITY CASCADE;');

    await syncCurriculums(client, dataTananyagDir);
    await syncHelpArticles(client, dataHelpDir);
    
    await client.query('COMMIT');
    console.log('✅ Adatbázis szinkronizáció sikeresen befejeződött!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('HIBA a szinkronizáció során, a változások visszavonva:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();