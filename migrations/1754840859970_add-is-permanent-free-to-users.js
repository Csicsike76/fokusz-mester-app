 'use strict';

    exports.up = pgm => {
      // Új 'is_permanent_free' oszlop hozzáadása a 'users' táblához
      pgm.addColumns('users', {
        is_permanent_free: { type: 'boolean', default: false, notNull: true },
      });
    };

    exports.down = pgm => {
      // A migráció visszavonása, eltávolítja az oszlopot
      pgm.dropColumns('users', ['is_permanent_free']);
    };