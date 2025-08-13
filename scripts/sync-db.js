// scripts/sync-db.js
require('dotenv').config();
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

function buildPgConfig() {
  const cs = process.env.DATABASE_URL;
  if (!cs || typeof cs !== 'string') {
    throw new Error('Hiányzik a DATABASE_URL az .env-ből.');
  }
  const url = cs.toLowerCase();
  const needSsl =
    url.includes('render.com') ||
    url.includes('neon.tech') ||
    url.includes('supabase.co') ||
    url.includes('sslmode=require') ||
    String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
    String(process.env.PGSSLMODE || '').toLowerCase() === 'require';

  return {
    connectionString: cs,
    ssl: needSsl ? { rejectUnauthorized: false } : false,
  };
}

function readJsonFolder(folderAbsPath) {
  if (!fs.existsSync(folderAbsPath)) return [];
  const files = fs.readdirSync(folderAbsPath).filter(f => f.toLowerCase().endsWith('.json'));
  const items = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(folderAbsPath, file), 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        items.push(parsed);
      }
    } catch (e) {
      console.warn(`⚠️ JSON hiba: ${file}: ${e.message}`);
    }
  }
  return items;
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function run() {
  // A szerver.js ALAKJÁHOZ IGAZODVA:
  // a fájlok a backend/data alatt vannak:
  const rootDir = path.resolve(__dirname, '..');
  const dataTananyagDir = path.join(rootDir, 'backend', 'data', 'tananyag');
  const dataHelpDir = path.join(rootDir, 'backend', 'data', 'help');

  const client = new Client(buildPgConfig());
  await client.connect();

  try {
    console.log('Régi adatok törlése...');
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE curriculums RESTART IDENTITY;');
    await client.query('TRUNCATE TABLE help_articles RESTART IDENTITY;');
    await client.query('COMMIT');

    // Tananyagok beolvasása
    const curris = readJsonFolder(dataTananyagDir);
    if (curris.length === 0) {
      console.warn(`Figyelmeztetés: A(z) ${dataTananyagDir} mappa nem létezik vagy üres, kihagyva.`);
    } else {
      console.log(`Feldolgozás indul: ${curris.length} db tananyag.`);
      for (const c of curris) {
        const title = c.title || c.name || c.cim || 'Névtelen tananyag';
        const subject = c.subject || c.tantargy || null;
        const grade = typeof c.grade === 'number' ? c.grade : (c.osztaly || null);
        const description = c.description || c.leiras || null;
        const isPremium = Boolean(c.is_premium || c.premium || false);

        await client.query(
          `INSERT INTO curriculums (title, subject, grade, description, is_premium)
           VALUES ($1,$2,$3,$4,$5);`,
          [title, subject, grade, description, isPremium]
        );
      }
    }

    // Súgó / help beolvasása
    const helps = readJsonFolder(dataHelpDir);
    if (helps.length === 0) {
      console.warn(`Figyelmeztetés: A(z) ${dataHelpDir} mappa nem létezik vagy üres, kihagyva.`);
    } else {
      console.log(`Feldolgozás indul: ${helps.length} db .json fájl a(z) help mappából.`);
      for (const h of helps) {
        const title = h.title || h.cim || 'Cím nélkül';
        const slug = h.slug || slugify(title);
        const category = h.category || h.kategoria || null;
        const orderNum = Number.isFinite(h.order_num) ? h.order_num : (Number(h.sorrend) || 0);
        const isPublished = typeof h.is_published === 'boolean' ? h.is_published : true;

        // Tartalmat JSONB-be mentjük: a teljes objektumot eltároljuk
        await client.query(
          `INSERT INTO help_articles (slug, title, content, category, order_num, is_published)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (slug) DO UPDATE
             SET title=EXCLUDED.title,
                 content=EXCLUDED.content,
                 category=EXCLUDED.category,
                 order_num=EXCLUDED.order_num,
                 is_published=EXCLUDED.is_published;`,
          [slug, title, h, category, orderNum, isPublished]
        );
      }
    }

    console.log('✅ Adatbázis szinkronizáció sikeresen befejeződött!');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
