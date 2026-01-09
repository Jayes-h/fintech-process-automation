'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mis_data', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brand: { type: Sequelize.STRING, allowNull: true },
      agent_id: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.STRING, allowNull: true },
      createdBy: { type: Sequelize.STRING, allowNull: true },
      tb: { type: Sequelize.JSONB, allowNull: true },
      tb_working: { type: Sequelize.JSONB, allowNull: true },
      mis: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mis_data');
  }
};