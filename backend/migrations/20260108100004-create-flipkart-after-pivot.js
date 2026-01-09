'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('flipkart_after_pivot', {
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
      invoice_no: { type: Sequelize.STRING },
      fg: { type: Sequelize.STRING },
      quantity: { type: Sequelize.INTEGER },
      rate: { type: Sequelize.DECIMAL(12, 2) },
      taxable_sales_value: { type: Sequelize.DECIMAL(12, 2) },
      cgst_sales_amount: { type: Sequelize.DECIMAL(12, 2) },
      sgst_sales_amount: { type: Sequelize.DECIMAL(12, 2) },
      igst_sales_amount: { type: Sequelize.DECIMAL(12, 2) },
      shipping_taxable_value: { type: Sequelize.DECIMAL(12, 2) },
      cgst_shipping_amount: { type: Sequelize.DECIMAL(12, 2) },
      sgst_shipping_amount: { type: Sequelize.DECIMAL(12, 2) },
      igst_shipping_amount: { type: Sequelize.DECIMAL(12, 2) },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('flipkart_after_pivot');
  }
};


