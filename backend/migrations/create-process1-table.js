'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('process_1', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brand_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      date: {
        type: Sequelize.STRING,
        allowNull: false
      },
      seller_gstin: {
        type: Sequelize.STRING,
        allowNull: true
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      invoice_date: {
        type: Sequelize.STRING,
        allowNull: true
      },
      transaction_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      order_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      shipment_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      shipment_date: {
        type: Sequelize.STRING,
        allowNull: true
      },
      order_date: {
        type: Sequelize.STRING,
        allowNull: true
      },
      shipment_item_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      quantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      item_description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      asin: {
        type: Sequelize.STRING,
        allowNull: true
      },
      hsn_sac: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fg: {
        type: Sequelize.STRING,
        allowNull: true
      },
      product_tax_code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bill_from_city: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bill_from_state: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bill_from_country: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bill_from_postal_code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_from_city: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_from_state: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_from_country: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_from_postal_code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_to_city: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_to_state: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_to_state_tally_ledger: {
        type: Sequelize.STRING,
        allowNull: true
      },
      final_invoice_no: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_to_country: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_to_postal_code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      invoice_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      tax_exclusive_gross: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      total_tax_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      cgst_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      sgst_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      utgst_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      igst_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      compensatory_cess_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      principal_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      principal_amount_basis: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      cgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      sgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      igst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      utgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      compensatory_cess_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_tax_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      final_taxable_sales_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_taxable_shipping_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_cgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_sgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_igst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_shipping_cgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_shipping_sgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_shipping_igst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_amount_basis: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_cgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_sgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_utgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_igst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_cess_tax_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_amount_basis: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_cgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_sgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_utgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_igst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_compensatory_cess_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      item_promo_discount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      item_promo_discount_basis: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      item_promo_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_promo_discount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_promo_discount_basis: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      shipping_promo_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_promo_discount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_promo_discount_basis: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      gift_wrap_promo_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      tcs_cgst_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      tcs_cgst_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      tcs_sgst_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      tcs_sgst_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      tcs_utgst_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      tcs_utgst_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      tcs_igst_rate: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      tcs_igst_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      final_amount_receivable: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      warehouse_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fulfillment_channel: {
        type: Sequelize.STRING,
        allowNull: true
      },
      payment_method_code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      credit_note_no: {
        type: Sequelize.STRING,
        allowNull: true
      },
      credit_note: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('process_1', ['brand_name']);
    await queryInterface.addIndex('process_1', ['date']);
    await queryInterface.addIndex('process_1', ['brand_name', 'date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('process_1');
  }
};




