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

    // DROP TABLE minden táblára a nulláról futtathatóság miatt
    const tables = [
      'payments','notifications','admin_actions','system_logs','user_quiz_results',
      'quizquestions','curriculums','helparticles','classmemberships','classes',
      'teachers','referrals','subscriptions','subscription_plans','activity_logs','error_logs','users'
    ];
    for (const tbl of tables) {
      await client.query(`DROP TABLE IF EXISTS ${tbl} CASCADE;`);
    }

    // --- Users tábla ---
    console.log('`users` tábla létrehozása...');
    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
        referral_code TEXT UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token TEXT,
        email_verification_expires TIMESTAMPTZ,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMPTZ,
        is_permanent_free BOOLEAN NOT NULL DEFAULT false,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        profile_picture TEXT,
        settings_json JSONB DEFAULT '{}'::jsonb,
        accessibility_settings JSONB DEFAULT '{}'::jsonb,
        preferred_language TEXT DEFAULT 'hu',
        archived BOOLEAN DEFAULT false,
        profile_metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    // --- Teachers tábla ---
    console.log('`teachers` tábla létrehozása...');
    await client.query(`
      CREATE TABLE teachers (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        vip_code TEXT,
        is_approved BOOLEAN NOT NULL DEFAULT false,
        subject_specialization TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // --- Classes tábla ---
    console.log('`classes` tábla létrehozása...');
    await client.query(`
      CREATE TABLE classes (
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

    // --- Classmemberships tábla ---
    console.log('`classmemberships` tábla létrehozása...');
    await client.query(`
      CREATE TABLE classmemberships (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, class_id)
      );
    `);

    // --- Referrals ---
    console.log('`referrals` tábla létrehozása...');
    await client.query(`
      CREATE TABLE referrals (
        referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (referrer_user_id, referred_user_id)
      );
    `);

    // --- Helparticles ---
    console.log('`helparticles` tábla létrehozása...');
    await client.query(`
      CREATE TABLE helparticles (
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

    // --- Curriculums ---
    console.log('`curriculums` tábla létrehozása...');
    await client.query(`
      CREATE TABLE curriculums (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        subject TEXT,
        grade INTEGER,
        category TEXT NOT NULL CHECK (category IN ('free_lesson','free_tool','premium_course','premium_tool','workshop','hub_page','premium_lesson')),
        description TEXT,
        accessible_settings JSONB DEFAULT '{}'::jsonb,
        translations JSONB DEFAULT '{}'::jsonb,
        archived BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB DEFAULT '{}'::jsonb,
        ai_settings JSONB DEFAULT '{}'::jsonb,
        hub_settings JSONB DEFAULT '{}'::jsonb,
        toc JSONB DEFAULT '{}'::jsonb,
        language_options JSONB DEFAULT '{"default":"hu","available":["hu","ro","de"]}'::jsonb,
        is_published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_curriculums_pub_cat_sub_grade ON curriculums(is_published, category, subject, grade);`);

    // --- Quizquestions ---
    console.log('`quizquestions` tábla létrehozása...');
    await client.query(`
      CREATE TABLE quizquestions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
        question_data JSONB NOT NULL,
        hint TEXT,
        time_limit_seconds INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 0,
        order_num INTEGER DEFAULT 0,
        difficulty_level TEXT CHECK (difficulty_level IN ('beginner','intermediate','expert')),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quizquestions_curriculum_id ON quizquestions(curriculum_id);`);

    // --- User_quiz_results ---
    console.log('`user_quiz_results` tábla létrehozása...');
    await client.query(`
      CREATE TABLE user_quiz_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
        completed_questions INTEGER NOT NULL DEFAULT 0,
        total_questions INTEGER NOT NULL DEFAULT 0,
        score_percentage NUMERIC(5,2) DEFAULT 0.0,
        level TEXT CHECK (level IN ('beginner','intermediate','expert')),
        level_score_thresholds JSONB DEFAULT '{"beginner":40,"intermediate":65,"expert":90}'::jsonb,
        hints_used INTEGER DEFAULT 0,
        total_time_seconds INTEGER DEFAULT 0,
        completed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, curriculum_id)
      );
    `);

    // --- Subscription plans ---
    console.log('`subscription_plans` tábla létrehozása...');
    await client.query(`
      CREATE TABLE subscription_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
        interval_unit TEXT NOT NULL CHECK (interval_unit IN ('day','month','year')),
        interval_count INTEGER NOT NULL CHECK (interval_count > 0),
        trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
        is_active BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // --- Subscriptions ---
    console.log('`subscriptions` tábla létrehozása...');
    await client.query(`
      CREATE TABLE subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        status TEXT CHECK (status IN ('active','canceled','past_due','trialing')),
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        canceled_at TIMESTAMPTZ,
        promo_code TEXT,
        payment_metadata JSONB DEFAULT '{}'::jsonb,
        promo_applied BOOLEAN DEFAULT false,
        next_billing_date TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // --- Payments ---
    console.log('`payments` tábla létrehozása...');
    await client.query(`
      CREATE TABLE payments (
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

    // --- Notifications ---
    console.log('`notifications` tábla létrehozása...');
    await client.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('info','warning','error','success','reward')),
        read BOOLEAN NOT NULL DEFAULT false,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    // --- Activity logs ---
    console.log('`activity_logs` tábla létrehozása...');
    await client.query(`
      CREATE TABLE activity_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        activity_type TEXT NOT NULL,
        ip_address INET,
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // --- Error logs ---
    console.log('`error_logs` tábla létrehozása...');
    await client.query(`
      CREATE TABLE error_logs (
        id BIGSERIAL PRIMARY KEY,
        service_name TEXT,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    // --- Admin actions ---
    console.log('`admin_actions` tábla létrehozása...');
    await client.query(`
      CREATE TABLE admin_actions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action_type TEXT NOT NULL,
        action_details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // --- Trigger az updated_at automatikus frissítésére ---
    console.log('Trigger létrehozása az updated_at mező automatikus frissítésére...');
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    const triggerTables = [
      'users','teachers','classes','curriculums','helparticles',
      'quizquestions','subscription_plans','subscriptions'
    ];
    for (const tbl of triggerTables) {
      await client.query(`
        DROP TRIGGER IF EXISTS trg_update_timestamp ON ${tbl};
        CREATE TRIGGER trg_update_timestamp
        BEFORE UPDATE ON ${tbl}
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
      `);
    }

    await client.query('COMMIT');
    console.log('✅ Adatbázis séma sikeresen létrehozva, minden mező és trigger naprakész.');
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
