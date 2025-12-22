const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const MISData = sequelize.define('MISData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  agent_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tb: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  tb_working: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  mis: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'mis_data',
  timestamps: true,
  underscored: false
});

module.exports = MISData;















