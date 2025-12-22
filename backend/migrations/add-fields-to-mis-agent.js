'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mis_agent', 'brand', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('mis_agent', 'createdBy', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('mis_agent', 'savedFormat', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: []
    });

    await queryInterface.addColumn('mis_agent', 'formatBrand', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('mis_agent', 'brand');
    await queryInterface.removeColumn('mis_agent', 'createdBy');
    await queryInterface.removeColumn('mis_agent', 'savedFormat');
    await queryInterface.removeColumn('mis_agent', 'formatBrand');
  }
};



