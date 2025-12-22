const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const SellerPortals = sequelize.define('SellerPortals', {
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
  tableName: 'seller_portals',
  timestamps: true,
  underscored: false
});

module.exports = SellerPortals;


