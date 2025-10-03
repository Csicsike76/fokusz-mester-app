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
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    const tablesToDrop = [
      'student_progress',
      'contact_messages', 'admin_actions', 'error_logs', 'activity_logs',
      'notifications', 'user_quiz_results', 'quizquestions', 'quiz_learning_paths',
      'lessons',
      'curriculums',
      'helparticles', 'classmemberships', 'classes', 'teachers',
      'referral_rewards', 'referrals', 'payments', 'subscriptions', 'subscription_plans', 'users'
    ];
    for (const tbl of tablesToDrop) {
      await client.query(`DROP TABLE IF EXISTS ${tbl} CASCADE;`);
    }

    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        real_name TEXT,
        email VARCHAR(255) UNIQUE NOT NULL,
        parental_email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('student','teacher','admin')),
        provider TEXT DEFAULT 'local',
        provider_id TEXT,
        referral_code VARCHAR(255) UNIQUE,
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMPTZ,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMPTZ,
        is_permanent_free BOOLEAN DEFAULT false,
        active_session_id TEXT,
        avatar_url TEXT,
        xp INT DEFAULT 0 NOT NULL,
        last_seen TIMESTAMPTZ,
        profile_metadata JSONB DEFAULT '{}'::jsonb,
        settings_json JSONB DEFAULT '{}'::jsonb,
        accessibility_settings JSONB DEFAULT '{}'::jsonb,
        preferred_language TEXT DEFAULT 'hu',
        archived BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(provider, provider_id)
      );
    `);

    await client.query(`
      CREATE TABLE teachers (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        is_approved BOOLEAN DEFAULT false,
        vip_code VARCHAR(255),
        verify_token VARCHAR(255),
        subject_specialization TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_name VARCHAR(255) NOT NULL,
        class_code VARCHAR(255) UNIQUE NOT NULL,
        teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
        class_type TEXT NOT NULL DEFAULT 'regular' CHECK (class_type IN ('regular','accessible')),
        max_students INT NOT NULL CHECK (max_students > 0),
        is_active BOOLEAN DEFAULT true,
        is_approved BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE classmemberships (
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, class_id)
      );
    `);

    await client.query(`
      CREATE TABLE student_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        activity_type TEXT NOT NULL CHECK (activity_type IN ('lesson_viewed', 'quiz_completed')),
        lesson_slug TEXT,
        quiz_slug TEXT,
        score_percentage NUMERIC(5,2),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
    
    await client.query(`
      CREATE TABLE referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE referral_rewards (
        id SERIAL PRIMARY KEY,
        referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        milestone_count INTEGER NOT NULL,
        reward_granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (referrer_user_id, milestone_count)
      );
    `);

    await client.query(`
      CREATE TABLE subscription_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        stripe_price_id TEXT UNIQUE,
        price_cents INT NOT NULL CHECK (price_cents >= 0),
        interval_unit TEXT NOT NULL CHECK (interval_unit IN ('day','month','year', 'one_time')),
        interval_count INT NOT NULL CHECK (interval_count > 0),
        trial_days INT DEFAULT 0 CHECK (trial_days >= 0),
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    if (process.env.STRIPE_PRICE_ID_MONTHLY) {
        await client.query(`INSERT INTO subscription_plans (name, stripe_price_id, price_cents, interval_unit, interval_count) VALUES ('Havi Előfizetés', $1, 2990, 'month', 1) ON CONFLICT (stripe_price_id) DO NOTHING;`, [process.env.STRIPE_PRICE_ID_MONTHLY]);
    }
    if (process.env.STRIPE_PRICE_ID_YEARLY) {
        await client.query(`INSERT INTO subscription_plans (name, stripe_price_id, price_cents, interval_unit, interval_count) VALUES ('Éves Előfizetés', $1, 29900, 'year', 1) ON CONFLICT (stripe_price_id) DO NOTHING;`, [process.env.STRIPE_PRICE_ID_YEARLY]);
    }
    if (process.env.STRIPE_PRICE_ID_TEACHER_CLASS) {
        await client.query(`INSERT INTO subscription_plans (name, stripe_price_id, price_cents, interval_unit, interval_count) VALUES ('Tanári Osztály Csomag', $1, 420000, 'one_time', 1) ON CONFLICT (stripe_price_id) DO NOTHING;`, [process.env.STRIPE_PRICE_ID_TEACHER_CLASS]);
    }

    await client.query(`
      CREATE TABLE subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
        status VARCHAR(50) CHECK (status IN ('active','canceled','past_due','trialing')),
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        payment_provider VARCHAR(50),
        invoice_id VARCHAR(255) UNIQUE,
        promo_code VARCHAR(255),
        payment_metadata JSONB DEFAULT '{}'::jsonb,
        promo_applied BOOLEAN DEFAULT false,
        next_billing_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        amount_cents INT NOT NULL CHECK (amount_cents >= 0),
        currency TEXT DEFAULT 'HUF',
        provider TEXT NOT NULL,
        provider_payment_id TEXT,
        status VARCHAR(50) CHECK (status IN ('pending','completed','failed','refunded')),
        payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    await client.query(`
      CREATE TABLE helparticles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE curriculums (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subject TEXT,
        grade INT,
        category TEXT NOT NULL CHECK (category IN ('free_lesson','free_tool','premium_course','workshop','ai','hub_page','premium_lesson', 'premium_tool')),
        description TEXT,
        accessible_settings JSONB DEFAULT '{}'::jsonb,
        translations JSONB DEFAULT '{}'::jsonb,
        archived BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}'::jsonb,
        ai_settings JSONB DEFAULT '{}'::jsonb,
        hub_settings JSONB DEFAULT '{}'::jsonb,
        toc JSONB DEFAULT '{}'::jsonb,
        language_options JSONB DEFAULT '{"default":"hu","available":["hu","ro","de"]}'::jsonb,
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE quizquestions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        curriculum_id UUID REFERENCES curriculums(id) ON DELETE CASCADE,
        question_data JSONB NOT NULL,
        hint TEXT,
        time_limit_seconds INT DEFAULT 0,
        max_attempts INT DEFAULT 0,
        order_num INT DEFAULT 0,
        difficulty_level TEXT CHECK (difficulty_level IN ('easy','medium','hard')), -- VISSZAÁLLÍTVA ANGLOLRA
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

await client.query(`
      CREATE TABLE user_quiz_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        curriculum_id UUID REFERENCES curriculums(id) ON DELETE CASCADE,
        completed_questions INT NOT NULL,
        total_questions INT NOT NULL,
        score_percentage NUMERIC(5,2) DEFAULT 0.0,
        level TEXT CHECK (level IN ('easy','medium','hard')), -- VISSZAÁLLÍTVA ANGLOLRA
        level_score_thresholds JSONB DEFAULT '{"easy":40,"medium":65,"hard":90}'::jsonb, -- VISSZAÁLLÍTVA ANGLOLRA
        hints_used INT DEFAULT 0,
        total_time_seconds INT DEFAULT 0,
        completed_at TIMESTAMPTZ DEFAULT NOW()
        -- AZ EREDETI 'UNIQUE(user_id, curriculum_id, level)' SOR ELTÁVOLÍTVA (marad így)
      );
    `);

    await client.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT CHECK (type IN ('info','warning','error','success','reward')) DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    await client.query(`
      CREATE TABLE contact_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE admin_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action_type TEXT NOT NULL,
        action_details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

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

    // ÚJ TÁBLÁK: lessons és quiz_learning_paths
    await client.query(`
      CREATE TABLE lessons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        content_slug TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE quiz_learning_paths (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        curriculum_id UUID REFERENCES curriculums(id) ON DELETE CASCADE NOT NULL,
        lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
        difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('easy','medium','hard')), -- VISSZAÁLLÍTVA ANGLOLRA
        order_index INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (curriculum_id, lesson_id, difficulty_level)
      );
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    const tablesToTrigger = ['users','teachers','classes','subscription_plans','subscriptions'];
    for (const tbl of tablesToTrigger) {
      if (tbl !== 'curriculums' && tbl !== 'helparticles' && tbl !== 'quizquestions' && tbl !== 'classmemberships' && tbl !== 'notifications' && tbl !== 'user_quiz_results' && tbl !== 'student_progress') { 
          await client.query(`DROP TRIGGER IF EXISTS trg_update_timestamp ON ${tbl}`);
          await client.query(`
            CREATE TRIGGER trg_update_timestamp
            BEFORE UPDATE ON ${tbl}
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_timestamp();
          `);
      }
    }
    // ÚJ TRIGGEREK HOZZÁADVA a lessons és quiz_learning_paths táblákhoz
    await client.query(`DROP TRIGGER IF EXISTS trg_update_timestamp ON lessons`);
    await client.query(`
      CREATE TRIGGER trg_update_timestamp
      BEFORE UPDATE ON lessons
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `);
    await client.query(`DROP TRIGGER IF EXISTS trg_update_timestamp ON quiz_learning_paths`);
    await client.query(`
      CREATE TRIGGER trg_update_timestamp
      BEFORE UPDATE ON quiz_learning_paths
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `);


    console.log('Indexek létrehozása a gyorsabb adatbázis-műveletekhez...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_student_progress_user_id ON student_progress(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_curriculums_slug ON curriculums(slug);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lessons_content_slug ON lessons(content_slug);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_qlp_curriculum_id ON quiz_learning_paths(curriculum_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_qlp_lesson_id ON quiz_learning_paths(lesson_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_quiz_results_user_curriculum_level_completed_at ON user_quiz_results(user_id, curriculum_id, level, completed_at);`);
    console.log('✅ Indexek sikeresen létrehozva.');

    console.log('Példa tanulási útvonal adatok beszúrása...');
    let sampleCurriculumId;
    const sampleCurriculumSlug = 'kviz-muveletek-tortekkel'; // A screenshotodról vettem ezt a slug-ot
    const existingCurriculum = await client.query(`SELECT id FROM curriculums WHERE slug = $1`, [sampleCurriculumSlug]);
    if (existingCurriculum.rows.length > 0) {
        sampleCurriculumId = existingCurriculum.rows[0].id;
        console.log(`Már létező tananyagot használunk a tanulási útvonalakhoz: ${sampleCurriculumId}`);
    } else {
        const newCurriculum = await client.query(`
            INSERT INTO curriculums (slug, title, subject, grade, category, description, is_published)
            VALUES ($1, 'Matek-AI Kalandok: Műveletek Törtekkel', 'matematika', 5, 'premium_course', 'Gyakorold a törtekkel való műveleteket interaktív feladatokkal.', true)
            RETURNING id;
        `, [sampleCurriculumSlug]);
        sampleCurriculumId = newCurriculum.rows[0].id;
        console.log(`Új tananyag jött létre a tanulási útvonalakhoz: ${sampleCurriculumId}`);
    }

    // Példa leckék beszúrása
    const lesson1Result = await client.query(`
        INSERT INTO lessons (title, description, content_slug)
        VALUES ('Törtek fogalma és ábrázolása', 'Ismerkedj meg a törtek alapjaival és a vizuális megjelenítésükkel.', 'tortek-fogalma-abrazolasa')
        ON CONFLICT (content_slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description RETURNING id;
    `);
    const lesson1Id = lesson1Result.rows[0].id;

    const lesson2Result = await client.query(`
        INSERT INTO lessons (title, description, content_slug)
        VALUES ('Törtek összeadása és kivonása', 'Gyakorold a törtek összeadását és kivonását azonos és különböző nevezőkkel.', 'tortek-osszeadas-kivonas')
        ON CONFLICT (content_slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description RETURNING id;
    `);
    const lesson2Id = lesson2Result.rows[0].id;

    const lesson3Result = await client.query(`
        INSERT INTO lessons (title, description, content_slug)
        VALUES ('Törtek szorzása és osztása', 'Tanuld meg a törtek szorzását és osztását egész számokkal és törtekkel.', 'tortek-szorzas-osztas')
        ON CONFLICT (content_slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description RETURNING id;
    `);
    const lesson3Id = lesson3Result.rows[0].id;

    const lesson4Result = await client.query(`
        INSERT INTO lessons (title, description, content_slug)
        VALUES ('Vegyes feladatok törtekkel', 'Oldj meg komplex feladatokat, amelyek többféle törtes műveletet igényelnek.', 'tortek-vegyes-feladatok')
        ON CONFLICT (content_slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description RETURNING id;
    `);
    const lesson4Id = lesson4Result.rows[0].id;
    
    // Leckék hozzárendelése a tananyaghoz nehézségi szintenként
    await client.query(`
        INSERT INTO quiz_learning_paths (curriculum_id, lesson_id, difficulty_level, order_index)
        VALUES
        ($1, $2, 'easy', 1), -- Törtek fogalma és ábrázolása
        ($1, $3, 'medium', 1), -- Törtek összeadása és kivonása
        ($1, $4, 'medium', 2), -- Törtek szorzása és osztása
        ($1, $5, 'hard', 1)  -- Vegyes feladatok törtekkel
        ON CONFLICT (curriculum_id, lesson_id, difficulty_level) DO NOTHING;
    `, [sampleCurriculumId, lesson1Id, lesson2Id, lesson3Id, lesson4Id]);
    console.log('✅ Példa tanulási útvonal adatok beszúrva/frissítve.');
    // --- Példa adatok vége ---


    await client.query('COMMIT');
    console.log('✅ Adatbázis séma sikeresen létrehozva és naprakész.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('HIBA a setup-db szkript futása közben, a változások visszavonva:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();