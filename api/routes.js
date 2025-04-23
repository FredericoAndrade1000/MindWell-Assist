import express from 'express';
import jwt from 'jsonwebtoken';
import { User, Assessment, ChatMessage, Appointment } from './db.js';
import { generateO4MiniResponse } from './chatbot.js';
import { Op, fn, col, literal } from 'sequelize';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
    process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE_PATH = path.join(__dirname, 'app.log'); // Example log file path

// --- Middleware ---

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
             if (err.name === 'TokenExpiredError') {
                 return res.status(401).json({ message: 'Token expired' });
             }
            return res.status(403).json({ message: 'Invalid token' }); // Forbidden if token is invalid
        }
        req.user = user; // Add user payload ({ id, email, role }) to request object
        next(); // pass the execution off to whatever request the client intended
    });
};

// Role Authorization Middleware
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Access denied. User role not found.' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Role '${req.user.role}' is not authorized.` });
        }
        next();
    };
};


// --- Authentication Routes ---

// POST /auth/register
router.post('/auth/register', async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password || password.length < 6) {
        return res.status(400).json({ message: 'Email is required and password must be at least 6 characters long.' });
    }

    try {
        const existingUser = await User.findOne({ where: { email: email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use.' }); // Conflict
        }

        // Role assignment could be more complex, e.g., based on domain or invite code
        // Defaulting to 'user' here.
        const newUser = await User.create({
            email: email,
            passwordHash: password, // Let the hook handle hashing
            role: 'user' // Default role
        });

        // Exclude password hash from response
        const userResponse = { id: newUser.id, email: newUser.email, role: newUser.role };
        res.status(201).json({ message: 'User registered successfully.', user: userResponse });

    } catch (error) {
         if (error.name === 'SequelizeValidationError') {
             return res.status(400).json({ message: 'Validation error', errors: error.errors.map(e => e.message) });
         }
         next(error); // Pass other errors to the global error handler
    }
});

// POST /auth/login
router.post('/auth/login', async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const user = await User.findOne({ where: { email: email } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
        }

        const isMatch = await user.isValidPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
        }

        // Generate JWT Payload
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        // Sign token
        const token = jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '24h' } // Token expiration time (e.g., 1 hour, 1 day)
        );

         // Exclude password hash from user object sent back
         const userResponse = { id: user.id, email: user.email, role: user.role };
        res.json({ message: 'Login successful.', token, user: userResponse });

    } catch (error) {
        next(error);
    }
});

// GET /auth/me (Protected)
router.get('/auth/me', authenticateToken, (req, res) => {
    // req.user is populated by authenticateToken middleware
    // Return user info (excluding sensitive data like passwordHash)
    res.json({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
    });
});


// --- Assessment Routes ---

// POST /assessments
router.post('/assessments', async (req, res, next) => {
    const { userId, phqScore, gadScore, riskLevel, isSuicidalRisk, answers, consentGiven } = req.body;

    // Basic Validation
     if (consentGiven !== true) {
        return res.status(400).json({ message: 'Consent is required to save assessment data.' });
    }
     if (phqScore === undefined || gadScore === undefined || !riskLevel || isSuicidalRisk === undefined) {
         return res.status(400).json({ message: 'Missing required assessment fields (scores, riskLevel, isSuicidalRisk).' });
     }
      const validRiskLevels = ['LOW', 'MODERATE', 'HIGH'];
      if (!validRiskLevels.includes(riskLevel)) {
          return res.status(400).json({ message: 'Invalid riskLevel provided.' });
      }


    try {
         // Verify userId exists if provided
         if (userId) {
             const userExists = await User.findByPk(userId);
             if (!userExists) {
                 return res.status(400).json({ message: `User with ID ${userId} not found.` });
             }
         }

        const newAssessment = await Assessment.create({
            userId: userId || null, // Store null if anonymous
            phqScore,
            gadScore,
            riskLevel,
            isSuicidalRisk,
            answers, // Stored encrypted via setter/hook
            consentGiven: true,
        });
        res.status(201).json({ message: 'Assessment saved successfully.', assessmentId: newAssessment.id });
    } catch (error) {
        next(error);
    }
});

