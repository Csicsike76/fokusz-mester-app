/* 20250811160000_add-parent-panel-tables.js */
exports.shorthands = {};

exports.up = (pgm) => {
  // --- 1) Szülő–diák kapcsolatok a Users táblára építve ---
  pgm.createTable(
    'parent_students',
    {
      id: 'id',
      parent_id: { type: 'integer', notNull: true, references: '"users"', onDelete: 'cascade' },
      student_id: { type: 'integer', notNull: true, references: '"users"', onDelete: 'cascade' },
      is_approved: { type: 'boolean', notNull: true, default: false },
      permission: { type: 'text', notNull: true, default: pgm.func(`'view_only'`) },
      created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    },
    { ifNotExists: true }
  );

  // Egyediség: ugyanaz a parent ugyanazt a diákot csak egyszer
  pgm.addConstraint('parent_students', 'uq_parent_students_parent_student', {
    unique: ['parent_id', 'student_id'],
    ifNotExists: true,
  });

  // Indexek
  pgm.createIndex('parent_students', 'parent_id', { ifNotExists: true, name: 'idx_parent_students_parent' });
  pgm.createIndex('parent_students', 'student_id', { ifNotExists: true, name: 'idx_parent_students_student' });

  // --- 2) Házi feladatok osztályoknak ---
  pgm.createTable(
    'class_homeworks',
    {
      id: 'id',
      class_id: { type: 'integer', notNull: true, references: '"classes"', onDelete: 'cascade' },
      title: { type: 'text', notNull: true },
      description: { type: 'text' },
      due_date: { type: 'timestamp' },
      created_by: { type: 'integer', notNull: true, references: '"users"', onDelete: 'set null' },
      created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    },
    { ifNotExists: true }
  );

  pgm.createIndex('class_homeworks', 'class_id', { ifNotExists: true, name: 'idx_class_homeworks_class' });
  pgm.createIndex('class_homeworks', 'due_date', { ifNotExists: true, name: 'idx_class_homeworks_due_date' });

  // --- 3) SZÁNDÉKOSAN ÚJ NÉV: parent_weekly_reports ---
  // (Azért nem "weekly_reports", mert azt a 20250807090500 már létrehozta, más sémával.)
  pgm.createTable(
    'parent_weekly_reports',
    {
      id: 'id',
      student_id: { type: 'integer', notNull: true, references: '"users"', onDelete: 'cascade' },
      parent_id: { type: 'integer', notNull: true, references: '"users"', onDelete: 'cascade' },
      week_start: { type: 'date', notNull: true },
      week_end: { type: 'date', notNull: true },
      summary: { type: 'text' },
      progress_data: { type: 'jsonb' },
      created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    },
    { ifNotExists: true }
  );

  // Egyediség a (student_id, parent_id, hét) kombinációra
  // IF NOT EXISTS nincs constraints-re natívan, ezért plpgsql blokk:
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_parent_weekly_reports_unique_pair_and_week'
      ) THEN
        ALTER TABLE parent_weekly_reports
          ADD CONSTRAINT uq_parent_weekly_reports_unique_pair_and_week
          UNIQUE (student_id, parent_id, week_start, week_end);
      END IF;
    END$$;
  `);

  pgm.createIndex('parent_weekly_reports', 'student_id', { ifNotExists: true, name: 'idx_parent_weekly_reports_student' });
  pgm.createIndex('parent_weekly_reports', 'parent_id', { ifNotExists: true, name: 'idx_parent_weekly_reports_parent' });
  pgm.createIndex('parent_weekly_reports', ['week_start', 'week_end'], { ifNotExists: true, name: 'idx_parent_weekly_reports_week_range' });
};

exports.down = (pgm) => {
  // Visszagörgetésnél biztonságosan, ha léteznek
  pgm.dropTable('parent_weekly_reports', { ifExists: true });
  pgm.dropIndex('parent_weekly_reports', ['week_start', 'week_end'], { ifExists: true, name: 'idx_parent_weekly_reports_week_range' });
  pgm.dropIndex('parent_weekly_reports', 'parent_id', { ifExists: true, name: 'idx_parent_weekly_reports_parent' });
  pgm.dropIndex('parent_weekly_reports', 'student_id', { ifExists: true, name: 'idx_parent_weekly_reports_student' });

  pgm.dropTable('class_homeworks', { ifExists: true });
  pgm.dropIndex('class_homeworks', 'due_date', { ifExists: true, name: 'idx_class_homeworks_due_date' });
  pgm.dropIndex('class_homeworks', 'class_id', { ifExists: true, name: 'idx_class_homeworks_class' });

  pgm.dropTable('parent_students', { ifExists: true });
  // constraint törlése csak ha létezik
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_parent_students_parent_student'
      ) THEN
        ALTER TABLE parent_students DROP CONSTRAINT uq_parent_students_parent_student;
      END IF;
    END$$;
  `);
  pgm.dropIndex('parent_students', 'student_id', { ifExists: true, name: 'idx_parent_students_student' });
  pgm.dropIndex('parent_students', 'parent_id', { ifExists: true, name: 'idx_parent_students_parent' });
};
