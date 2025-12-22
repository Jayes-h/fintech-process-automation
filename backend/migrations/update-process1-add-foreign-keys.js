'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('process_1', 'brandId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'brands',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('process_1', 'sellerPortalId', {
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
    await queryInterface.removeIndex('process_1', ['brand_name']);
    await queryInterface.removeIndex('process_1', ['brand_name', 'date']);
    await queryInterface.removeColumn('process_1', 'brand_name');

    // Add new indexes
    await queryInterface.addIndex('process_1', ['brandId']);
    await queryInterface.addIndex('process_1', ['sellerPortalId']);
    await queryInterface.addIndex('process_1', ['brandId', 'date']);
    await queryInterface.addIndex('process_1', ['sellerPortalId', 'date']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove new indexes
    await queryInterface.removeIndex('process_1', ['brandId']);
    await queryInterface.removeIndex('process_1', ['sellerPortalId']);
    await queryInterface.removeIndex('process_1', ['brandId', 'date']);
    await queryInterface.removeIndex('process_1', ['sellerPortalId', 'date']);

    // Add back old column
    await queryInterface.addColumn('process_1', 'brand_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Remove new columns
    await queryInterface.removeColumn('process_1', 'sellerPortalId');
    await queryInterface.removeColumn('process_1', 'brandId');

    // Add back old indexes
    await queryInterface.addIndex('process_1', ['brand_name']);
    await queryInterface.addIndex('process_1', ['brand_name', 'date']);
  }
};