// GET /assessments (Protected, Pro/Admin)
router.get('/assessments', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    // Add filtering/pagination options
    const { limit = 20, offset = 0, riskLevel, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    const whereClause = {};

    if (riskLevel && ['LOW', 'MODERATE', 'HIGH'].includes(riskLevel.toUpperCase())) {
        whereClause.riskLevel = riskLevel.toUpperCase();
    }
    if (dateFrom) {
        whereClause.createdAt = { ...whereClause.createdAt, [Op.gte]: new Date(dateFrom) };
    }
    if (dateTo) {
         whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: new Date(dateTo) };
    }

     const validSortOrders = ['ASC', 'DESC'];
     const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
     const validSortBy = ['createdAt', 'riskLevel', 'phqScore', 'gadScore']; // Add other valid fields
     const sortField = validSortBy.includes(sortBy) ? sortBy : 'createdAt';


    try {
        const { count, rows } = await Assessment.findAndCountAll({
            where: whereClause,
            include: [{ model: User, attributes: ['id', 'email'] }], // Include basic user info
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            order: [[sortField, order]],
            attributes: { exclude: ['answers'] } // Exclude raw answers from list view
        });
        res.json({ totalItems: count, assessments: rows, limit, offset });
    } catch (error) {
        next(error);
    }
});


// --- Chat Routes ---

// POST /chat
router.post('/chat', async (req, res, next) => {
    const { message, userId, sessionId } = req.body; // sessionId could be managed client-side or generated here

    if (!message) {
        return res.status(400).json({ message: 'Message content is required.' });
    }

     // Simple session management: Use provided sessionId or create a new one
     const currentSessionId = sessionId || crypto.randomUUID(); // Using crypto for UUID

    try {
         // Verify userId exists if provided
         let user = null;
         if (userId) {
             user = await User.findByPk(userId);
             // Decide if chat should fail if user not found, or proceed anonymously
             // if (!user) return res.status(400).json({ message: `User with ID ${userId} not found.` });
         }

        // 1. Save user message (optional, but good for history)
        await ChatMessage.create({
            sessionId: currentSessionId,
            userId: user ? user.id : null,
            role: 'user',
            content: message,
        });

        // 2. Get AI response (Add context if needed)
        // Fetch recent messages for context (example: last 5 messages)
        const recentMessages = await ChatMessage.findAll({
             where: { sessionId: currentSessionId },
             order: [['createdAt', 'DESC']],
             limit: 5 // Adjust context window size
         });
         // Format for OpenAI API (ensure latest message is last)
        const conversationHistory = recentMessages.reverse().map(msg => ({
             role: msg.role,
             content: msg.content
        }));
        // Add current user message if not already included (edge case on first message)
        if (!conversationHistory.some(m => m.role === 'user' && m.content === message)) {
             conversationHistory.push({ role: 'user', content: message });
        }


        const botReplyContent = await generateO4MiniResponse(conversationHistory); // Pass history

        // 3. Save AI response
        await ChatMessage.create({
            sessionId: currentSessionId,
             userId: null, // Or assign to a specific Bot User ID if you have one
            role: 'assistant',
            content: botReplyContent,
        });

        // 4. Send response back to client
        res.json({ reply: botReplyContent, sessionId: currentSessionId });

    } catch (error) {
        console.error("Chat endpoint error:", error);
        if (error.message && error.message.includes('OpenAI API request failed')) {
             // Handle specific OpenAI errors if needed
             return res.status(503).json({ message: 'AI assistant is currently unavailable. Please try again later.' });
        }
        next(error); // Pass to global handler
    }
});


