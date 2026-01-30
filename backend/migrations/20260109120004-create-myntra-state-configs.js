'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('myntra_state_configs', {
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
        onDelete: 'CASCADE'
      },
      sellerPortalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'seller_portals',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      configData: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
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

    await queryInterface.addIndex('myntra_state_configs', ['brandId', 'sellerPortalId'], {
      unique: true,
      name: 'myntra_state_configs_brandId_sellerPortalId_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('myntra_state_configs');
  }
};
