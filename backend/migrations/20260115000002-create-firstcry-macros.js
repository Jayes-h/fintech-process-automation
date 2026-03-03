'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('firstcry_macros', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brandId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'brands',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sellerPortalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'seller_portals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      'SrNo.': {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      'FC Ref. no.': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Order Ids': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Order Date': {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      'Invoice Date': {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      'Delivery date': {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      'SR/RTO date': {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      'Product ID': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'FG': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Tally Item Name': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'HSN Code': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Qty': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'MRP': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Rate': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Taxable': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'CGST %': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'CGST Amount': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'SGST %': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'SGST Amount': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Total': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Vendor Invoice no.': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Payment advice no': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Debit note no.': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'SR Qty': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'SR Total Amount': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'SR Gross Amount': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'RTO Qty': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'RTO Total Amount': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'RTO Gross Amount': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      date: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('firstcry_macros', ['brandId', 'sellerPortalId', 'date']);
    await queryInterface.addIndex('firstcry_macros', ['Product ID']);
    await queryInterface.addIndex('firstcry_macros', ['Vendor Invoice no.']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('firstcry_macros');
  }
};