// --- Appointment Routes ---

// POST /appointments
router.post('/appointments', async (req, res, next) => {
    const { name, contact, message } = req.body;

    if (!name || !contact) {
        return res.status(400).json({ message: 'Name and contact information are required.' });
    }

    try {
        const newAppointment = await Appointment.create({
            patientName: name,
            patientContact: contact, // Encrypted by setter
            message: message || null, // Encrypted by setter
            status: 'pending',
        });
        res.status(201).json({ message: 'Appointment request received successfully.', appointmentId: newAppointment.id });
    } catch (error) {
        next(error);
    }
});

// GET /appointments (Protected, Pro)
router.get('/appointments', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
     const { limit = 20, offset = 0, status, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
     const whereClause = {};

      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
      if (status && validStatuses.includes(status.toLowerCase())) {
          whereClause.status = status.toLowerCase();
      }

       const validSortOrders = ['ASC', 'DESC'];
       const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
       const validSortBy = ['createdAt', 'status', 'patientName']; // Add other valid fields
       const sortField = validSortBy.includes(sortBy) ? sortBy : 'createdAt';

    try {
         const { count, rows } = await Appointment.findAndCountAll({
              where: whereClause,
              // Optionally include assigned professional info
               // include: [{ model: User, as: 'Professional', attributes: ['id', 'email'] }],
              limit: parseInt(limit, 10),
              offset: parseInt(offset, 10),
              order: [[sortField, order]],
         });
        // Note: patientContact and message will be automatically decrypted by getters when accessed
        res.json({ totalItems: count, appointments: rows, limit, offset });
    } catch (error) {
        next(error);
    }
});

// PUT /appointments/:id (Protected, Pro)
router.put('/appointments/:id', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    const { id } = req.params;
    const { status, professionalId, dateTime } = req.body; // Allow updating status, assigning pro, setting time

     const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
     if (status && !validStatuses.includes(status)) {
         return res.status(400).json({ message: 'Invalid status value.' });
     }

    try {
        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (professionalId !== undefined) updateData.professionalId = professionalId; // Allow setting null
        if (dateTime !== undefined) updateData.dateTime = dateTime; // Allow setting null

         // Optional: Check if professionalId exists if provided
         if (professionalId) {
            const professionalExists = await User.findOne({ where: { id: professionalId, role: 'professional' } });
            if (!professionalExists) {
                 return res.status(400).json({ message: `Professional user with ID ${professionalId} not found.` });
            }
        }


        await appointment.update(updateData);
        res.json({ message: 'Appointment updated successfully.', appointment });

    } catch (error) {
        next(error);
    }
});

// --- Stats Routes ---

// GET /stats (Protected, Pro/Admin)
router.get('/stats', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    try {
        // Example Stats:
        // 1. Counts per risk level today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const riskCountsToday = await Assessment.findAll({
            attributes: ['riskLevel', [fn('COUNT', col('id')), 'count']],
            where: {
                createdAt: {
                    [Op.gte]: today,
                }
            },
            group: ['riskLevel'],
            raw: true, // Get plain objects
        });

        const highRiskToday = riskCountsToday.find(r => r.riskLevel === 'HIGH')?.count || 0;

         // 2. Total assessments this month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const totalAssessmentsMonth = await Assessment.count({
            where: {
                createdAt: { [Op.gte]: startOfMonth }
            }
        });

         // 3. Pending contact requests
        const newContactsPending = await Appointment.count({
             where: { status: 'pending' }
        });

        // Format results
        const stats = {
            highRiskToday: parseInt(highRiskToday, 10), // Ensure integer
            totalAssessmentsMonth: totalAssessmentsMonth,
            newContactsPending: newContactsPending,
            riskCountsToday: riskCountsToday.reduce((acc, curr) => {
                 acc[curr.riskLevel] = parseInt(curr.count, 10);
                 return acc;
             }, { HIGH: 0, MODERATE: 0, LOW: 0 }), // Ensure all levels exist
            // Add more stats as needed (e.g., trends over time)
        };

        res.json(stats);

    } catch (error) {
        next(error);
    }
});

