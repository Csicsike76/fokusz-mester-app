'use strict';

exports.up = pgm => {
  pgm.addColumns('users', {
    password_reset_token: { type: 'varchar(255)' },
    password_reset_expires: { type: 'timestamp with time zone' },
  });
};

exports.down = pgm => {
  pgm.dropColumns('users', ['password_reset_token', 'password_reset_expires']);
};