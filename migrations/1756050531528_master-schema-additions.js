/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    console.log(">>>>> Creating MASTER database schema (v2)...");

    // USERS
    pgm.createTable("users", {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        username: { type: "varchar(255)", notNull: true },
        email: { type: "varchar(255)", notNull: true, unique: true },
        password_hash: { type: "varchar(255)", notNull: true },
        role: { type: "varchar(50)", notNull: true, default: "student" },
        referral_code: { type: "varchar(255)", unique: true },
        is_subscribed: { type: 'boolean', notNull: true, default: false },
        subscription_end_date: { type: 'timestamp' },
        email_verified: { type: 'boolean', notNull: true, default: false },
        email_verification_token: { type: 'text' },
        email_verification_expires: { type: 'timestamp' },
        password_reset_token: { type: 'text' },
        password_reset_expires: { type: 'timestamp' },
        profile_picture: { type: "text" },                // jövőbiztos
        last_login_at: { type: "timestamp" },             // jövőbiztos
        settings_json: { type: "jsonb", default: "{}" },  // jövőbiztos
        created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
        updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
    });

    // TEACHERS
    pgm.createTable("teachers", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        user_id: { type: "uuid", references: "users(id)", onDelete: "cascade", notNull: true },
        vip_code: { type: "varchar(100)" },
        approved: { type: "boolean", notNull: true, default: false },
        bio: { type: "text" },                           // jövőbiztos
        subject_specialization: { type: "varchar(255)" } // jövőbiztos
    });

    // CLASSES
    pgm.createTable("classes", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        name: { type: "varchar(255)", notNull: true },
        code: { type: "varchar(50)", notNull: true, unique: true },
        teacher_id: { type: "uuid", references: "teachers(id)", onDelete: "cascade", notNull: true }
    });

    // CLASS MEMBERSHIPS
    pgm.createTable("classmemberships", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        class_id: { type: "uuid", references: "classes(id)", onDelete: "cascade", notNull: true },
        user_id: { type: "uuid", references: "users(id)", onDelete: "cascade", notNull: true }
    });

    // REFERRALS
    pgm.createTable("referrals", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        user_id: { type: "uuid", references: "users(id)", onDelete: "cascade", notNull: true },
        code: { type: "varchar(50)", notNull: true },
        referred_count: { type: "integer", notNull: true, default: 0 }
    });

    // HELP ARTICLES
    pgm.createTable("helparticles", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        slug: { type: "varchar(255)", notNull: true, unique: true },
        title: { type: "varchar(255)", notNull: true },
        content: { type: "text", notNull: true },
        created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
    });

    // CURRICULUMS
    pgm.createTable("curriculums", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        slug: { type: "varchar(255)", notNull: true, unique: true },
        title: { type: "varchar(255)", notNull: true },
        subject: { type: "varchar(50)", notNull: true },
        grade: { type: "integer", notNull: true },
        category: { type: "varchar(50)", notNull: true },
        description: { type: "text" },
        published: { type: "boolean", notNull: true, default: false },       // kompatibilis
        is_published: { type: "boolean", notNull: true, default: false },    // kompatibilis
        metadata: { type: "jsonb", default: "{}" },                          // jövőbiztos
        created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
        updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
    });

    pgm.addConstraint("curriculums", "curriculums_category_check", {
        check: `category IN ('free_lesson','free_tool','premium_course','premium_tool')`
    });

    // QUIZ QUESTIONS
    pgm.createTable("quizquestions", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        curriculum_id: { type: "uuid", references: "curriculums(id)", onDelete: "cascade", notNull: true },
        question: { type: "text", notNull: true },
        answer: { type: "text", notNull: true },
        choices: { type: "jsonb", default: "[]" } // jövőben feleletválasztós kérdésekhez
    });

    // SUBSCRIPTION PLANS
    pgm.createTable("subscription_plans", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        name: { type: "varchar(100)", notNull: true },
        price: { type: "integer", notNull: true },
        duration_days: { type: "integer", notNull: true }
    });

    // SUBSCRIPTIONS
    pgm.createTable("subscriptions", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        user_id: { type: "uuid", references: "users(id)", onDelete: "cascade", notNull: true },
        plan_id: { type: "uuid", references: "subscription_plans(id)", onDelete: "cascade", notNull: true },
        start_date: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
        end_date: { type: "timestamp", notNull: true },
        status: { type: "varchar(50)", notNull: true, default: "active" } // jövőbiztos
    });

    // ACTIVITY LOGS
    pgm.createTable("activity_logs", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        user_id: { type: "uuid", references: "users(id)", onDelete: "cascade" },
        action: { type: "varchar(255)", notNull: true },
        created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
    });

    // SYSTEM LOGS (általános naplózásra)
    pgm.createTable("system_logs", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        level: { type: "varchar(50)", notNull: true }, // info, warn, error
        message: { type: "text", notNull: true },
        created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
    });
};

exports.down = pgm => {
    pgm.dropTable("system_logs");
    pgm.dropTable("activity_logs");
    pgm.dropTable("subscriptions");
    pgm.dropTable("subscription_plans");
    pgm.dropTable("quizquestions");
    pgm.dropTable("curriculums");
    pgm.dropTable("helparticles");
    pgm.dropTable("referrals");
    pgm.dropTable("classmemberships");
    pgm.dropTable("classes");
    pgm.dropTable("teachers");
    pgm.dropTable("users");
};
