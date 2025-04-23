import { Sequelize, DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables relative to the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:./api/database.sqlite';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (64 hex chars) for AES-256

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error("FATAL ERROR: ENCRYPTION_KEY is missing or not 32 bytes (64 hex characters) long in .env file.");
    process.exit(1);
}

const encryptionKeyHex = CryptoJS.enc.Hex.parse(ENCRYPTION_KEY);

// --- Encryption Helpers ---
const encrypt = (text) => {
    if (!text) return null;
    try {
        const iv = CryptoJS.lib.WordArray.random(128 / 8); // Generate a random 16-byte IV
        const encrypted = CryptoJS.AES.encrypt(text, encryptionKeyHex, {
            iv: iv,
            mode: CryptoJS.mode.CBC, // Using CBC mode
            padding: CryptoJS.pad.Pkcs7
        });
        // Prepend IV to the ciphertext for storage, separated by ':'
        return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
    } catch (error) {
        console.error("Encryption failed:", error);
        throw new Error("Encryption failed");
    }
};

const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            console.error("Decryption failed: Invalid format (missing IV)");
            // Handle this case - maybe return null or throw a specific error
             // Attempting legacy decryption if no IV present (use with caution)
             const decryptedLegacy = CryptoJS.AES.decrypt(encryptedText, encryptionKeyHex, {
                 mode: CryptoJS.mode.CBC, // Assuming legacy used CBC
                 padding: CryptoJS.pad.Pkcs7
             });
             const originalTextLegacy = decryptedLegacy.toString(CryptoJS.enc.Utf8);
             if (originalTextLegacy) return originalTextLegacy; // Return if decryption worked

            return null; // Return null if format is wrong and legacy fails
        }
        const iv = CryptoJS.enc.Hex.parse(parts[0]);
        const ciphertext = parts[1];
        const decrypted = CryptoJS.AES.decrypt(ciphertext, encryptionKeyHex, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
         // This might happen if the key is wrong or data is corrupted
        console.error("Decryption failed:", error);
        // Depending on the field, returning null or a placeholder might be appropriate
        // For sensitive fields like email, failing might be safer than returning corrupted data.
        return null; // Or throw new Error("Decryption failed");
    }
};


// --- Sequelize Singleton Instance ---
let sequelizeInstance;

const getSequelizeInstance = () => {
    if (!sequelizeInstance) {
        let dbPath;
        try {
            const url = new URL(DATABASE_URL);
            if (url.protocol !== 'sqlite:') {
                throw new Error('DATABASE_URL protocol must be sqlite:');
            }
            // Resolve the path relative to the current file's directory (__dirname)
            // Assumes db.js is in the 'api' directory and the path in DATABASE_URL is relative to the project root
            // e.g., sqlite://api/database.sqlite resolves relative to the project root containing the 'api' folder
             // Correctly handle paths like 'api/database.sqlite' or '/path/from/root/api/database.sqlite'
             // The pathname will include the leading slash if present, e.g., /api/database.sqlite
             // path.resolve needs careful handling depending on whether pathname starts with /
             const pathname = url.pathname.startsWith('//') ? url.pathname.substring(1) : url.pathname; // Remove leading // if present from URL parsing
             dbPath = path.resolve(__dirname, '..', pathname); // Go up one level from api directory, then use the path


        } catch (e) {
            console.error(`Error parsing DATABASE_URL (${DATABASE_URL}): ${e.message}. Using default path.`);
            // Fallback or error handling - using a path relative to this file might be safer
             dbPath = path.resolve(__dirname, 'database.sqlite'); // Default to placing it next to db.js
             console.warn(`Defaulting SQLite path to: ${dbPath}`);
        }


        sequelizeInstance = new Sequelize(DATABASE_URL, { // Pass the original URL for potential dialect info
            dialect: 'sqlite', // Explicitly set dialect
            storage: dbPath, // Use the resolved absolute path
            logging: process.env.NODE_ENV === 'development' ? console.log : false, // Log SQL in dev
            define: {
                // Define global model options if needed
                timestamps: true, // Automatically add createdAt and updatedAt
            }
        });
    }
    return sequelizeInstance;
};

const sequelize = getSequelizeInstance();


// --- Model Definitions ---

class User extends Model {}
User.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
        // Optionally encrypt email - consider implications for lookups
        // get() {
        //     const rawValue = this.getDataValue('email');
        //     return decrypt(rawValue);
        // },
        // set(value) {
        //     this.setDataValue('email', encrypt(value));
        // }
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('user', 'professional', 'admin'),
        allowNull: false,
        defaultValue: 'user',
    },
}, {
    sequelize,
    modelName: 'User',
    hooks: {
        beforeCreate: async (user) => {
            if (user.passwordHash) {
                user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
            }
        },
        beforeUpdate: async (user) => {
            // Hash password only if it has changed
            if (user.changed('passwordHash')) {
                user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
            }
        },
    },
});

