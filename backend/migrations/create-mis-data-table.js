'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mis_data', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: true
      },
      agent_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tb: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      tb_working: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      mis: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add index on brand for faster filtering
    await queryInterface.addIndex('mis_data', ['brand']);
    // Add index on agent_id for faster lookups
    await queryInterface.addIndex('mis_data', ['agent_id']);
    // Add index on createdAt for sorting
    await queryInterface.addIndex('mis_data', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('mis_data');
  }
};














