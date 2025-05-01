'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, drop the existing foreign key constraint
      await queryInterface.removeConstraint('ChatSessions', 'ChatSessions_userId_fkey');
      
      // Then modify the column to allow null
      await queryInterface.changeColumn('ChatSessions', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      console.log('Successfully updated ChatSessions table');
    } catch (error) {
      console.error('Error updating ChatSessions table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revert the changes if needed
      await queryInterface.changeColumn('ChatSessions', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      console.log('Successfully reverted ChatSessions table');
    } catch (error) {
      console.error('Error reverting ChatSessions table:', error);
      throw error;
    }
  }
}; 