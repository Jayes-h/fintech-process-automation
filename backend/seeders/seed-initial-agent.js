'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create initial MIS Generator Agent
    const agentId = uuidv4();
    
    await queryInterface.bulkInsert('agents', [{
      id: uuidv4(),
      agentId: agentId,
      agentName: 'MIS Generator Agent',
      agentDescription: 'Upload Trial Balance Excel files and generate custom MIS reports with formula-based calculations',
      createdBy: 'system',
      subAgentsId: Sequelize.literal("'[]'::jsonb"),
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // Create corresponding MIS Agent record
    await queryInterface.bulkInsert('mis_agent', [{
      agentId: agentId,
      parentAgentId: null,
      name: 'MIS Generator Agent',
      description: 'Generates MIS reports from Trial Balance',
      format: Sequelize.literal("'[]'::jsonb"),
      trialBalance: null,
      tbWorking: null,
      mis: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('mis_agent', null, {});
    await queryInterface.bulkDelete('agents', null, {});
  }
};






