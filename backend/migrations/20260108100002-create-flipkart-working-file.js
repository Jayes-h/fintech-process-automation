'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('flipkart_working_file', {
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
      seller_state: { type: Sequelize.STRING },
      order_id: { type: Sequelize.STRING },
      order_item_id: { type: Sequelize.STRING },
      product_title: { type: Sequelize.TEXT },
      fsn: { type: Sequelize.STRING },
      sku: { type: Sequelize.STRING },
      fg: { type: Sequelize.STRING },
      hsn_code: { type: Sequelize.STRING(10) },
      event_type: { type: Sequelize.STRING },
      event_sub_type: { type: Sequelize.STRING },
      order_type: { type: Sequelize.STRING },
      fulfilment_type: { type: Sequelize.STRING },
      order_date: { type: Sequelize.STRING },
      order_approval_date: { type: Sequelize.STRING },
      item_quantity: { type: Sequelize.INTEGER },
      order_shipped_from_state: { type: Sequelize.STRING },
      warehouse_id: { type: Sequelize.STRING },
      price_before_discount: { type: Sequelize.DECIMAL(12, 2) },
      total_discount: { type: Sequelize.DECIMAL(12, 2) },
      seller_share: { type: Sequelize.DECIMAL(12, 2) },
      bank_offer_share: { type: Sequelize.DECIMAL(12, 2) },
      price_after_discount: { type: Sequelize.DECIMAL(12, 2) },
      shipping_charges: { type: Sequelize.DECIMAL(12, 2) },
      final_price_after_discount: { type: Sequelize.DECIMAL(12, 2) },
      final_shipping_charges: { type: Sequelize.DECIMAL(12, 2) },
      final_taxable_sales_value: { type: Sequelize.DECIMAL(12, 2) },
      final_shipping_taxable_value: { type: Sequelize.DECIMAL(12, 2) },
      final_cgst_taxable: { type: Sequelize.DECIMAL(12, 2) },
      final_sgst_taxable: { type: Sequelize.DECIMAL(12, 2) },
      final_igst_taxable: { type: Sequelize.DECIMAL(12, 2) },
      final_cgst_shipping: { type: Sequelize.DECIMAL(12, 2) },
      final_sgst_shipping: { type: Sequelize.DECIMAL(12, 2) },
      final_igst_shipping: { type: Sequelize.DECIMAL(12, 2) },
      final_invoice_amount: { type: Sequelize.DECIMAL(12, 2) },
      tax_type: { type: Sequelize.STRING },
      taxable_value: { type: Sequelize.DECIMAL(12, 2) },
      cst_rate: { type: Sequelize.DECIMAL(6, 3) },
      cst_amount: { type: Sequelize.DECIMAL(12, 2) },
      vat_rate: { type: Sequelize.DECIMAL(6, 3) },
      vat_amount: { type: Sequelize.DECIMAL(12, 2) },
      luxury_cess_rate: { type: Sequelize.DECIMAL(6, 3) },
      luxury_cess_amount: { type: Sequelize.DECIMAL(12, 2) },
      conversion_rate: { type: Sequelize.DECIMAL(6, 3) },
      final_gst_rate: { type: Sequelize.DECIMAL(6, 3) },
      igst_rate: { type: Sequelize.DECIMAL(6, 3) },
      igst_amount: { type: Sequelize.DECIMAL(12, 2) },
      cgst_rate: { type: Sequelize.DECIMAL(6, 3) },
      cgst_amount: { type: Sequelize.DECIMAL(12, 2) },
      sgst_rate: { type: Sequelize.DECIMAL(6, 3) },
      sgst_amount: { type: Sequelize.DECIMAL(12, 2) },
      tcs_igst_rate: { type: Sequelize.DECIMAL(6, 3) },
      tcs_igst_amount: { type: Sequelize.DECIMAL(12, 2) },
      tcs_cgst_rate: { type: Sequelize.DECIMAL(6, 3) },
      tcs_cgst_amount: { type: Sequelize.DECIMAL(12, 2) },
      tcs_sgst_rate: { type: Sequelize.DECIMAL(6, 3) },
      tcs_sgst_amount: { type: Sequelize.DECIMAL(12, 2) },
      total_tcs_deducted: { type: Sequelize.DECIMAL(12, 2) },
      buyer_invoice_id: { type: Sequelize.STRING },
      buyer_invoice_date: { type: Sequelize.STRING },
      buyer_invoice_amount: { type: Sequelize.DECIMAL(12, 2) },
      customer_billing_pincode: { type: Sequelize.STRING(6) },
      customer_billing_state: { type: Sequelize.STRING },
      customer_delivery_pincode: { type: Sequelize.STRING(6) },
      customer_delivery_state: { type: Sequelize.STRING },
      tally_ledgers: { type: Sequelize.STRING },
      final_invoice_no: { type: Sequelize.STRING },
      usual_price: { type: Sequelize.DECIMAL(12, 2) },
      is_shopsy_order: { type: Sequelize.BOOLEAN },
      tds_rate: { type: Sequelize.DECIMAL(6, 3) },
      tds_amount: { type: Sequelize.DECIMAL(12, 2) },
      irn: { type: Sequelize.STRING },
      business_name: { type: Sequelize.STRING },
      business_gst_number: { type: Sequelize.STRING(15) },
      beneficiary_name: { type: Sequelize.STRING },
      imei: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('flipkart_working_file');
  }
};