// --- Admin Routes ---

// GET /admin/users (Protected, Admin)
router.get('/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'role', 'createdAt', 'updatedAt'], // Exclude passwordHash
            order: [['createdAt', 'DESC']],
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// PUT /admin/users/:id (Protected, Admin)
router.put('/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    const { id } = req.params;
    const { role } = req.body; // Only allow updating role for now

    if (!role || !['user', 'professional', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role provided.' });
    }

     if (parseInt(id, 10) === req.user.id && role !== 'admin') {
         return res.status(400).json({ message: 'Admin cannot remove their own admin role.' });
     }

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.role = role;
        await user.save();

        const userResponse = { id: user.id, email: user.email, role: user.role };
        res.json({ message: 'User role updated successfully.', user: userResponse });
    } catch (error) {
        next(error);
    }
});

// DELETE /admin/users/:id (Protected, Admin)
router.delete('/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    const { id } = req.params;

     // Prevent admin from deleting themselves
    if (parseInt(id, 10) === req.user.id) {
        return res.status(400).json({ message: "Admin cannot delete their own account." });
    }

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await user.destroy(); // This will trigger onDelete:'SET NULL' in related tables
        res.status(200).json({ message: 'User deleted successfully.' }); // OK or No Content (204)

    } catch (error) {
        next(error);
    }
});

// POST /admin/backup (Protected, Admin) - Basic example: Copy SQLite file
router.post('/admin/backup', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     const dbPath = path.resolve(__dirname, process.env.DATABASE_URL.substring(7)); // Assuming 'sqlite:./api/database.sqlite'
     const backupDir = path.resolve(__dirname, 'backups');
     const backupFileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
     const backupPath = path.join(backupDir, backupFileName);

     try {
         await fs.mkdir(backupDir, { recursive: true }); // Ensure backup directory exists
         await fs.copyFile(dbPath, backupPath);
         console.log(`Database backup created at: ${backupPath}`);
         res.status(200).json({ message: `Backup created successfully: ${backupFileName}` });
     } catch (error) {
         console.error('Backup failed:', error);
         next(new Error('Database backup failed. Check server logs.'));
     }
});

// POST /admin/anonymize (Protected, Admin) - Triggers the cron job logic manually
router.post('/admin/anonymize', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     try {
         // Import the function dynamically to avoid circular dependencies if cron imports db
         const { anonymizeOldAssessments } = await import('./cron.js');
         console.log("Manually triggering anonymization task...");
         // Run the task immediately, don't wait for schedule
         await anonymizeOldAssessments(true); // Pass a flag to indicate manual trigger if needed
         res.status(200).json({ message: 'Anonymization task triggered successfully.' });
     } catch (error) {
         console.error('Manual anonymization trigger failed:', error);
         next(new Error('Failed to trigger anonymization task.'));
     }
});

// GET /admin/logs (Protected, Admin) - Basic example: Read last N lines from a log file
router.get('/admin/logs', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     const logLinesLimit = parseInt(req.query.limit || 100, 10);

     try {
         // Check if log file exists
          try {
             await fs.access(LOG_FILE_PATH);
         } catch (e) {
              // File doesn't exist
              return res.json({ logs: ["Log file not found or not created yet."] });
          }


         const data = await fs.readFile(LOG_FILE_PATH, 'utf-8');
         const lines = data.split('\n').filter(line => line.trim() !== ''); // Split and remove empty lines
         const recentLines = lines.slice(-logLinesLimit); // Get the last N lines
         res.json({ logs: recentLines });
     } catch (error) {
         console.error('Error reading log file:', error);
         next(new Error('Failed to retrieve logs.'));
     }
});


export default router;
