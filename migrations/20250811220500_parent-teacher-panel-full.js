/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
  // Weekly reports
  pgm.createTable('weekly_reports', {
    id: 'id',
    child_user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'cascade' },
    week_start: { type: 'date', notNull: true },
    total_study_time_minutes: { type: 'integer', notNull: true, default: 0 },
    strengths: { type: 'text' },
    weaknesses: { type: 'text' },
    recommendations: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('weekly_reports', ['child_user_id', 'week_start'], { unique: true });

  // Teacher accounts
  pgm.createTable('teacher_accounts', {
    id: 'id',
    email: { type: 'text', unique: true, notNull: true },
    password_hash: { type: 'text', notNull: true },
    full_name: { type: 'text' },
    school_name: { type: 'text' },
    is_email_verified: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('teacher_accounts', 'email');

  // Teacher class links
  pgm.createTable('teacher_class_links', {
    id: 'id',
    teacher_id: { type: 'integer', notNull: true, references: 'teacher_accounts', onDelete: 'cascade' },
    class_code: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('teacher_class_links', ['teacher_id', 'class_code'], { unique: true });

  // Class students links
  pgm.createTable('class_students_links', {
    id: 'id',
    class_code: { type: 'text', notNull: true },
    student_user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'cascade' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('class_students_links', ['class_code', 'student_user_id'], { unique: true });
};

exports.down = pgm => {
  pgm.dropTable('class_students_links');
  pgm.dropTable('teacher_class_links');
  pgm.dropTable('teacher_accounts');
  pgm.dropTable('weekly_reports');
};
