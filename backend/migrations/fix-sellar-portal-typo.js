'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the typo column exists
    const tableDescription = await queryInterface.describeTable('process_1');
    
    if (tableDescription.sellar_portal) {
      // If typo column exists, rename it to seller_portal (or remove if not needed)
      // Since we already have sellerPortalId, we'll just remove the typo column
      await queryInterface.removeColumn('process_1', 'sellar_portal');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // If needed, we can add it back (though it shouldn't be needed)
    // await queryInterface.addColumn('process_1', 'sellar_portal', {
    //   type: Sequelize.STRING,
    //   allowNull: true
    // });
  }
};

