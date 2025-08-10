'use strict';

exports.up = pgm => {
  // Új 'is_permanent_free' oszlop hozzáadása a 'Users' táblához
  pgm.addColumns('Users', {
    is_permanent_free: { type: 'boolean', default: false, notNull: true },
  });
};

exports.down = pgm => {
  // A migráció visszavonása, eltávolítja az oszlopot
  pgm.dropColumns('Users', ['is_permanent_free']);
};