const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const FirstCryMacros = sequelize.define('FirstCryMacros', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  brandId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'brands',
      key: 'id'
    }
  },
  sellerPortalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'seller_portals',
      key: 'id'
    }
  },
  'SrNo.': {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  'FC Ref. no.': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Order Ids': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Order Date': {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  'Invoice Date': {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  'Delivery date': {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  'SR/RTO date': {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  'Product ID': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'FG': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Tally Item Name': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'HSN Code': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Qty': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'MRP': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Rate': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Taxable': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'CGST %': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'CGST Amount': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'SGST %': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'SGST Amount': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Total': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Vendor Invoice no.': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Payment advice no': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Debit note no.': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'SR Qty': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'SR Total Amount': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'SR Gross Amount': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'RTO Qty': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'RTO Total Amount': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'RTO Gross Amount': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'firstcry_macros',
  timestamps: true,
  underscored: false
});

// Define associations
FirstCryMacros.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
FirstCryMacros.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = FirstCryMacros;
