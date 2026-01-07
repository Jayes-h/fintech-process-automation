'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sku', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brandId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'brands',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      salesPortalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'seller_portals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      salesPortalSku: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tallyNewSku: {
        type: Sequelize.STRING,
        allowNull: false
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
    await queryInterface.addIndex('sku', ['brandId']);
    await queryInterface.addIndex('sku', ['salesPortalId']);
    await queryInterface.addIndex('sku', ['brandId', 'salesPortalId']);
    await queryInterface.addIndex('sku', ['salesPortalSku']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sku');
  }
};









