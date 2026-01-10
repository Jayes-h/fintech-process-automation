const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const FlipkartPivot = sequelize.define('FlipkartPivot', {
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
  final_invoice_no: { type: DataTypes.STRING },
  fg: { type: DataTypes.STRING },
  sum_of_item_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  sum_of_final_taxable_sales_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_final_cgst_taxable: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_final_sgst_taxable: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_final_igst_taxable: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_final_shipping_taxable_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_final_cgst_shipping: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_final_sgst_shipping: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_final_igst_shipping: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, {
  tableName: 'flipkart_pivot',
  timestamps: true,
  underscored: false
});

// Define associations
FlipkartPivot.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
FlipkartPivot.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = FlipkartPivot;



