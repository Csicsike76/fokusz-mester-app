const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const createTablesQuery = `
  -- Először töröljük a táblákat a helyes sorrendben, ha léteznek,
  -- hogy elkerüljük a függőségi hibákat.
  DROP TABLE IF EXISTS ClassMemberships CASCADE;
  DROP TABLE IF EXISTS Teachers CASCADE;
  DROP TABLE IF EXISTS QuizQuestions CASCADE;
  DROP TABLE IF EXISTS Curriculums CASCADE;
  DROP TABLE IF EXISTS Classes CASCADE;
  DROP TABLE IF EXISTS Users CASCADE;

  -- Felhasználói adatok táblái (FRISSÍTVE!)
  CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255), -- ÚJ OSZLOP
    email_verification_expires TIMESTAMP WITH TIME ZONE, -- ÚJ OSZLOP
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
    max_students INTEGER NOT NULL DEFAULT 35, -- ÚJ OSZLOP
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT true, -- Egyelőre a "puha" jóváhagyáshoz true
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
  console.log('Adatbázis táblák törlése és újraépítése...');
  try {
    await pool.query(createTablesQuery);
    console.log('✅ Táblák sikeresen újraépítve.');
  } catch (error) {
    console.error('❌ Hiba történt a táblák újraépítése során:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();