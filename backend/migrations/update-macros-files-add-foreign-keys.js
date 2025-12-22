'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('macros_files', 'brandId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'brands',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('macros_files', 'sellerPortalId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'seller_portals',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('macros_files', 'brandName', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('macros_files', 'sellerPortalName', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Remove old column and indexes
    await queryInterface.removeIndex('macros_files', ['brand_name']);
    await queryInterface.removeIndex('macros_files', ['brand_name', 'date']);
    await queryInterface.removeColumn('macros_files', 'brand_name');

    // Add new indexes
    await queryInterface.addIndex('macros_files', ['brandId']);
    await queryInterface.addIndex('macros_files', ['sellerPortalId']);
    await queryInterface.addIndex('macros_files', ['brandId', 'date']);
    await queryInterface.addIndex('macros_files', ['sellerPortalId', 'date']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove new indexes
    await queryInterface.removeIndex('macros_files', ['brandId']);
    await queryInterface.removeIndex('macros_files', ['sellerPortalId']);
    await queryInterface.removeIndex('macros_files', ['brandId', 'date']);
    await queryInterface.removeIndex('macros_files', ['sellerPortalId', 'date']);

    // Add back old column
    await queryInterface.addColumn('macros_files', 'brand_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Remove new columns
    await queryInterface.removeColumn('macros_files', 'sellerPortalName');
    await queryInterface.removeColumn('macros_files', 'brandName');
    await queryInterface.removeColumn('macros_files', 'sellerPortalId');
    await queryInterface.removeColumn('macros_files', 'brandId');

    // Add back old indexes
    await queryInterface.addIndex('macros_files', ['brand_name']);
    await queryInterface.addIndex('macros_files', ['brand_name', 'date']);
  }
};

