const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const MyntraWorkingFile = sequelize.define('MyntraWorkingFile', {
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
  // Core columns from SOP
  seller_gstin: { type: DataTypes.STRING(15) },
  month: { type: DataTypes.INTEGER },
  date_column: { type: DataTypes.DATE },
  invoice_number: { type: DataTypes.STRING },
  debtor_ledger: { type: DataTypes.STRING }, // Tally Ledger
  sku: { type: DataTypes.STRING },
  fg: { type: DataTypes.STRING },
  quantity: { type: DataTypes.INTEGER },
  gst_rate: { type: DataTypes.DECIMAL(6, 3) },
  base_amount: { type: DataTypes.DECIMAL(12, 2) },
  igst_amount: { type: DataTypes.DECIMAL(12, 2) },
  cgst_amount: { type: DataTypes.DECIMAL(12, 2) },
  sgst_amount: { type: DataTypes.DECIMAL(12, 2) },
  invoice_amount: { type: DataTypes.DECIMAL(12, 2) },
  
  // Additional columns from source files
  report_type: { type: DataTypes.STRING }, // 'Packed', 'RT', 'RTO'
  order_id: { type: DataTypes.STRING },
  item_id: { type: DataTypes.STRING },
  sku_id: { type: DataTypes.STRING },
  packet_id: { type: DataTypes.STRING },
  ship_to_state: { type: DataTypes.STRING },
  ship_to_state_tally_ledger: { type: DataTypes.STRING },
  final_invoice_no: { type: DataTypes.STRING },
  
  // Tax rates
  tax_rate: { type: DataTypes.DECIMAL(6, 3) },
  igst_rate: { type: DataTypes.DECIMAL(6, 3) },
  cgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  sgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  
  // Dates
  order_created_date: { type: DataTypes.DATE },
  order_packed_date: { type: DataTypes.DATE },
  order_shipped_date: { type: DataTypes.DATE },
  order_delivered_date: { type: DataTypes.DATE },
  order_rto_date: { type: DataTypes.DATE },
  
  // Additional fields
  warehouse_id: { type: DataTypes.STRING },
  warehouse_name: { type: DataTypes.STRING },
  seller_name: { type: DataTypes.STRING },
  seller_id: { type: DataTypes.STRING },
  master_category: { type: DataTypes.STRING },
  article_type: { type: DataTypes.STRING },
  net_amount: { type: DataTypes.DECIMAL(12, 2) },
  shipment_value: { type: DataTypes.DECIMAL(12, 2) },
  base_value: { type: DataTypes.DECIMAL(12, 2) },
  seller_price: { type: DataTypes.DECIMAL(12, 2) },
  platform_charges: { type: DataTypes.DECIMAL(12, 2) },
  shipping_charges: { type: DataTypes.DECIMAL(12, 2) },
  mrp: { type: DataTypes.DECIMAL(12, 2) },
  tcs_amount: { type: DataTypes.DECIMAL(12, 2) },
  tds_amount: { type: DataTypes.DECIMAL(12, 2) },
  tds_rate: { type: DataTypes.DECIMAL(6, 3) }
}, {
  tableName: 'myntra_working_file',
  timestamps: true,
  underscored: false
});

// Define associations
MyntraWorkingFile.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
MyntraWorkingFile.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = MyntraWorkingFile;
