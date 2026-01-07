const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const StateConfig = sequelize.define('StateConfig', {
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
  tableName: 'state_configs',
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
StateConfig.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
StateConfig.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = StateConfig;

