'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pivot', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brand_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      date: {
        type: Sequelize.STRING,
        allowNull: false
      },
      seller_gstin: {
        type: Sequelize.STRING,
        allowNull: true
      },
      final_invoice_no: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ship_to_state_tally_ledger: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fg: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sum_of_quantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_taxable_sales_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_cgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_sgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_igst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_taxable_shipping_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_shipping_cgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_shipping_sgst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_shipping_igst_tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_tcs_cgst_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_tcs_sgst_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_tcs_igst_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      sum_of_final_amount_receivable: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
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

    // Add indexes
    await queryInterface.addIndex('pivot', ['brand_name']);
    await queryInterface.addIndex('pivot', ['date']);
    await queryInterface.addIndex('pivot', ['brand_name', 'date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pivot');
  }
};




