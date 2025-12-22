'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Macros Agent
    const agentId = uuidv4();
    
    await queryInterface.bulkInsert('agents', [{
      id: uuidv4(),
      agentId: agentId,
      agentName: 'macros',
      agentDescription: 'Processes Excel files (Raw File and SKU File) to generate processed data with formulas, pivot tables, and reports. Supports multiple brands (Amazon, Flipkart, Blinkit).',
      createdBy: 'system',
      subAgentsId: Sequelize.literal("'[]'::jsonb"),
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('agents', {
      agentName: 'macros'
    }, {});
  }
};

