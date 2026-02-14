const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const BlinkitSales = sequelize.define('BlinkitSales', {
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
  'S.No.': {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  'Order Id': {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  'Order Date': {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  'Item Id': {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  'Product Name': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Brand Name': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'UPC': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Variant Description': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Mapping on consumer app (L0, L1, L2)': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Business Category': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Supply City': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Supply State': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Supply State GST': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Customer City': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Customer State': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'Order Status': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'HSN Code': {
    type: DataTypes.STRING,
    allowNull: true
  },
  'IGST(%)': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'CGST(%)': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'SGST(%)': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'CESS(%)': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Quantity': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'MRP (Rs)': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Selling Price (Rs)': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'IGST Value': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'CGST Value': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'SGST Value': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'CESS Value': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Total Tax': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Total Gross Bill Amount': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'Taxable value': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  'GST Rate': {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'blinkit_sales',
  timestamps: true,
  underscored: false
});

// Define associations
BlinkitSales.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
BlinkitSales.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = BlinkitSales;
