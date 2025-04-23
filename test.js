import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, sequelize, initializeDatabase } from './api/db.js'; // Adjust path if script is not in root

// --- Configuration ---
const DEFAULT_ADMIN_EMAIL = 'fredericoandrade1000@gmail.com';
const ADMIN_PASSWORD = '123456'; // As requested

// --- Setup ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Get email from command line argument or use default
const adminEmail = process.argv[2] || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;

// --- Main Function ---
const createAdmin = async () => {
    console.log(`Attempting to create admin user: ${adminEmail}`);

    if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 6) {
        console.error("Error: Admin password is too short or not defined.");
        process.exit(1);
    }

    try {
        // Ensure DB is initialized (creates tables if they don't exist)
        // Note: initializeDatabase also authenticates
        await initializeDatabase();
        console.log("Database connection successful.");

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });

        if (existingAdmin) {
            if (existingAdmin.role === 'admin') {
                console.warn(`Admin user ${adminEmail} already exists.`);
                // Optionally add logic here to update password if needed
                // console.log(`Updating password for existing admin ${adminEmail}...`);
                // existingAdmin.passwordHash = ADMIN_PASSWORD; // Hook will hash on save
                // await existingAdmin.save();
                // console.log(`Password updated for admin ${adminEmail}.`);
            } else {
                 console.warn(`User ${adminEmail} exists but is not an admin. Updating role and password...`);
                 existingAdmin.role = 'admin';
                 existingAdmin.passwordHash = ADMIN_PASSWORD; // Hook will hash on save
                 await existingAdmin.save();
                 console.log(`User ${adminEmail} updated to admin role with the specified password.`);
            }
        } else {
            // Create new admin user
            console.log(`Creating new admin user ${adminEmail}...`);
            await User.create({
                email: adminEmail,
                // Provide the plain password here; the beforeCreate hook in db.js will hash it
                passwordHash: ADMIN_PASSWORD,
                role: 'admin',
            });
            console.log(`Admin user ${adminEmail} created successfully with the specified password!`);
        }

    } catch (error) {
        console.error('Error creating admin user:', error.message);
         if (error.original) { // Log underlying DB error if available
             console.error('Database Error:', error.original);
         }
        process.exit(1); // Exit with error code
    } finally {
        // Ensure database connection is closed
        await sequelize.close();
        console.log('Database connection closed.');
    }
};

// --- Execute ---
createAdmin();