const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const setupQueries = `
-- 1. LÉPÉS: TÁBLÁK TÖRLÉSE A HELYES FÜGGŐSÉGI SORRENDBEN
-- Először azokat töröljük, amik más táblákra hivatkoznak.
DROP TABLE IF EXISTS ClassMemberships;
DROP TABLE IF EXISTS Teachers;
DROP TABLE IF EXISTS QuizQuestions;
DROP TABLE IF EXISTS Curriculums;
DROP TABLE IF EXISTS Classes;
-- Végül törölhetjük a Users táblát, amire a többiek hivatkoztak.
DROP TABLE IF EXISTS Users;

-- 2. LÉPÉS: TÁBLÁK ÚJRAÉPÍTÉSE A NULLÁRÓL A VÉGLEGES SZERKEZETTEL
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Teachers (
    user_id INTEGER PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
    vip_code VARCHAR(50) UNIQUE,
    is_approved BOOLEAN DEFAULT false
);

CREATE TABLE Classes (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    class_code VARCHAR(50) UNIQUE NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    max_students INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT true,
    discount_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ClassMemberships (
    user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES Classes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, class_id)
);

CREATE TABLE Curriculums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    grade INTEGER NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
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
    answer_regex VARCHAR(255)
);
`;

async function setupDatabase() {
  console.log('Adatbázis táblák teljes törlése és újraépítése...');
  try {
    await pool.query(setupQueries);
    console.log('✅ Táblák sikeresen újraépítve a nulláról.');
  } catch (error) {
    console.error('❌ Hiba történt a táblák újraépítése során:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();