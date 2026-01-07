const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const AmazonB2CProcess1 = sequelize.define('AmazonB2CProcess1', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  brandId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'brands',
      key: 'id'
    }
  },
  sellerPortalId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'seller_portals',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  seller_gstin: DataTypes.STRING,
  invoice_number: DataTypes.STRING,
  invoice_date: DataTypes.STRING,
  transaction_type: DataTypes.STRING,
  order_id: DataTypes.STRING,
  shipment_id: DataTypes.STRING,
  shipment_date: DataTypes.STRING,
  order_date: DataTypes.STRING,
  shipment_item_id: DataTypes.STRING,
  quantity: DataTypes.DECIMAL(15, 2),
  item_description: DataTypes.TEXT,
  asin: DataTypes.STRING,
  hsn_sac: DataTypes.STRING,
  sku: DataTypes.STRING,
  fg: DataTypes.STRING,
  product_tax_code: DataTypes.STRING,
  bill_from_city: DataTypes.STRING,
  bill_from_state: DataTypes.STRING,
  bill_from_country: DataTypes.STRING,
  bill_from_postal_code: DataTypes.STRING,
  ship_from_city: DataTypes.STRING,
  ship_from_state: DataTypes.STRING,
  ship_from_country: DataTypes.STRING,
  ship_from_postal_code: DataTypes.STRING,
  ship_to_city: DataTypes.STRING,
  ship_to_state: DataTypes.STRING,
  ship_to_state_tally_ledger: DataTypes.STRING,
  final_invoice_no: DataTypes.STRING,
  ship_to_country: DataTypes.STRING,
  ship_to_postal_code: DataTypes.STRING,
  invoice_amount: DataTypes.DECIMAL(15, 2),
  tax_exclusive_gross: DataTypes.DECIMAL(15, 2),
  total_tax_amount: DataTypes.DECIMAL(15, 2),
  cgst_rate: DataTypes.DECIMAL(10, 4),
  sgst_rate: DataTypes.DECIMAL(10, 4),
  utgst_rate: DataTypes.DECIMAL(10, 4),
  igst_rate: DataTypes.DECIMAL(10, 4),
  compensatory_cess_rate: DataTypes.DECIMAL(10, 4),
  principal_amount: DataTypes.DECIMAL(15, 2),
  principal_amount_basis: DataTypes.DECIMAL(15, 2),
  cgst_tax: DataTypes.DECIMAL(15, 2),
  sgst_tax: DataTypes.DECIMAL(15, 2),
  igst_tax: DataTypes.DECIMAL(15, 2),
  utgst_tax: DataTypes.DECIMAL(15, 2),
  compensatory_cess_tax: DataTypes.DECIMAL(15, 2),
  final_tax_rate: DataTypes.DECIMAL(10, 4),
  final_taxable_sales_value: DataTypes.DECIMAL(15, 2),
  final_taxable_shipping_value: DataTypes.DECIMAL(15, 2),
  final_cgst_tax: DataTypes.DECIMAL(15, 2),
  final_sgst_tax: DataTypes.DECIMAL(15, 2),
  final_igst_tax: DataTypes.DECIMAL(15, 2),
  final_shipping_cgst_tax: DataTypes.DECIMAL(15, 2),
  final_shipping_sgst_tax: DataTypes.DECIMAL(15, 2),
  final_shipping_igst_tax: DataTypes.DECIMAL(15, 2),
  shipping_amount: DataTypes.DECIMAL(15, 2),
  shipping_amount_basis: DataTypes.DECIMAL(15, 2),
  shipping_cgst_tax: DataTypes.DECIMAL(15, 2),
  shipping_sgst_tax: DataTypes.DECIMAL(15, 2),
  shipping_utgst_tax: DataTypes.DECIMAL(15, 2),
  shipping_igst_tax: DataTypes.DECIMAL(15, 2),
  shipping_cess_tax_amount: DataTypes.DECIMAL(15, 2),
  gift_wrap_amount: DataTypes.DECIMAL(15, 2),
  gift_wrap_amount_basis: DataTypes.DECIMAL(15, 2),
  gift_wrap_cgst_tax: DataTypes.DECIMAL(15, 2),
  gift_wrap_sgst_tax: DataTypes.DECIMAL(15, 2),
  gift_wrap_utgst_tax: DataTypes.DECIMAL(15, 2),
  gift_wrap_igst_tax: DataTypes.DECIMAL(15, 2),
  gift_wrap_compensatory_cess_tax: DataTypes.DECIMAL(15, 2),
  item_promo_discount: DataTypes.DECIMAL(15, 2),
  item_promo_discount_basis: DataTypes.DECIMAL(15, 2),
  item_promo_tax: DataTypes.DECIMAL(15, 2),
  shipping_promo_discount: DataTypes.DECIMAL(15, 2),
  shipping_promo_discount_basis: DataTypes.DECIMAL(15, 2),
  shipping_promo_tax: DataTypes.DECIMAL(15, 2),
  gift_wrap_promo_discount: DataTypes.DECIMAL(15, 2),
  gift_wrap_promo_discount_basis: DataTypes.DECIMAL(15, 2),
  gift_wrap_promo_tax: DataTypes.DECIMAL(15, 2),
  tcs_cgst_rate: DataTypes.DECIMAL(10, 4),
  tcs_cgst_amount: DataTypes.DECIMAL(15, 2),
  tcs_sgst_rate: DataTypes.DECIMAL(10, 4),
  tcs_sgst_amount: DataTypes.DECIMAL(15, 2),
  tcs_utgst_rate: DataTypes.DECIMAL(10, 4),
  tcs_utgst_amount: DataTypes.DECIMAL(15, 2),
  tcs_igst_rate: DataTypes.DECIMAL(10, 4),
  tcs_igst_amount: DataTypes.DECIMAL(15, 2),
  final_amount_receivable: DataTypes.DECIMAL(15, 2),
  warehouse_id: DataTypes.STRING,
  fulfillment_channel: DataTypes.STRING,
  payment_method_code: DataTypes.STRING,
  credit_note_no: DataTypes.STRING,
  credit_note: DataTypes.STRING
}, {
  tableName: 'process_1',
  timestamps: true,
  underscored: false
});

// Define associations
AmazonB2CProcess1.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
AmazonB2CProcess1.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = AmazonB2CProcess1;

