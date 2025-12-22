'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('macros_files', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brand_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      date: {
        type: Sequelize.STRING,
        allowNull: false
      },
      process1_file_path: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pivot_file_path: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      process1_record_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      pivot_record_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
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

    // Add indexes
    await queryInterface.addIndex('macros_files', ['brand_name']);
    await queryInterface.addIndex('macros_files', ['date']);
    await queryInterface.addIndex('macros_files', ['brand_name', 'date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('macros_files');
  }
};



