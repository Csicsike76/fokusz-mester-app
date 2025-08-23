// check-local.js
import dotenv from 'dotenv';
import { Client } from 'pg';
import fetch from 'node-fetch';

dotenv.config();

async function checkDatabase() {
  console.log('🔎 Adatbázis ellenőrzés...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Render PostgreSQL SSL
  });

  try {
    await client.connect();
    console.log('✅ Adatbázis kapcsolat sikeres!');
  } catch (err) {
    console.error('❌ Adatbázis hiba:', err.message);
  } finally {
    await client.end();
  }
}

async function checkFetch(url) {
  console.log(`🔎 Fetch ellenőrzése: ${url}`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`✅ ${url} OK — visszakapott elemek száma: ${Array.isArray(data) ? data.length : 'nem tömb'}`);
  } catch (err) {
    console.error(`❌ ${url} — invalid JSON response vagy hiba:`, err.message);
  }
}

async function main() {
  await checkDatabase();
  await checkFetch('http://localhost:3001/api/curriculums');
  await checkFetch('http://localhost:3001/api/helparticles');
  console.log('🔧 Ellenőrzés kész!');
}

main();
