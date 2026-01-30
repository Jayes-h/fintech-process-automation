'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('myntra_pivot', {
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
      date: {
        type: Sequelize.STRING,
        allowNull: false
      },
      seller_gstin: { type: Sequelize.STRING(15) },
      month: { type: Sequelize.INTEGER },
      date_column: { type: Sequelize.DATE },
      final_invoice_no: { type: Sequelize.STRING },
      tally_ledgers: { type: Sequelize.STRING },
      fg: { type: Sequelize.STRING },
      sum_of_quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      sum_of_base_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_igst_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_cgst_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_sgst_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_invoice_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('myntra_pivot');
  }
};
