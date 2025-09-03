const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sslRequired = (() => {
  const flag = String(process.env.DB_SSL || '').toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;

  const url = String(process.env.DATABASE_URL || '');
  if (/render\.com|heroku(app)?\.com|amazonaws\.com|azure|gcp|railway\.app/i.test(url)) return true;
  if (/localhost|127\.0\.0\.1/.test(url) || url === '') return false;

  return true;
})();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl: sslRequired ? { rejectUnauthorized: false } : false,
});

module.exports = pool;