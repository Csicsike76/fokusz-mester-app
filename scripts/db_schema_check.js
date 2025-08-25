require('dotenv').config();
const { Pool } = require('pg');

function getSSL(url) {
  if (!url) return false;
  const sslEnv = String(process.env.DB_SSL || '').toLowerCase();
  if (sslEnv === 'true' || sslEnv === '1') return { rejectUnauthorized: false };
  if (sslEnv === 'false' || sslEnv === '0') return false;
  // Automatikus SSL engedélyezés felhő adatbázisokhoz
  if (/\b(render\.com|railway\.app|neon\.tech|supabase\.co|heroku|aws|azure|gcp)\b/i.test(url)) {
    return { rejectUnauthorized: false };
  }
  return false;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || typeof DATABASE_URL !== 'string' || DATABASE_URL.trim() === '') {
  console.error('HIBA: A DATABASE_URL környezeti változó hiányzik vagy üres a .env fájlból.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: getSSL(DATABASE_URL),
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('📋 Teljes adatbázis-séma ellenőrzése...\n');

    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
      ORDER BY table_name;
    `);

    console.log('🔹 Táblák:');
    tablesRes.rows.forEach(r => console.log('•', r.table_name));

    for (const { table_name } of tablesRes.rows) {
      const columnsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table_name]);

      console.log(`\n--- ${table_name} oszlopai ---`);
      columnsRes.rows.forEach(col => {
        console.log(`• ${col.column_name} | ${col.data_type} | nullable: ${col.is_nullable} | default: ${col.column_default}`);
      });
    }

    const constraintsRes = await client.query(`
      SELECT conname AS constraint_name, contype AS constraint_type, conrelid::regclass AS table_name
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace
      ORDER BY conrelid::regclass::text;
    `);

    console.log('\n🔹 Constraint-ek:');
    constraintsRes.rows.forEach(c => console.log(`• ${c.constraint_name} | típus: ${c.constraint_type} | tábla: ${c.table_name}`));

    const indexesRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname='public'
      ORDER BY tablename, indexname;
    `);

    console.log('\n🔹 Indexek:');
    indexesRes.rows.forEach(idx => console.log(`• ${idx.indexname} | definíció: ${idx.indexdef}`));

    const triggersRes = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_timing, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema='public'
      ORDER BY event_object_table, trigger_name;
    `);

    console.log('\n🔹 Triggerek:');
    triggersRes.rows.forEach(trg => {
      console.log(`• Tábla: ${trg.event_object_table} | Trigger: ${trg.trigger_name} | Timing: ${trg.action_timing} | Event: ${trg.event_manipulation} | Action: ${trg.action_statement}`);
    });

  } catch (e) {
    console.error('HIBA az adatbázis ellenőrzésekor:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
