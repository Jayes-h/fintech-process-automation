const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const { v4: uuidv4 } = require('uuid');

const MISAgent = sequelize.define('MISAgent', {
  agentId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  parentAgentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'agents',
      key: 'agentId'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  format: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  savedFormat: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  formatBrand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  trialBalance: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  tbWorking: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  mis: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'mis_agent',
  timestamps: true,
  underscored: false
});

module.exports = MISAgent;

