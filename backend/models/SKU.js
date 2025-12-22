const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const SKU = sequelize.define('SKU', {
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
  salesPortalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'seller_portals',
      key: 'id'
    }
  },
  salesPortalSku: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tallyNewSku: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'sku',
  timestamps: true,
  underscored: false
});

// Define associations
SKU.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
SKU.belongsTo(SellerPortals, { foreignKey: 'salesPortalId', as: 'salesPortal' });

module.exports = SKU;


