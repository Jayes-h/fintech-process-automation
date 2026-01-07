'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns to brands table
    await queryInterface.addColumn('brands', 'imageUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('brands', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('brands', 'contactInfo', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    });

    await queryInterface.addColumn('brands', 'settings', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('brands', 'imageUrl');
    await queryInterface.removeColumn('brands', 'description');
    await queryInterface.removeColumn('brands', 'contactInfo');
    await queryInterface.removeColumn('brands', 'settings');
  }
};