// Instance method to check password
User.prototype.isValidPassword = async function(password) {
    return bcrypt.compare(password, this.passwordHash);
};

class Assessment extends Model {}
Assessment.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true, // Allow anonymous assessments
        onDelete: 'SET NULL', // Keep assessment if user is deleted, but anonymize
        onUpdate: 'CASCADE',
    },
    phqScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    gadScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    riskLevel: {
        type: DataTypes.ENUM('LOW', 'MODERATE', 'HIGH'),
        allowNull: false,
    },
    isSuicidalRisk: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    answers: { // Store encrypted answers JSON
        type: DataTypes.TEXT,
        allowNull: true, // Or false if always required
        get() {
            const rawValue = this.getDataValue('answers');
            const decrypted = decrypt(rawValue);
             try {
                 return decrypted ? JSON.parse(decrypted) : null;
             } catch (e) {
                 console.error("Failed to parse decrypted answers JSON:", e);
                 return null; // Return null if JSON parsing fails
             }
        },
        set(value) {
             if (value) {
                 this.setDataValue('answers', encrypt(JSON.stringify(value)));
             } else {
                 this.setDataValue('answers', null);
             }
        }
    },
    consentGiven: { // Record consent
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    }
}, {
    sequelize,
    modelName: 'Assessment',
});

class ChatMessage extends Model {}
ChatMessage.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    sessionId: { // Group messages belonging to the same conversation
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true, // Allow anonymous chats
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
    role: {
        type: DataTypes.ENUM('user', 'assistant'),
        allowNull: false,
    },
    content: { // Consider encrypting if chat content is highly sensitive
        type: DataTypes.TEXT,
        allowNull: false,
        // get() {
        //     const rawValue = this.getDataValue('content');
        //     return decrypt(rawValue);
        // },
        // set(value) {
        //     this.setDataValue('content', encrypt(value));
        // }
    },
}, {
    sequelize,
    modelName: 'ChatMessage',
});

class Appointment extends Model {}
Appointment.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    professionalId: { // Optional: Assign to a specific professional later
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
    patientName: { // Can be submitted by anonymous user
        type: DataTypes.STRING,
        allowNull: false,
    },
    patientContact: { // Encrypted Email or Phone
        type: DataTypes.STRING,
        allowNull: false,
         get() {
            const rawValue = this.getDataValue('patientContact');
            return decrypt(rawValue);
        },
        set(value) {
            this.setDataValue('patientContact', encrypt(value));
        }
    },
    message: { // Encrypted Message
        type: DataTypes.TEXT,
        allowNull: true,
         get() {
            const rawValue = this.getDataValue('message');
            return decrypt(rawValue);
        },
        set(value) {
             if (value) {
                 this.setDataValue('message', encrypt(value));
             } else {
                 this.setDataValue('message', null);
             }
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
    },
    dateTime: { // Optional: If scheduling a specific time
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'Appointment',
});


// --- Relationships ---
User.hasMany(Assessment, { foreignKey: 'userId' });
Assessment.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ChatMessage, { foreignKey: 'userId' });
ChatMessage.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Appointment, { foreignKey: 'professionalId', as: 'AssignedAppointments' }); // Professional assigned
Appointment.belongsTo(User, { foreignKey: 'professionalId', as: 'Professional' });

// Might add a requestedByUserId to Appointment if requests always come from logged-in users


// --- Database Initialization Function ---
const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync all models
    // Use { force: true } only in development to drop and recreate tables
    // Use { alter: true } in development to attempt to alter tables to match models (use migrations in prod)
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('All models were synchronized successfully.');

    // Optional: Seed initial data (e.g., admin user)
     await seedAdminUser();

  } catch (error) {
    console.error('Unable to initialize the database:', error);
    throw error; // Re-throw error to be caught by server startup
  }
};

// --- Seed Admin User ---
const seedAdminUser = async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123'; // CHANGE THIS IN PRODUCTION .env

    if (!adminEmail || !adminPassword) {
        console.warn('Admin user credentials not found in environment variables. Skipping admin seed.');
        return;
    }

     try {
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });
        if (!existingAdmin) {
            await User.create({
                email: adminEmail,
                passwordHash: adminPassword, // Hook will hash this before saving
                role: 'admin',
            });
            console.log(`Admin user ${adminEmail} created successfully.`);
        } else {
            console.log(`Admin user ${adminEmail} already exists.`);
        }
    } catch (error) {
        console.error('Error seeding admin user:', error);
    }
};


export {
  sequelize,
  initializeDatabase,
  User,
  Assessment,
  ChatMessage,
  Appointment,
  // Export encryption functions if needed elsewhere, but usually keep DB logic encapsulated
  // encrypt,
  // decrypt,
};
