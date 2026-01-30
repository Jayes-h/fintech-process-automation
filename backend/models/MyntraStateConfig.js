const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const MyntraStateConfig = sequelize.define('MyntraStateConfig', {
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
  tableName: 'myntra_state_configs',
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
MyntraStateConfig.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
MyntraStateConfig.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = MyntraStateConfig;
