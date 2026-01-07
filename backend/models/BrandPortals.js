const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const BrandPortals = sequelize.define('BrandPortals', {
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
    },
    onDelete: 'CASCADE'
  },
  sellerPortalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'seller_portals',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'brand_portals',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      unique: true,
      fields: ['brandId', 'sellerPortalId']
    }
  ]
});

module.exports = BrandPortals;


