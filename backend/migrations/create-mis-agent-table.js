'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mis_agent', {
      agentId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      parentAgentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'agents',
          key: 'agentId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      format: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      trialBalance: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      tbWorking: {
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('mis_agent');
  }
};



