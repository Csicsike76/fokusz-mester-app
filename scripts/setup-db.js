require('dotenv').config();
const { Pool } = require('pg');

function wantSSL(url) {
  if (!url) return false;
  const sslEnv = String(process.env.DB_SSL || '').toLowerCase();
  if (sslEnv === 'true' || sslEnv === '1') return true;
  if (sslEnv === 'false' || sslEnv === '0') return false;
  if (/\b(render\.com|railway\.app|neon\.tech|supabase\.co|heroku|aws|azure|gcp)\b/i.test(url)) return true;
  return false;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || typeof DATABASE_URL !== 'string' || DATABASE_URL.trim() === '') {
  console.error('HIBA: A DATABASE_URL környezeti változó hiányzik vagy üres a .env fájlból.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: wantSSL(DATABASE_URL) ? { rejectUnauthorized: false } : false,
  application_name: 'setup-db',
});

async function run() {
  const client = await pool.connect();
  console.log('Adatbázis-kapcsolat sikeres. Séma beállítása indul...');
  try {
    await client.query('BEGIN');

    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // A táblák törlése a helyes sorrendben a függőségek miatt, ha teljes reset a cél
    await client.query(`DROP TABLE IF EXISTS quizquestions CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS curriculums CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS helparticles CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS classmemberships CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS classes CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS teachers CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS referrals CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS subscriptions CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS subscription_plans CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS activity_logs CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS users CASCADE;`);


    console.log('`users` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('student','teacher','admin')),
        referral_code TEXT,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token TEXT,
        email_verification_expires TIMESTAMPTZ,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMPTZ,
        is_permanent_free BOOLEAN NOT NULL DEFAULT false,
        special_pending BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('`teachers` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        vip_code TEXT,
        is_approved BOOLEAN NOT NULL DEFAULT false
      );
    `);

    console.log('`classes` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_name TEXT NOT NULL,
        class_code TEXT NOT NULL UNIQUE,
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        max_students INTEGER NOT NULL CHECK (max_students > 0),
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_approved BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('`classmemberships` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS classmemberships (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, class_id)
      );
    `);

    console.log('`referrals` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (referrer_user_id, referred_user_id)
      );
    `);

    console.log('`helparticles` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS helparticles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_helparticles_category ON helparticles(category);`);


    console.log('`curriculums` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS curriculums (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        subject TEXT,
        grade INTEGER,
        category TEXT NOT NULL CHECK (category IN ('free_lesson','free_tool','premium_course','premium_tool')),
        description TEXT,
        is_published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_curriculums_pub_cat_sub_grade ON curriculums(is_published, category, subject, grade);`);
    
    console.log('`quizquestions` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS quizquestions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
        question_data JSONB NOT NULL,
        order_num INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quizquestions_curriculum_id ON quizquestions(curriculum_id);`);


    console.log('`subscription_plans` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
        interval_unit TEXT NOT NULL CHECK (interval_unit IN ('day','month','year')),
        interval_count INTEGER NOT NULL CHECK (interval_count > 0),
        trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
        is_active BOOLEAN NOT NULL DEFAULT true
      );
    `);

    const plansCountRes = await client.query(`SELECT COUNT(*) as c FROM subscription_plans;`);
    if (Number(plansCountRes.rows[0].c) === 0) {
      console.log('Alapértelmezett előfizetési csomagok feltöltése...');
      await client.query(`
        INSERT INTO subscription_plans (name, price_cents, interval_unit, interval_count, trial_days, is_active)
        VALUES
          ('Ingyenes próba', 0, 'day', 30, 0, true),
          ('Alap havidíj', 1990, 'month', 1, 7, true),
          ('Tanári csomag', 4990, 'month', 1, 7, true);
      `);
    }

    console.log('`subscriptions` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('active','canceled','past_due','trialing')),
        current_period_start TIMESTAMPTZ NOT NULL,
        current_period_end TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        canceled_at TIMESTAMPTZ
      );
    `);

    console.log('`activity_logs` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        activity_type TEXT NOT NULL,
        ip_address INET,
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Triggerek és függvények létrehozása...');
    await client.query(`
      CREATE OR REPLACE FUNCTION users_after_insert_special_free() RETURNS trigger AS $f$
      BEGIN
        IF NEW.is_permanent_free THEN
          UPDATE users
             SET email_verified = true,
                 email_verification_token = NULL,
                 email_verification_expires = NULL
           WHERE id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $f$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_users_after_insert_special_free ON users;
      CREATE TRIGGER trg_users_after_insert_special_free
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION users_after_insert_special_free();
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION teachers_before_insert_autoadopt() RETURNS trigger AS $f$
      DECLARE
        perm_free BOOLEAN;
      BEGIN
        SELECT is_permanent_free INTO perm_free FROM users WHERE id = NEW.user_id;
        IF perm_free IS TRUE THEN
          NEW.is_approved := true;
        END IF;
        RETURN NEW;
      END;
      $f$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_teachers_before_insert_autoadopt ON teachers;
      CREATE TRIGGER trg_teachers_before_insert_autoadopt
      BEFORE INSERT ON teachers
      FOR EACH ROW
      EXECUTE FUNCTION teachers_before_insert_autoadopt();
    `);

    await client.query('COMMIT');
    console.log('✅ Adatbázis séma beállítása sikeresen befejeződött.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('HIBA a setup-db szkript futása közben, a változások visszavonva:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();