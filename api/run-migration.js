import { sequelize } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
    try {
        // Get the query interface
        const queryInterface = sequelize.getQueryInterface();
        
        // Drop the existing foreign key constraint if it exists
        try {
            await queryInterface.removeConstraint('ChatSessions', 'ChatSessions_userId_fkey');
            console.log('Removed existing foreign key constraint');
        } catch (error) {
            console.log('No existing foreign key constraint found, continuing...');
        }
        
        // Modify the column to allow null
        await queryInterface.changeColumn('ChatSessions', 'userId', {
            type: sequelize.Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

runMigration(); 