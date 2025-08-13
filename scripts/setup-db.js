// scripts/setup-db.js

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const setupQueries = `
-- A biztonság kedvéért a törlés a helyes sorrendben történik
DROP TABLE IF EXISTS helparticles CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS classmemberships CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS quizquestions CASCADE;
DROP TABLE IF EXISTS curriculums CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- A VÉGLEGES, MINDEN SZÜKSÉGES OSZLOPOT TARTALMAZÓ USERS TÁBLA
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    referral_code VARCHAR(50) UNIQUE,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    is_permanent_free BOOLEAN DEFAULT false, -- << KIEGÉSZÍTVE
    password_reset_token VARCHAR(255),       -- << KIEGÉSZÍTVE
    password_reset_expires TIMESTAMP WITH TIME ZONE, -- << KIEGÉSZÍTVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teachers (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    vip_code VARCHAR(50) UNIQUE,
    is_approved BOOLEAN DEFAULT false
);

CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    class_code VARCHAR(50) UNIQUE NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_students INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT true,
    discount_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT max_students_check CHECK (max_students >= 5 AND max_students <= 30)
);

CREATE TABLE classmemberships (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, class_id)
);

CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE curriculums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(50), -- notNull eltávolítva a migráció alapján
    grade INTEGER,       -- notNull eltávolítva a migráció alapján
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    content JSONB,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quizquestions (
    id SERIAL PRIMARY KEY,
    curriculum_id INTEGER NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
    question_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    options JSONB,
    answer JSONB,
    explanation TEXT,
    answer_regex VARCHAR(255)
);

CREATE TABLE helparticles (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function setupDatabase() {
  console.log('Adatbázis táblák teljes törlése és újraépítése a VÉGLEGES sémával...');
  const client = await pool.connect();
  try {
    await client.query(setupQueries);
    console.log('✅ Végleges táblák sikeresen újraépítve a nulláról.');
  } catch (error) {
    console.error('❌ Hiba történt a táblák újraépítése során:', error);
  } finally {
    client.release();
    await pool.end();
  }
}
setupDatabase();