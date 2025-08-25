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

    // A meglévő DROP TABLE parancsokat meghagyjuk a szkript újrafuttathatósága érdekében.
    await client.query(`DROP TABLE IF EXISTS payments CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS notifications CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS admin_actions CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS system_logs CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS user_quiz_results CASCADE;`);
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
    await client.query(`DROP TABLE IF EXISTS error_logs CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS users CASCADE;`);

    console.log('`users` tábla létrehozása...');
    await client.query(`
        CREATE TABLE "users" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "username" varchar(255) NOT NULL,
          "email" varchar(255) UNIQUE NOT NULL,
          "password_hash" varchar(255) NOT NULL,
          "role" varchar(50) DEFAULT 'student' NOT NULL,
          "referral_code" varchar(255) UNIQUE,
          "email_verified" boolean DEFAULT false NOT NULL,
          "email_verification_token" text,
          "email_verification_expires" timestamp,
          "password_reset_token" text,
          "password_reset_expires" timestamp,
          "is_permanent_free" boolean DEFAULT false NOT NULL,
          "last_login_at" timestamp,
          "created_at" timestamp DEFAULT current_timestamp NOT NULL,
          "updated_at" timestamp DEFAULT current_timestamp NOT NULL
      );
    `);

    console.log('`teachers` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        vip_code TEXT,
        is_approved BOOLEAN NOT NULL DEFAULT false,
        subject_specialization TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        category TEXT NOT NULL,
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
        order_num INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quizquestions_curriculum_id ON quizquestions(curriculum_id);`);

    console.log('`user_quiz_results` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_quiz_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
        completed_questions INTEGER NOT NULL DEFAULT 0,
        total_questions INTEGER NOT NULL DEFAULT 0,
        score_percentage NUMERIC(5,2) DEFAULT 0.0,
        completed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, curriculum_id)
      );
    `);

    console.log('`subscription_plans` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
        interval_unit TEXT NOT NULL CHECK (interval_unit IN ('day','month','year')),
        interval_count INTEGER NOT NULL CHECK (interval_count > 0),
        is_active BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('`subscriptions` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT,
        status TEXT,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        canceled_at TIMESTAMPTZ,
        invoice_id TEXT,
        payment_provider TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    // ÚJ TÁBLA: `payments`
    console.log('`payments` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
        currency TEXT NOT NULL DEFAULT 'HUF',
        provider TEXT NOT NULL,
        provider_payment_id TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending','completed','failed','refunded')),
        payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    // ÚJ TÁBLA: `notifications`
    console.log('`notifications` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('info','warning','error','success', 'reward')),
        read BOOLEAN NOT NULL DEFAULT false,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
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

    console.log('`error_logs` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id BIGSERIAL PRIMARY KEY,
        service_name TEXT,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    console.log('`admin_actions` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action_type TEXT NOT NULL,
        action_details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // JAVÍTÁS: Egységesített trigger logika
    console.log('Egységes trigger létrehozása az updated_at mező automatikus frissítésére...');
    
    // 1. Létrehozzuk az EGYETLEN függvényt
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Hozzárendeljük a függvényt az összes releváns táblához
    const tablesToTrigger = ['users', 'teachers', 'classes', 'curriculums', 'helparticles', 'quizquestions', 'subscription_plans', 'subscriptions'];
    for (const tbl of tablesToTrigger) {
      console.log(`Trigger alkalmazása a(z) '${tbl}' táblára...`);
      await client.query(`
        DROP TRIGGER IF EXISTS trg_update_timestamp ON ${tbl};
        CREATE TRIGGER trg_update_timestamp
        BEFORE UPDATE ON ${tbl}
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
      `);
    }
    
    console.log('Extra jövőbiztos mezők és támogatás hozzáadása...');

    // Jövőbiztos ALTER TABLE parancsok
    await client.query(`
      ALTER TABLE curriculums
        ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
    `);

    await client.query(`
      ALTER TABLE quizquestions
        ADD COLUMN IF NOT EXISTS hint TEXT,
        ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS difficulty_level TEXT,
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);

    await client.query(`
      ALTER TABLE user_quiz_results
        ADD COLUMN IF NOT EXISTS level TEXT,
        ADD COLUMN IF NOT EXISTS level_score_thresholds JSONB DEFAULT '{"beginner":40,"intermediate":65,"expert":90}'::jsonb,
        ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_time_seconds INTEGER DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE subscriptions
        ADD COLUMN IF NOT EXISTS promo_code TEXT,
        ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS promo_applied BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_picture TEXT,
        ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS accessibility_settings JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'hu',
        ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS profile_metadata JSONB DEFAULT '{}'::jsonb;
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