const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const FlipkartWorkingFile = sequelize.define('FlipkartWorkingFile', {
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
  seller_gstin: { type: DataTypes.STRING(15) },
  seller_state: { type: DataTypes.STRING },
  order_id: { type: DataTypes.STRING },
  order_item_id: { type: DataTypes.STRING },
  product_title: { type: DataTypes.TEXT },
  fsn: { type: DataTypes.STRING },
  sku: { type: DataTypes.STRING },
  fg: { type: DataTypes.STRING },
  hsn_code: { type: DataTypes.STRING(10) },
  event_type: { type: DataTypes.STRING },
  event_sub_type: { type: DataTypes.STRING },
  order_type: { type: DataTypes.STRING },
  fulfilment_type: { type: DataTypes.STRING },
  order_date: { type: DataTypes.STRING },
  order_approval_date: { type: DataTypes.STRING },
  item_quantity: { type: DataTypes.INTEGER },
  order_shipped_from_state: { type: DataTypes.STRING },
  warehouse_id: { type: DataTypes.STRING },
  price_before_discount: { type: DataTypes.DECIMAL(12, 2) },
  total_discount: { type: DataTypes.DECIMAL(12, 2) },
  seller_share: { type: DataTypes.DECIMAL(12, 2) },
  bank_offer_share: { type: DataTypes.DECIMAL(12, 2) },
  price_after_discount: { type: DataTypes.DECIMAL(12, 2) },
  shipping_charges: { type: DataTypes.DECIMAL(12, 2) },
  final_price_after_discount: { type: DataTypes.DECIMAL(12, 2) },
  final_shipping_charges: { type: DataTypes.DECIMAL(12, 2) },
  final_taxable_sales_value: { type: DataTypes.DECIMAL(12, 2) },
  final_shipping_taxable_value: { type: DataTypes.DECIMAL(12, 2) },
  final_cgst_taxable: { type: DataTypes.DECIMAL(12, 2) },
  final_sgst_taxable: { type: DataTypes.DECIMAL(12, 2) },
  final_igst_taxable: { type: DataTypes.DECIMAL(12, 2) },
  final_cgst_shipping: { type: DataTypes.DECIMAL(12, 2) },
  final_sgst_shipping: { type: DataTypes.DECIMAL(12, 2) },
  final_igst_shipping: { type: DataTypes.DECIMAL(12, 2) },
  final_invoice_amount: { type: DataTypes.DECIMAL(12, 2) },
  tax_type: { type: DataTypes.STRING },
  taxable_value: { type: DataTypes.DECIMAL(12, 2) },
  cst_rate: { type: DataTypes.DECIMAL(6, 3) },
  cst_amount: { type: DataTypes.DECIMAL(12, 2) },
  vat_rate: { type: DataTypes.DECIMAL(6, 3) },
  vat_amount: { type: DataTypes.DECIMAL(12, 2) },
  luxury_cess_rate: { type: DataTypes.DECIMAL(6, 3) },
  luxury_cess_amount: { type: DataTypes.DECIMAL(12, 2) },
  conversion_rate: { type: DataTypes.DECIMAL(6, 3) },
  final_gst_rate: { type: DataTypes.DECIMAL(6, 3) },
  igst_rate: { type: DataTypes.DECIMAL(6, 3) },
  igst_amount: { type: DataTypes.DECIMAL(12, 2) },
  cgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  cgst_amount: { type: DataTypes.DECIMAL(12, 2) },
  sgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  sgst_amount: { type: DataTypes.DECIMAL(12, 2) },
  tcs_igst_rate: { type: DataTypes.DECIMAL(6, 3) },
  tcs_igst_amount: { type: DataTypes.DECIMAL(12, 2) },
  tcs_cgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  tcs_cgst_amount: { type: DataTypes.DECIMAL(12, 2) },
  tcs_sgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  tcs_sgst_amount: { type: DataTypes.DECIMAL(12, 2) },
  total_tcs_deducted: { type: DataTypes.DECIMAL(12, 2) },
  buyer_invoice_id: { type: DataTypes.STRING },
  buyer_invoice_date: { type: DataTypes.STRING },
  buyer_invoice_amount: { type: DataTypes.DECIMAL(12, 2) },
  customer_billing_pincode: { type: DataTypes.STRING(6) },
  customer_billing_state: { type: DataTypes.STRING },
  customer_delivery_pincode: { type: DataTypes.STRING(6) },
  customer_delivery_state: { type: DataTypes.STRING },
  tally_ledgers: { type: DataTypes.STRING },
  final_invoice_no: { type: DataTypes.STRING },
  usual_price: { type: DataTypes.DECIMAL(12, 2) },
  is_shopsy_order: { type: DataTypes.BOOLEAN },
  tds_rate: { type: DataTypes.DECIMAL(6, 3) },
  tds_amount: { type: DataTypes.DECIMAL(12, 2) },
  irn: { type: DataTypes.STRING },
  business_name: { type: DataTypes.STRING },
  business_gst_number: { type: DataTypes.STRING(15) },
  beneficiary_name: { type: DataTypes.STRING },
  imei: { type: DataTypes.STRING }
}, {
  tableName: 'flipkart_working_file',
  timestamps: true,
  underscored: false
});

// Define associations
FlipkartWorkingFile.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
FlipkartWorkingFile.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = FlipkartWorkingFile;



