const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const { v4: uuidv4 } = require('uuid');

const Agents = sequelize.define('Agents', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  agentId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true
  },
  agentName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  agentDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'system'
  },
  subAgentsId: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'agents',
  timestamps: true,
  underscored: false
});

module.exports = Agents;









