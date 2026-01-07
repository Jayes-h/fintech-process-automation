const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const MacrosFiles = sequelize.define('MacrosFiles', {
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
  brandName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sellerPortalName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  process1_file_path: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pivot_file_path: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  process1_record_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  pivot_record_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'macros_files',
  timestamps: true,
  underscored: false
});

// Define associations
MacrosFiles.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
MacrosFiles.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = MacrosFiles;



