// scripts/setup-db.js
require('dotenv').config();
const { Client } = require('pg');

function needSSL(url) {
  if (!url) return false;
  if (/\b(render\.com|railway\.app|neon\.tech|supabase\.co)\b/i.test(url)) return true;
  if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') return true;
  return false;
}

const DATABASE_URL = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL hiányzik vagy üres a .env-ben. Add meg és futtasd újra.');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: needSSL(DATABASE_URL) ? { rejectUnauthorized: false } : false,
  application_name: 'setup-db',
});

async function tableExists(table) {
  const q = `SELECT to_regclass($1) AS reg`;
  const r = await client.query(q, [`public.${table}`]);
  return !!r.rows[0].reg;
}

async function columnExists(table, column) {
  const q = `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1 AND column_name=$2
    LIMIT 1
  `;
  const r = await client.query(q, [table, column]);
  return r.rowCount > 0;
}

async function columnIsNotNull(table, column) {
  const q = `
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1 AND column_name=$2
  `;
  const r = await client.query(q, [table, column]);
  if (!r.rowCount) return false;
  return r.rows[0].is_nullable === 'NO';
}

async function ensureCore() {
  // Csak a kritikus részek: itt most a subscription_plans-ra fókuszálunk
  // (A többi tábla nálad már rendben, nem nyúlok hozzájuk.)
  const hasPlans = await tableExists('subscription_plans');

  if (!hasPlans) {
    // Kompatibilis induló séma: legyen "interval" (interval NOT NULL)
    // + a modernebb "interval_unit" / "interval_count" mezők is.
    await client.query(`
      CREATE TABLE public.subscription_plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price_cents INTEGER NOT NULL DEFAULT 0,
        interval INTERVAL NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        interval_unit TEXT,
        interval_count INTEGER,
        trial_days INTEGER NOT NULL DEFAULT 0
      );
    `);
  } else {
    // Ha létezik, csak pótoljuk a hiányzó oszlopokat.
    // (Nem változtatunk típust, nem dobunk el semmit.)
    if (!(await columnExists('subscription_plans', 'interval'))) {
      // Ha valaha "interval" nélkül hozták létre, adjuk hozzá. Legyen NULL-mentes defaulttal.
      await client.query(`
        ALTER TABLE public.subscription_plans
          ADD COLUMN IF NOT EXISTS interval INTERVAL;
      `);
      // Tegyünk rá értelmes defaultot (pl. 1 month), hogy NOT NULL-re állítható legyen később is.
      await client.query(`
        UPDATE public.subscription_plans
           SET interval = make_interval(months => 1)
         WHERE interval IS NULL;
      `);
      // NOT NULL, hogy a régi logika is biztonságban legyen
      await client.query(`
        ALTER TABLE public.subscription_plans
          ALTER COLUMN interval SET NOT NULL;
      `);
    }

    await client.query(`
      ALTER TABLE public.subscription_plans
        ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Plan',
        ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS interval_unit TEXT,
        ADD COLUMN IF NOT EXISTS interval_count INTEGER,
        ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 0;
    `);
  }
}

function intervalExpr(unit, count) {
  // Postgres make_interval-hoz építünk kifejezést a unit alapján
  const n = Number(count) || 0;
  switch (unit) {
    case 'day':   return `make_interval(days => ${n})`;
    case 'month': return `make_interval(months => ${n})`;
    case 'year':  return `make_interval(years => ${n})`;
    default:      return `make_interval(months => 1)`;
  }
}

async function seedPlans() {
  // Ha már van aktív csomag, nem szúrunk duplán.
  const r = await client.query(`SELECT COUNT(*)::int AS c FROM public.subscription_plans WHERE is_active = true;`);
  if ((r.rows[0]?.c ?? 0) > 0) return;

  // Feltérképezzük, milyen oszlopaink vannak
  const hasInterval = await columnExists('subscription_plans', 'interval');
  const intervalNN  = hasInterval ? await columnIsNotNull('subscription_plans', 'interval') : false;
  const hasUnit     = await columnExists('subscription_plans', 'interval_unit');
  const hasCount    = await columnExists('subscription_plans', 'interval_count');
  const hasTrial    = await columnExists('subscription_plans', 'trial_days');

  // Beállítások (név, ár, unit, count, trial)
  const rows = [
    { name: 'Ingyenes próba', price: 0,    unit: 'day',   count: 30, trial: 0 },
    { name: 'Alap havidíj',   price: 1990, unit: 'month', count: 1,  trial: 7 },
    { name: 'Tanári csomag',  price: 4990, unit: 'month', count: 1,  trial: 7 },
  ];

  // Dinamikus INSERT oszloplista a meglévő séma szerint
  const cols = ['name', 'price_cents', 'is_active'];
  if (hasUnit)  cols.push('interval_unit');
  if (hasCount) cols.push('interval_count');
  if (hasTrial) cols.push('trial_days');
  if (hasInterval) cols.push('interval'); // a végére tesszük

  // Soronként beszúrjuk a megfelelő értékeket
  for (const row of rows) {
    const values = [`'${row.name.replace(/'/g, "''")}'`, row.price, 'true'];
    if (hasUnit)  values.push(`'${row.unit}'`);
    if (hasCount) values.push(String(row.count));
    if (hasTrial) values.push(String(row.trial));
    if (hasInterval) {
      // Ha van interval oszlop, mindig adunk neki értelmes értéket
      values.push(intervalExpr(row.unit, row.count));
    }

    const sql = `
      INSERT INTO public.subscription_plans (${cols.join(', ')})
      VALUES (${values.join(', ')});
    `;
    await client.query(sql);
  }
}

async function run() {
  try {
    await client.connect();
    await client.query('BEGIN');

    await ensureCore();
    await seedPlans();

    await client.query('COMMIT');
    console.log('✅ setup-db: kész.');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
