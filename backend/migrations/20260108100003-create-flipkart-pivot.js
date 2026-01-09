'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('flipkart_pivot', {
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
      tally_ledgers: { type: Sequelize.STRING },
      final_invoice_no: { type: Sequelize.STRING },
      fg: { type: Sequelize.STRING },
      sum_of_item_quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      sum_of_final_taxable_sales_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_cgst_taxable: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_sgst_taxable: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_igst_taxable: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_shipping_taxable_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_cgst_shipping: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_sgst_shipping: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      sum_of_final_igst_shipping: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('flipkart_pivot');
  }
};


