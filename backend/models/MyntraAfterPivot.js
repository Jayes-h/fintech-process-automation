const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const MyntraAfterPivot = sequelize.define('MyntraAfterPivot', {
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
  month: { type: DataTypes.INTEGER },
  date_column: { type: DataTypes.DATE },
  final_invoice_no: { type: DataTypes.STRING },
  tally_ledgers: { type: DataTypes.STRING },
  fg: { type: DataTypes.STRING },
  // Net calculations: Shipped - Returns - RTO
  net_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  net_base_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  net_igst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  net_cgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  net_sgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  net_invoice_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  // Individual report totals (for reference)
  shipped_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  shipped_base_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  shipped_igst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  shipped_cgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  shipped_sgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  returns_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  returns_base_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  returns_igst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  returns_cgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  returns_sgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  rto_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  rto_base_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  rto_igst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  rto_cgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  rto_sgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, {
  tableName: 'myntra_after_pivot',
  timestamps: true,
  underscored: false
});

// Define associations
MyntraAfterPivot.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
MyntraAfterPivot.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = MyntraAfterPivot;
