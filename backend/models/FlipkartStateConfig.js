const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const FlipkartStateConfig = sequelize.define('FlipkartStateConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  brandId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Brands,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sellerPortalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: SellerPortals,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  configData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  }
}, {
  tableName: 'flipkart_state_configs',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      unique: true,
      fields: ['brandId', 'sellerPortalId']
    }
  ]
});

// Define associations
FlipkartStateConfig.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
FlipkartStateConfig.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = FlipkartStateConfig;




