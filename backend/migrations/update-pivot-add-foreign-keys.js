'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('pivot', 'brandId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'brands',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('pivot', 'sellerPortalId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'seller_portals',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Remove old column and indexes
    await queryInterface.removeIndex('pivot', ['brand_name']);
    await queryInterface.removeIndex('pivot', ['brand_name', 'date']);
    await queryInterface.removeColumn('pivot', 'brand_name');

    // Add new indexes
    await queryInterface.addIndex('pivot', ['brandId']);
    await queryInterface.addIndex('pivot', ['sellerPortalId']);
    await queryInterface.addIndex('pivot', ['brandId', 'date']);
    await queryInterface.addIndex('pivot', ['sellerPortalId', 'date']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove new indexes
    await queryInterface.removeIndex('pivot', ['brandId']);
    await queryInterface.removeIndex('pivot', ['sellerPortalId']);
    await queryInterface.removeIndex('pivot', ['brandId', 'date']);
    await queryInterface.removeIndex('pivot', ['sellerPortalId', 'date']);

    // Add back old column
    await queryInterface.addColumn('pivot', 'brand_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Remove new columns
    await queryInterface.removeColumn('pivot', 'sellerPortalId');
    await queryInterface.removeColumn('pivot', 'brandId');

    // Add back old indexes
    await queryInterface.addIndex('pivot', ['brand_name']);
    await queryInterface.addIndex('pivot', ['brand_name', 'date']);
  }
};









