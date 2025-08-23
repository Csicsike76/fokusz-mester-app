// scripts/check-local.js
import 'dotenv/config';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Client } = pkg;

console.log('[dotenv] injecting env from .env');

(async () => {
  try {
    console.log('🔎 Adatbázis ellenőrzés...');

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Render SSL támogatás
    });

    await client.connect();
    await client.query('SELECT 1');
    console.log('✅ Adatbázis kapcsolat sikeres!');

    await client.end();
  } catch (err) {
    console.error('❌ Adatbázis hiba:', err.message);
  }

  const urls = [
    'http://localhost:3000/api/curriculums',
    'http://localhost:3000/api/helparticles'
  ];

  for (const url of urls) {
    try {
      console.log(`🔎 Fetch ellenőrzése: ${url}`);
      const res = await fetch(url);
      const text = await res.text();

      try {
        const data = JSON.parse(text);
        console.log(`✅ ${url} fetch OK. Rekordok száma: ${Array.isArray(data) ? data.length : 1}`);
      } catch (jsonErr) {
        console.error(`❌ Fetch hiba: ${url} — invalid JSON response\nVisszakapott tartalom:`, text.slice(0, 200), '...');
      }
    } catch (fetchErr) {
      console.error(`❌ Fetch hiba: ${url}`, fetchErr.message);
    }
  }

  console.log('\n🔧 Ellenőrzés kész!');
})();
