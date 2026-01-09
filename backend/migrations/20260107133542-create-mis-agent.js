'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mis_agent', {
      agentId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      parentAgentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'agents', key: 'agentId' }
      },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      brand: { type: Sequelize.STRING, allowNull: true },
      createdBy: { type: Sequelize.STRING, allowNull: true },
      format: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      savedFormat: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      formatBrand: { type: Sequelize.STRING, allowNull: true },
      trialBalance: { type: Sequelize.JSONB, allowNull: true },
      tbWorking: { type: Sequelize.JSONB, allowNull: true },
      mis: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mis_agent');
  }
};