const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Brands = require('./Brands');
const SellerPortals = require('./SellerPortals');

const MyntraPivot = sequelize.define('MyntraPivot', {
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
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  seller_gstin: { type: DataTypes.STRING(15) },
  month: { type: DataTypes.INTEGER },
  date_column: { type: DataTypes.DATE },
  final_invoice_no: { type: DataTypes.STRING },
  tally_ledgers: { type: DataTypes.STRING }, // Debtor Ledger
  fg: { type: DataTypes.STRING },
  sum_of_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  sum_of_base_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_igst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_cgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_sgst_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sum_of_invoice_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, {
  tableName: 'myntra_pivot',
  timestamps: true,
  underscored: false
});

// Define associations
MyntraPivot.belongsTo(Brands, { foreignKey: 'brandId', as: 'brand' });
MyntraPivot.belongsTo(SellerPortals, { foreignKey: 'sellerPortalId', as: 'sellerPortal' });

module.exports = MyntraPivot;
