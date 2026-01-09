'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('macros_files', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brandId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'brands',
          key: 'id'
        }
      },
      sellerPortalId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'seller_portals',
          key: 'id'
        }
      },
      brandName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sellerPortalName: {
        type: Sequelize.STRING,
        allowNull: true
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
        defaultValue: 0
      },
      pivot_record_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      fileType: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('macros_files');
  }
};