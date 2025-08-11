/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = pgm => {
  // Parent accounts
  pgm.createTable('parent_accounts', {
    id: 'id',
    email: { type: 'text', unique: true, notNull: true },
    password_hash: { type: 'text', notNull: true },
    full_name: { type: 'text' },
    phone: { type: 'text' },
    is_email_verified: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('parent_accounts', 'email');

  // Parent-child links
  pgm.createTable('parent_child_links', {
    id: 'id',
    parent_id: { type: 'integer', notNull: true, references: 'parent_accounts', onDelete: 'cascade' },
    child_user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'cascade' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('parent_child_links', ['parent_id', 'child_user_id'], { unique: true });
  pgm.createIndex('parent_child_links', 'parent_id');
  pgm.createIndex('parent_child_links', 'child_user_id');
};

exports.down = pgm => {
  pgm.dropTable('parent_child_links');
  pgm.dropTable('parent_accounts');
};
