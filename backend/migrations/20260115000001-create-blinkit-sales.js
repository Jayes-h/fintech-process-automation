'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('blinkit_sales', {
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
      'S.No.': {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      'Order Id': {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      'Order Date': {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      'Item Id': {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      'Product Name': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Brand Name': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'UPC': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Variant Description': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Mapping on consumer app (L0, L1, L2)': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Business Category': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Supply City': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Supply State': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Supply State GST': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Customer City': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Customer State': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'Order Status': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'HSN Code': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'IGST(%)': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'CGST(%)': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'SGST(%)': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'CESS(%)': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Quantity': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'MRP (Rs)': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Selling Price (Rs)': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'IGST Value': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'CGST Value': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'SGST Value': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'CESS Value': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Total Tax': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Total Gross Bill Amount': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'Taxable value': {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      'GST Rate': {
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
    await queryInterface.addIndex('blinkit_sales', ['brandId', 'sellerPortalId', 'date']);
    await queryInterface.addIndex('blinkit_sales', ['Customer State']);
    await queryInterface.addIndex('blinkit_sales', ['HSN Code']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('blinkit_sales');
  }
};
