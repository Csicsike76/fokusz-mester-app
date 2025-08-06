const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const createTablesQuery = `
  -- Felhasználói adatok táblái
  CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Teachers (
    user_id INTEGER PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
    vip_code VARCHAR(50) UNIQUE,
    is_approved BOOLEAN DEFAULT false
  );
  
  CREATE TABLE IF NOT EXISTS Classes (
    id SERIAL PRIMARY KEY,
    class_code VARCHAR(50) UNIQUE NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES Users(id),
    is_active BOOLEAN DEFAULT true,
    discount_status VARCHAR(20) DEFAULT 'pending' CHECK (discount_status IN ('pending', 'active')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ClassMemberships (
    user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES Classes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, class_id)
  );

  -- Tananyag adatok táblái
  CREATE TABLE IF NOT EXISTS Curriculums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    grade INTEGER NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS QuizQuestions (
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
  console.log('Adatbázis táblák létrehozásának megkezdése...');
  try {
    await pool.query(createTablesQuery);
    console.log('✅ Táblák sikeresen létrehozva (vagy már léteztek).');
  } catch (error) {
    console.error('❌ Hiba történt a táblák létrehozása során:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();