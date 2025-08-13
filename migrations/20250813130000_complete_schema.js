// migrations/20250813120000_initial-schema-and-seed.js

exports.up = pgm => {
    pgm.sql(`
        -- JAVÍTVA: Minden táblanév kisbetűs
        CREATE TABLE users ( id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL, referral_code VARCHAR(50) UNIQUE, email_verified BOOLEAN DEFAULT false, email_verification_token VARCHAR(255), email_verification_expires TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, is_permanent_free BOOLEAN DEFAULT false, password_reset_token VARCHAR(255), password_reset_expires TIMESTAMP WITH TIME ZONE );
        CREATE TABLE teachers ( user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, vip_code VARCHAR(50) UNIQUE, is_approved BOOLEAN DEFAULT false );
        CREATE TABLE classes ( id SERIAL PRIMARY KEY, class_name VARCHAR(255) NOT NULL, class_code VARCHAR(50) UNIQUE NOT NULL, teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, max_students INTEGER NOT NULL DEFAULT 30, is_active BOOLEAN DEFAULT true, is_approved BOOLEAN DEFAULT true, discount_status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, CONSTRAINT max_students_check CHECK (max_students >= 5 AND max_students <= 30) );
        CREATE TABLE classmemberships ( user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE, PRIMARY KEY (user_id, class_id) );
        CREATE TABLE referrals ( id SERIAL PRIMARY KEY, referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, referred_user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE, status VARCHAR(20) DEFAULT 'registered' NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP );
        CREATE TABLE curriculums ( id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, category VARCHAR(50) NOT NULL, subject VARCHAR(50), grade INTEGER, description TEXT, content JSONB, is_published BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP );
        CREATE TABLE quizquestions ( id SERIAL PRIMARY KEY, curriculum_id INTEGER NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE, question_type VARCHAR(50) NOT NULL, description TEXT NOT NULL, options JSONB, answer JSONB, explanation TEXT, answer_regex VARCHAR(255) );
        CREATE TABLE helparticles ( id SERIAL PRIMARY KEY, category VARCHAR(50) NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, keywords VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP );
        CREATE TABLE parent_accounts ( id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT, phone TEXT, is_email_verified BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP NOT NULL DEFAULT NOW() );
        CREATE TABLE parent_child_links ( id SERIAL PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE, child_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMP NOT NULL DEFAULT NOW() );
        CREATE TABLE weekly_reports ( id SERIAL PRIMARY KEY, child_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, week_start DATE NOT NULL, total_study_time_minutes INTEGER NOT NULL DEFAULT 0, strengths TEXT, weaknesses TEXT, recommendations TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW() );
        CREATE TABLE teacher_accounts ( id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT, school_name TEXT, is_email_verified BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP NOT NULL DEFAULT NOW() );
        CREATE TABLE teacher_class_links ( id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES teacher_accounts(id) ON DELETE CASCADE, class_code TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW() );
        CREATE TABLE class_students_links ( id SERIAL PRIMARY KEY, class_code TEXT NOT NULL, student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMP NOT NULL DEFAULT NOW() );
        CREATE TABLE parent_students ( id SERIAL PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, is_approved BOOLEAN NOT NULL DEFAULT false, permission TEXT NOT NULL DEFAULT 'view_only', created_at TIMESTAMP NOT NULL DEFAULT NOW() );
        CREATE TABLE class_homeworks ( id SERIAL PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, due_date TIMESTAMP, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW() );
        CREATE TABLE parent_weekly_reports ( id SERIAL PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, week_start DATE NOT NULL, week_end DATE NOT NULL, summary TEXT, progress_data JSONB, created_at TIMESTAMP NOT NULL DEFAULT NOW() );

        -- Indexek hozzáadása
        CREATE INDEX IF NOT EXISTS users_lower_email_idx ON public.users (LOWER(email));
        CREATE INDEX IF NOT EXISTS users_email_verification_token_idx ON public.users (email_verification_token) WHERE email_verification_token IS NOT NULL;
        CREATE INDEX IF NOT EXISTS users_password_reset_token_idx ON public.users (password_reset_token) WHERE password_reset_token IS NOT NULL;

        -- Alap tananyagok feltöltése
        INSERT INTO curriculums (title, slug, subject, grade, category, description, is_published) VALUES
        ('Törtek és Tizedestörtek','kviz-muveletek-tortekkel','matematika',5,'free_lesson',NULL,true),
        ('Százalékszámítás','kviz-aranyok','matematika',6,'free_lesson',NULL,true),
        ('Természetes számok négyzetének négyzetgyöke','kviz-termeszetes-negyzetgyok','matematika',7,'free_lesson',NULL,true),
        ('Halmazok meghatározása elemeik közös tulajdonságával','kviz-halmazok-meghataroza','matematika',8,'free_lesson',NULL,true),
        ('Halmazállapot-változások','kviz-halmazallapot-valtozasok','fizika',6,'free_lesson',NULL,true),
        ('A fizikában használt matematikai eljárások és modellek','kviz-fizikai-mennyisegek-es-jelensegek','fizika',7,'free_lesson',NULL,true),
        ('Elektromosság alapjai','kviz-elektromossag-alapjai','fizika',8,'free_lesson',NULL,true),
        ('Képalkotás MI-vel','muhely-kepalkotas','ai',NULL,'free_lesson',NULL,true),
        ('Játéktervezés 101','muhely-jatektervezes','ai',NULL,'free_lesson',NULL,true),
        ('A Promptolás Alapjai','muhely-prompt-alapok','ai',NULL,'free_lesson',NULL,true),
        ('Időutazó Csevegő 🕰️','idoutazo-csevego','eszkozok',NULL,'free_tool','Beszélgess a tudomány legnagyobb elméivel!',true),
        ('Jövőkutató Szimulátor 🚀','jovokutato-szimulator','eszkozok',NULL,'free_tool',NULL,true),
        ('Személyes Célkitűző 🎯','celkituzo','eszkozok',NULL,'free_tool',NULL,true),
        ('Tudás Iránytű 🧭','iranytu','eszkozok',NULL,'free_tool',NULL,true),
        ('Teljes Matematika Kurzus','interaktav-matematika-gyljtemany','matematika',NULL,'premium_course',NULL,true),
        ('Teljes Fizika Kurzus','interaktav-fizika-gyljtemany','fizika',NULL,'premium_course',NULL,true),
        ('Teljes Interaktív Mesterséges Intelligencia','interaktav-aimi1-gyljtemany','ai',NULL,'premium_course',NULL,true),
        ('Interaktív Képlet- és Tételtár 📚','kepletgyujtemeny',NULL,NULL,'premium_tool',NULL,true),
        ('A Napi Kihívás 🧠','napi-kihivas',NULL,NULL,'premium_tool',NULL,true),
        ('CSICSIKE Tutor 💡','tutor',NULL,NULL,'premium_tool',NULL,true),
        ('Házifeladat Hős 🦸','hazi-hos',NULL,NULL,'premium_tool',NULL,true),
        ('AI Vita Aréna 🏛️','vita-arena',NULL,NULL,'premium_tool',NULL,true),
        ('AI Vizsga Szimulátor 📝','vizsga-szimulator',NULL,NULL,'premium_tool',NULL,true),
        ('Absztrakt->Konkrét Fordító 🔬','konkretizalo',NULL,NULL,'premium_tool',NULL,true),
        ('Esszé Vázlatoló ✍️','essze-vazlatolo',NULL,NULL,'premium_tool',NULL,true);
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS parent_weekly_reports CASCADE;
        DROP TABLE IF EXISTS class_homeworks CASCADE;
        DROP TABLE IF EXISTS parent_students CASCADE;
        DROP TABLE IF EXISTS class_students_links CASCADE;
        DROP TABLE IF EXISTS teacher_class_links CASCADE;
        DROP TABLE IF EXISTS teacher_accounts CASCADE;
        DROP TABLE IF EXISTS weekly_reports CASCADE;
        DROP TABLE IF EXISTS parent_child_links CASCADE;
        DROP TABLE IF EXISTS parent_accounts CASCADE;
        DROP TABLE IF EXISTS helparticles CASCADE;
        DROP TABLE IF EXISTS quizquestions CASCADE;
        DROP TABLE IF EXISTS curriculums CASCADE;
        DROP TABLE IF EXISTS referrals CASCADE;
        DROP TABLE IF EXISTS classmemberships CASCADE;
        DROP TABLE IF EXISTS classes CASCADE;
        DROP TABLE IF EXISTS teachers CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
    `);
};