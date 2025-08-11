// scripts/fix-migrations.js
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const DATABASE_URL = process.env.DATABASE_URL || '';
  if (!DATABASE_URL) {
    console.error('❌ Hiányzik a DATABASE_URL környezeti változó.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const NAMES_TO_DELETE = [
    '1754743348648_initial-schema',
    '1754892769917_allow-null-grade-in-curriculums',
    '1754892889929_allow-null-subject-in-curriculums',
    '1754913986960_add-parent-accounts-table',
    '1754914166623_parent-teacher-panel-full'
  ];

  try {
    await client.connect();
    console.log('✅ Kapcsolódva az adatbázishoz.');

    // Nézzük meg, mi van most
    const before = await client.query('SELECT name, run_on FROM pgmigrations ORDER BY run_on;');
    console.log('--- Jelenlegi pgmigrations ---');
    before.rows.forEach(r => console.log(`${r.name} | ${r.run_on}`));

    // Töröljük az ütköző régi bejegyzéseket
    const del = await client.query(
      `DELETE FROM pgmigrations WHERE name = ANY($1::text[])`,
      [NAMES_TO_DELETE]
    );
    console.log(`🧹 Törölt sorok száma: ${del.rowCount}`);

    // Ellenőrizzük utána is
    const after = await client.query('SELECT name, run_on FROM pgmigrations ORDER BY run_on;');
    console.log('--- pgmigrations a takarítás után ---');
    after.rows.forEach(r => console.log(`${r.name} | ${r.run_on}`));

    console.log('🎉 Kész. Most már futhat a migrate:up.');
  } catch (e) {
    console.error('❌ Hiba:', e);
  } finally {
    await client.end();
  }
})();
