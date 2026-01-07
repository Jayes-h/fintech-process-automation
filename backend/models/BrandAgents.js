const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const BrandAgents = sequelize.define('BrandAgents', {
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
  agentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'agents',
      key: 'agentId'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'brand_agents',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      unique: true,
      fields: ['brandId', 'agentId']
    }
  ]
});

module.exports = BrandAgents;


