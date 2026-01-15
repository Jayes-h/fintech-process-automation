'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('process_1', 'brandId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'brands',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('process_1', 'brandId');
  }
};
