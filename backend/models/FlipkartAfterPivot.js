const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const FlipkartAfterPivot = sequelize.define('FlipkartAfterPivot', {
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
  tally_ledgers: { type: DataTypes.STRING },
  invoice_no: { type: DataTypes.STRING },
  fg: { type: DataTypes.STRING },
  quantity: { type: DataTypes.INTEGER },
  rate: { type: DataTypes.DECIMAL(12, 2) },
  taxable_sales_value: { type: DataTypes.DECIMAL(12, 2) },
  cgst_sales_amount: { type: DataTypes.DECIMAL(12, 2) },
  sgst_sales_amount: { type: DataTypes.DECIMAL(12, 2) },
  igst_sales_amount: { type: DataTypes.DECIMAL(12, 2) },
  shipping_taxable_value: { type: DataTypes.DECIMAL(12, 2) },
  cgst_shipping_amount: { type: DataTypes.DECIMAL(12, 2) },
  sgst_shipping_amount: { type: DataTypes.DECIMAL(12, 2) },
  igst_shipping_amount: { type: DataTypes.DECIMAL(12, 2) }
}, {
  tableName: 'flipkart_after_pivot',
  timestamps: true,
  underscored: false
});

// Define associations
FlipkartAfterPivot.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
FlipkartAfterPivot.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = FlipkartAfterPivot;



