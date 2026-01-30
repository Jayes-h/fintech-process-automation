'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('myntra_working_file', {
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
      invoice_number: { type: Sequelize.STRING },
      debtor_ledger: { type: Sequelize.STRING },
      sku: { type: Sequelize.STRING },
      fg: { type: Sequelize.STRING },
      quantity: { type: Sequelize.INTEGER },
      gst_rate: { type: Sequelize.DECIMAL(6, 3) },
      base_amount: { type: Sequelize.DECIMAL(12, 2) },
      igst_amount: { type: Sequelize.DECIMAL(12, 2) },
      cgst_amount: { type: Sequelize.DECIMAL(12, 2) },
      sgst_amount: { type: Sequelize.DECIMAL(12, 2) },
      invoice_amount: { type: Sequelize.DECIMAL(12, 2) },
      report_type: { type: Sequelize.STRING },
      order_id: { type: Sequelize.STRING },
      item_id: { type: Sequelize.STRING },
      sku_id: { type: Sequelize.STRING },
      packet_id: { type: Sequelize.STRING },
      ship_to_state: { type: Sequelize.STRING },
      ship_to_state_tally_ledger: { type: Sequelize.STRING },
      final_invoice_no: { type: Sequelize.STRING },
      tax_rate: { type: Sequelize.DECIMAL(6, 3) },
      igst_rate: { type: Sequelize.DECIMAL(6, 3) },
      cgst_rate: { type: Sequelize.DECIMAL(6, 3) },
      sgst_rate: { type: Sequelize.DECIMAL(6, 3) },
      order_created_date: { type: Sequelize.DATE },
      order_packed_date: { type: Sequelize.DATE },
      order_shipped_date: { type: Sequelize.DATE },
      order_delivered_date: { type: Sequelize.DATE },
      order_rto_date: { type: Sequelize.DATE },
      warehouse_id: { type: Sequelize.STRING },
      warehouse_name: { type: Sequelize.STRING },
      seller_name: { type: Sequelize.STRING },
      seller_id: { type: Sequelize.STRING },
      brand_name: { type: Sequelize.STRING },
      master_category: { type: Sequelize.STRING },
      article_type: { type: Sequelize.STRING },
      net_amount: { type: Sequelize.DECIMAL(12, 2) },
      shipment_value: { type: Sequelize.DECIMAL(12, 2) },
      base_value: { type: Sequelize.DECIMAL(12, 2) },
      seller_price: { type: Sequelize.DECIMAL(12, 2) },
      platform_charges: { type: Sequelize.DECIMAL(12, 2) },
      shipping_charges: { type: Sequelize.DECIMAL(12, 2) },
      mrp: { type: Sequelize.DECIMAL(12, 2) },
      tcs_amount: { type: Sequelize.DECIMAL(12, 2) },
      tds_amount: { type: Sequelize.DECIMAL(12, 2) },
      tds_rate: { type: Sequelize.DECIMAL(6, 3) },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('myntra_working_file');
  }
};
