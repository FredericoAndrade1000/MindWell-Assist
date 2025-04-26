// api/db.js
// (Nenhuma mudança necessária neste arquivo em relação à versão fornecida,
// ele já suporta userId anulável e tem os campos necessários.
// Apenas garanta que você tem a versão mais recente que inclui
// userId, consentGiven, e relacionamentos.)

import { Sequelize, DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto'; // <<< Ensure crypto is imported if using UUID

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
            console.warn("Decryption notice: Input format might be legacy (missing IV). Attempting legacy decryption.", encryptedText); // Changed to warn
             // Attempting legacy decryption if no IV present (use with caution)
             try {
                 const decryptedLegacy = CryptoJS.AES.decrypt(encryptedText, encryptionKeyHex, {
                     mode: CryptoJS.mode.CBC, // Assuming legacy used CBC
                     padding: CryptoJS.pad.Pkcs7
                 });
                 const originalTextLegacy = decryptedLegacy.toString(CryptoJS.enc.Utf8);
                  // Basic check if decryption seems plausible (avoids returning garbage)
                 if (originalTextLegacy && originalTextLegacy.length > 0 && !originalTextLegacy.includes('�')) {
                    console.warn("Decryption successful using legacy method for:", encryptedText.substring(0, 10) + '...');
                    return originalTextLegacy;
                } else {
                    console.error("Decryption failed: Legacy decryption resulted in invalid UTF8 or empty string.");
                     return null;
                }
             } catch (legacyError) {
                 console.error("Decryption failed: Invalid format (missing IV) and legacy decryption attempt failed.", legacyError);
                 return null; // Return null if format is wrong and legacy fails
             }
        }
        const iv = CryptoJS.enc.Hex.parse(parts[0]);
        const ciphertext = parts[1];
        const decrypted = CryptoJS.AES.decrypt(ciphertext, encryptionKeyHex, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const originalText = decrypted.toString(CryptoJS.enc.Utf8);
         if (!originalText && encryptedText.length > 5) { // Check if decryption resulted in empty string for non-trivial input
            console.error("Decryption failed: Resulted in empty string. Check key or data corruption for:", encryptedText.substring(0, 10) + '...');
            return null;
         }
        return originalText;
    } catch (error) {
         // This might happen if the key is wrong or data is corrupted
        console.error("Decryption failed:", error);
        return null; // Or throw new Error("Decryption failed");
    }
};


// --- Sequelize Singleton Instance ---
let sequelizeInstance;

const getSequelizeInstance = () => {
    if (!sequelizeInstance) {
        const dbFilename = 'database.sqlite';
        const dbPath = path.resolve(__dirname, dbFilename);
        console.log(`[DB] Resolved SQLite path: ${dbPath}`);

        sequelizeInstance = new Sequelize(DATABASE_URL, {
            dialect: 'sqlite',
            storage: dbPath,
            logging: process.env.NODE_ENV === 'development' ? console.log : false, // Log SQL in dev
            define: {
                timestamps: true,
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
        beforeValidate: (user, options) => {
            if (user.email) {
                user.email = user.email.toLowerCase(); // Ensure email is lowercase before saving/validating
            }
        },
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
                 console.error("Failed to parse decrypted answers JSON:", e, "Raw decrypted:", decrypted); // Log raw decrypted value on error
                 return null; // Return null if JSON parsing fails
             }
        },
        set(value) {
             if (value) {
                 try {
                    const stringified = JSON.stringify(value);
                    this.setDataValue('answers', encrypt(stringified));
                 } catch (e) {
                    console.error("Failed to stringify answers JSON:", e);
                    this.setDataValue('answers', null); // Set null if stringification fails
                 }
             } else {
                 this.setDataValue('answers', null);
             }
        }
    },
    consentGiven: { // Record consent
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    anonymizedAt: { // Optional: Timestamp for when anonymization occurred
        type: DataTypes.DATE,
        allowNull: true,
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
        type: DataTypes.ENUM('user', 'assistant', 'system'), // Added 'system' role
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
             if (!value) {
                this.setDataValue('patientContact', null); // Handle null/empty value
                return;
            }
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
    await sequelize.sync();
    console.log('All models were synchronized successfully.');

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
        const existingAdmin = await User.findOne({ where: { email: adminEmail.toLowerCase() } });
        if (!existingAdmin) {
            await User.create({
                email: adminEmail,
                passwordHash: adminPassword, // Hook will hash this before saving
                role: 'admin',
            });
            console.log(`Admin user ${adminEmail} created successfully.`);
        } else {
            // Optional: Update admin password if needed and different from .env
            // const isSamePassword = await existingAdmin.isValidPassword(adminPassword);
            // if (!isSamePassword) {
            //     console.log(`Updating password for admin user ${adminEmail}...`);
            //     existingAdmin.passwordHash = adminPassword; // Let hook re-hash
            //     await existingAdmin.save();
            //     console.log(`Password updated for admin user ${adminEmail}.`);
            // } else {
                 console.log(`Admin user ${adminEmail} already exists.`);
            // }
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
};