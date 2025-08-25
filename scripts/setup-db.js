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
    "is_subscribed" boolean DEFAULT false NOT NULL,
    "subscription_end_date" timestamp,
    "email_verified" boolean DEFAULT false NOT NULL,
    "email_verification_token" text,
    "email_verification_expires" timestamp,
    "password_reset_token" text,
    "password_reset_expires" timestamp,
    "is_permanent_free" boolean DEFAULT false NOT NULL,
    "profile_picture" text,
    "last_login_at" timestamp,
    "settings_json" jsonb DEFAULT '{}',
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
        subject_specialization TEXT
      );
    `);

    console.log('`classes` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_name TEXT NOT NULL,
        class_code TEXT NOT NULL UNIQUE,
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_type TEXT NOT NULL DEFAULT 'regular' CHECK (class_type IN ('regular','accessible')),
        max_students INTEGER NOT NULL CHECK (max_students > 0),
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_approved BOOLEAN NOT NULL DEFAULT true,
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

    // Folytatom a következő üzenetben a helparticles, curriculums, quizquestions, subscriptions részekkel
         console.log('`helparticles` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS helparticles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        translations JSONB DEFAULT '{}'::jsonb,
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
        category TEXT NOT NULL CHECK (category IN (
          'free_lesson','free_tool','premium_course','premium_tool',
          'workshop','hub_page','premium_lesson'
        )),
        description TEXT,
        accessible_settings JSONB DEFAULT '{}'::jsonb,
        translations JSONB DEFAULT '{}'::jsonb,
        archived BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB DEFAULT '{}'::jsonb,
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
        hint TEXT,
        time_limit_seconds INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 0,
        order_num INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        level TEXT CHECK (level IN ('beginner','intermediate','expert')),
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
        canceled_at TIMESTAMPTZ,
        promo_code TEXT,
        invoice_id TEXT,
        payment_provider TEXT
      );
    `);
    

        console.log('`payments` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
        currency TEXT NOT NULL DEFAULT 'HUF',
        provider TEXT NOT NULL,
        provider_payment_id TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending','completed','failed','refunded')),
        payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    console.log('`notifications` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('info','warning','error','success')),
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

    console.log('`system_logs` tábla létrehozása...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id BIGSERIAL PRIMARY KEY,
        level TEXT NOT NULL CHECK (level IN ('info','warn','error')),
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

    console.log('Triggerek létrehozása az updated_at mező automatikus frissítésére...');
    const tablesToUpdate = ['users','teachers','classes','curriculums','quizquestions','helparticles','subscriptions','subscription_plans'];
    for (const tbl of tablesToUpdate) {
      await client.query(`
        CREATE OR REPLACE FUNCTION ${tbl}_update_timestamp() RETURNS trigger AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      await client.query(`
        DROP TRIGGER IF EXISTS trg_${tbl}_update_timestamp ON ${tbl};
        CREATE TRIGGER trg_${tbl}_update_timestamp
        BEFORE UPDATE ON ${tbl}
        FOR EACH ROW
        EXECUTE FUNCTION ${tbl}_update_timestamp();
      `);
    }

    console.log('✅ A Payments, Notifications, Logs és Trigger részek kész.');

        console.log('Extra jövőbiztos mezők és multi-language támogatás hozzáadása...');

    // Curriculums: extra JSONB mezők a jövőre
    await client.query(`
      ALTER TABLE curriculums
        ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS hub_settings JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS toc JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS language_options JSONB DEFAULT '{"default":"hu","available":["hu","ro","de"]}'::jsonb;
    `);

    // Quiz Questions: szintezés, hint, metadata
    await client.query(`
      ALTER TABLE quizquestions
        ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner','intermediate','expert')),
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);

    // User Quiz Results: szintek, szintezés logika
    await client.query(`
      ALTER TABLE user_quiz_results
        ADD COLUMN IF NOT EXISTS level_score_thresholds JSONB DEFAULT '{"beginner":40,"intermediate":65,"expert":90}'::jsonb,
        ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_time_seconds INTEGER DEFAULT 0;
    `);

    // Subscriptions: jövőbiztos extra fizetési mezők
    await client.query(`
      ALTER TABLE subscriptions
        ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS promo_applied BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;
    `);

    // Users: extra accessibility és profil beállítások
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS accessibility_settings JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'hu',
        ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS profile_metadata JSONB DEFAULT '{}'::jsonb;
    `);
    // (A teljes kódot a korábbi 1-4 részekből összevontuk ide)

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