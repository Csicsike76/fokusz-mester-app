/* eslint-disable camelcase */

exports.up = pgm => {
  // Felhasználók
  pgm.createTable("users", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    email: { type: "varchar(255)", notNull: true, unique: true },
    password_hash: { type: "varchar(255)", notNull: true },
    role: { type: "varchar(50)", notNull: true, default: "student" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
  });

  // Tanárok
  pgm.createTable("teachers", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    user_id: { type: "uuid", references: "users(id)", onDelete: "cascade", notNull: true },
    vip_code: { type: "varchar(100)" },
    approved: { type: "boolean", notNull: true, default: false }
  });

  // Osztályok
  pgm.createTable("classes", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    name: { type: "varchar(255)", notNull: true },
    code: { type: "varchar(50)", notNull: true, unique: true },
    teacher_id: { type: "uuid", references: "teachers(id)", onDelete: "cascade", notNull: true }
  });

  // Osztálytagságok
  pgm.createTable("classmemberships", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    class_id: { type: "uuid", references: "classes(id)", onDelete: "cascade", notNull: true },
    user_id: { type: "uuid", references: "users(id)", onDelete: "cascade", notNull: true }
  });

  // Ajánlások
  pgm.createTable("referrals", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    user_id: { type: "uuid", references: "users(id)", onDelete: "cascade", notNull: true },
    code: { type: "varchar(50)", notNull: true },
    referred_count: { type: "integer", notNull: true, default: 0 }
  });

  // Súgócikkek
  pgm.createTable("helparticles", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    slug: { type: "varchar(255)", notNull: true, unique: true },
    title: { type: "varchar(255)", notNull: true },
    content: { type: "text", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
  });

  // Tananyagok
  pgm.createTable("curriculums", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    slug: { type: "varchar(255)", notNull: true, unique: true },
    title: { type: "varchar(255)", notNull: true },
    subject: { type: "varchar(50)", notNull: true },
    grade: { type: "integer", notNull: true },
    category: { type: "varchar(50)", notNull: true }, // lesson, practice, exam, (később premium_lesson)
    description: { type: "text" },
    published: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
  });

  pgm.addConstraint("curriculums", "curriculums_category_check", {
    check: "category IN ('lesson', 'practice', 'exam')"
  });

  // Kvízkérdések
  pgm.createTable("quizquestions", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    curriculum_id: { type: "uuid", references: "curriculums(id)", onDelete: "cascade", notNull: true },
    question: { type: "text", notNull: true },
    answer: { type: "text", notNull: true }
  });

  // Előfizetési csomagok
  pgm.createTable("subscription_plans", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    name: { type: "varchar(100)", notNull: true },
    price: { type: "integer", notNull: true },
    duration_days: { type: "integer", notNull: true }
  });

  // Előfizetések
  pgm.createTable("subscriptions", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    user_id: { type: "uuid", references: "users(id)", onDelete: "cascade", notNull: true },
    plan_id: { type: "uuid", references: "subscription_plans(id)", onDelete: "cascade", notNull: true },
    start_date: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    end_date: { type: "timestamp", notNull: true }
  });

  // Aktivitásnapló
  pgm.createTable("activity_logs", {
    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    user_id: { type: "uuid", references: "users(id)", onDelete: "cascade" },
    action: { type: "varchar(255)", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
  });
};

exports.down = pgm => {
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
