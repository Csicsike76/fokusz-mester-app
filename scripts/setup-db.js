
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const setupQueries = `
DROP TABLE IF EXISTS Referrals CASCADE;
DROP TABLE IF EXISTS ClassMemberships CASCADE;
DROP TABLE IF EXISTS Teachers CASCADE;
DROP TABLE IF EXISTS QuizQuestions CASCADE;
DROP TABLE IF EXISTS Curriculums CASCADE;
DROP TABLE IF EXISTS Classes CASCADE;
DROP TABLE IF EXISTS Users CASCADE;

CREATE TABLE Users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  referral_code VARCHAR(50) UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Teachers (
  user_id INTEGER PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
  vip_code VARCHAR(50),
  is_approved BOOLEAN DEFAULT false
);

CREATE TABLE Classes (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(255) NOT NULL,
  class_code VARCHAR(50) UNIQUE NOT NULL,
  teacher_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
  creator_user_id INTEGER REFERENCES Users(id) ON DELETE SET NULL,
  max_students INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT true,
  discount_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT max_students_check CHECK (max_students >= 5 AND max_students <= 30)
);

CREATE TABLE ClassMemberships (
  user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES Classes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, class_id)
);

CREATE TABLE Referrals (
  id SERIAL PRIMARY KEY,
  referrer_user_id INTEGER REFERENCES Users(id) ON DELETE SET NULL,
  referred_user_id INTEGER UNIQUE NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'registered' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Curriculums (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  content JSONB,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE QuizQuestions (
  id SERIAL PRIMARY KEY,
  curriculum_id INTEGER NOT NULL REFERENCES Curriculums(id) ON DELETE CASCADE,
  question_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  options JSONB,
  answer JSONB,
  explanation TEXT,
  answer_regex VARCHAR(255)
);
`;

async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('Adatbázis táblák teljes törlése és újraépítése...');
    await client.query(setupQueries);
    console.log('✅ Táblák sikeresen újraépítve a nulláról.');
  } catch (error) {
    console.error('❌ Hiba történt a táblák újraépítése során:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
