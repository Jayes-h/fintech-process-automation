'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pivot', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brandId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'brands', key: 'id' }
      },
      sellerPortalId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'seller_portals', key: 'id' }
      },
      date: { type: Sequelize.STRING, allowNull: false },
      seller_gstin: { type: Sequelize.STRING },
      final_invoice_no: { type: Sequelize.STRING },
      ship_to_state_tally_ledger: { type: Sequelize.STRING },
      fg: { type: Sequelize.STRING },
      sum_of_quantity: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_taxable_sales_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_cgst_tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_sgst_tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_igst_tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_taxable_shipping_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_shipping_cgst_tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_shipping_sgst_tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_shipping_igst_tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_tcs_cgst_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_tcs_sgst_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_tcs_igst_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_amount_receivable: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pivot');
  }
};