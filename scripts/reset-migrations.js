// scripts/reset-migrations.js
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ Hiányzik a DATABASE_URL.');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }});
  try {
    await client.connect();
    console.log('✅ Kapcsolódva.');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations (
        name TEXT PRIMARY KEY,
        run_on TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    const res1 = await client.query('SELECT COUNT(*)::int AS n FROM pgmigrations;');
    console.log('🔎 pgmigrations jelenleg:', res1.rows[0].n);

    const res2 = await client.query('DELETE FROM pgmigrations;');
    console.log('🧹 Törölt sorok:', res2.rowCount);

    const res3 = await client.query('SELECT COUNT(*)::int AS n FROM pgmigrations;');
    console.log('✅ pgmigrations most:', res3.rows[0].n);
    console.log('🎉 Kész. Mehet a migrate:up.');
  } catch (e) {
    console.error('❌ Hiba:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
