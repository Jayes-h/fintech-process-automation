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
  }
}, {
  tableName: 'brands',
  timestamps: true,
  underscored: false
});

module.exports = Brands;


