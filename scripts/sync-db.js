const { Pool } = require('pg');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl: (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') ? { rejectUnauthorized: false } : false,
});

async function readJsonOrJs(filePath) {
  if (filePath.endsWith('.json')) {
    const txt = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(txt);
  }
  if (filePath.endsWith('.js')) {
    delete require.cache[require.resolve(filePath)];
    const mod = require(filePath);
    return (mod && mod.default) ? mod.default : mod;
  }
  return null;
}

async function loadCurriculums(client) {
  const baseDir = path.resolve(__dirname, 'data', 'tananyag');
  if (!fs.existsSync(baseDir)) return;
  const files = await fsp.readdir(baseDir);
  for (const file of files) {
    if (!file.endsWith('.json') && !file.endsWith('.js')) continue;
    const full = path.join(baseDir, file);
    const data = await readJsonOrJs(full);
    if (!data) continue;

    const slug = (data.slug || path.basename(file, path.extname(file))).toString();
    const title = (data.title || slug).toString();
    const category = (data.category || 'free_lesson').toString();
    const subject = data.subject ? String(data.subject) : null;
    const grade = Number.isFinite(data.grade) ? Number(data.grade) : null;
    const description = data.description ? String(data.description) : null;
    const is_published = typeof data.is_published === 'boolean' ? data.is_published : true;

    await client.query(
      `INSERT INTO curriculums (slug, title, subject, grade, category, description, is_published, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT (slug) DO UPDATE
       SET title=EXCLUDED.title,
           subject=EXCLUDED.subject,
           grade=EXCLUDED.grade,
           category=EXCLUDED.category,
           description=EXCLUDED.description,
           is_published=EXCLUDED.is_published,
           updated_at=NOW();`,
      [slug, title, subject, grade, category, description, is_published]
    );
  }
}

async function loadHelp(client) {
  const baseDir = path.resolve(__dirname, 'data', 'help');
  if (!fs.existsSync(baseDir)) return;
  const files = await fsp.readdir(baseDir);
  for (const file of files) {
    const full = path.join(baseDir, file);
    if (file.endsWith('.json')) {
      const obj = await readJsonOrJs(full);
      if (!obj) continue;
      const slug = (obj.slug || path.basename(file, '.json')).toString();
      const title = (obj.title || slug).toString();
      const content = (obj.content || '').toString();
      const category = obj.category ? String(obj.category) : null;
      const tags = obj.tags ? String(obj.tags) : null;
      await client.query(
        `INSERT INTO helparticles (slug, title, content, category, tags, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
         ON CONFLICT (slug) DO UPDATE
         SET title=EXCLUDED.title,
             content=EXCLUDED.content,
             category=EXCLUDED.category,
             tags=EXCLUDED.tags,
             updated_at=NOW();`,
        [slug, title, content, category, tags]
      );
    } else if (file.endsWith('.md')) {
      const txt = await fsp.readFile(full, 'utf8');
      const slug = path.basename(file, '.md');
      const firstLine = txt.split(/\r?\n/)[0] || slug;
      const title = firstLine.replace(/^#\s*/, '') || slug;
      const content = txt;
      const category = null;
      const tags = null;
      await client.query(
        `INSERT INTO helparticles (slug, title, content, category, tags, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
         ON CONFLICT (slug) DO UPDATE
         SET title=EXCLUDED.title,
             content=EXCLUDED.content,
             category=EXCLUDED.category,
             tags=EXCLUDED.tags,
             updated_at=NOW();`,
        [slug, title, content, category, tags]
      );
    }
  }
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Wipe & load
    await client.query(`DELETE FROM helparticles;`);
    await client.query(`DELETE FROM curriculums;`);

    await loadCurriculums(client);
    await loadHelp(client);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
