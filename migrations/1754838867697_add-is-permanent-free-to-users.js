'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Itt adjuk hozzá az új 'is_permanent_free' oszlopot a 'Users' táblához.
    await queryInterface.addColumn('Users', 'is_permanent_free', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Ez a rész a migráció visszavonására szolgál, eltávolítja az oszlopot.
    await queryInterface.removeColumn('Users', 'is_permanent_free');
  }
};