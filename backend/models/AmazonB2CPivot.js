const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const AmazonB2CPivot = sequelize.define('AmazonB2CPivot', {
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
  final_invoice_no: DataTypes.STRING,
  ship_to_state_tally_ledger: DataTypes.STRING,
  fg: DataTypes.STRING,
  sum_of_quantity: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_taxable_sales_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_cgst_tax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_sgst_tax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_igst_tax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_taxable_shipping_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_shipping_cgst_tax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_shipping_sgst_tax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_shipping_igst_tax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_tcs_cgst_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_tcs_sgst_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_tcs_igst_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sum_of_final_amount_receivable: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  }
}, {
  tableName: 'pivot',
  timestamps: true,
  underscored: false
});

// Define associations
AmazonB2CPivot.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
AmazonB2CPivot.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = AmazonB2CPivot;

