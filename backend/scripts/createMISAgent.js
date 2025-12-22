require('dotenv').config();
const sequelize = require('../config/sequelize');
const MISAgent = require('../models/MISAgent');

async function createMISAgent() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    const agentId = process.argv[2];
    if (!agentId) {
      console.error('❌ Please provide agentId as argument');
      console.log('Usage: node scripts/createMISAgent.js <agentId>');
      process.exit(1);
    }

    // Check if MIS Agent already exists
    let misAgent = await MISAgent.findOne({ where: { agentId } });
    
    if (misAgent) {
      console.log('✅ MIS Agent already exists:', misAgent.agentId);
      console.log(JSON.stringify(misAgent.toJSON(), null, 2));
      process.exit(0);
    }

    // Create MIS Agent
    misAgent = await MISAgent.create({
      agentId,
      parentAgentId: null,
      name: 'MIS Generator Agent',
      description: 'Generates MIS reports from Trial Balance',
      format: [],
      trialBalance: null,
      tbWorking: null,
      mis: null
    });

    console.log('✅ MIS Agent created successfully!');
    console.log(JSON.stringify(misAgent.toJSON(), null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createMISAgent();
















