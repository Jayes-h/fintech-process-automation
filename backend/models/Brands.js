const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Brands = sequelize.define('Brands', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'brands',
  timestamps: true,
  underscored: false
});

module.exports = Brands;
