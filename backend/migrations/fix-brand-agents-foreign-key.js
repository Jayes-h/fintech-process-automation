'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the existing foreign key constraint if it exists
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "brand_agents" 
        DROP CONSTRAINT IF EXISTS "brand_agents_agentId_fkey";
      `);
    } catch (error) {
      console.log('Constraint may not exist:', error.message);
    }

    // Ensure unique constraint exists on agents.agentId
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "agents_agentId_unique" 
        ON "agents" ("agentId");
      `);
    } catch (error) {
      console.log('Unique index may already exist:', error.message);
    }

    // Recreate the foreign key constraint properly
    await queryInterface.sequelize.query(`
      ALTER TABLE "brand_agents"
      ADD CONSTRAINT "brand_agents_agentId_fkey"
      FOREIGN KEY ("agentId")
      REFERENCES "agents" ("agentId")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "brand_agents" 
      DROP CONSTRAINT IF EXISTS "brand_agents_agentId_fkey";
    `);
  }
};


