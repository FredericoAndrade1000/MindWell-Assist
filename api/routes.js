// api/routes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import { User, Assessment, ChatMessage, Appointment, ChatSession, sequelize } from './db.js'; // <<< Import ChatSession
import { generateO4MiniResponse } from './chatbot.js';
import { Op, fn, col, literal } from 'sequelize';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // <<< Import crypto

// Rate limiter middleware
const rateLimiter = () => {
    const limits = new Map(); // Store IP -> { count, resetTime, dailyCount, dailyResetTime }
    
    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        
        // Initialize or get rate limit data for this IP
        if (!limits.has(ip)) {
            limits.set(ip, {
                count: 0,
                resetTime: now + 60000, // 1 minute from now
                dailyCount: 0,
                dailyResetTime: now + 86400000 // 24 hours from now
            });
        }
        
        const limitData = limits.get(ip);
        
        // Reset counters if time has passed
        if (now > limitData.resetTime) {
            limitData.count = 0;
            limitData.resetTime = now + 60000;
        }
        if (now > limitData.dailyResetTime) {
            limitData.dailyCount = 0;
            limitData.dailyResetTime = now + 86400000;
        }
        
        // Check limits
        if (limitData.count >= 5) {
            return res.status(429).json({ 
                message: 'Limite de 5 mensagens por minuto atingido. Por favor, aguarde um momento.' 
            });
        }
        
        if (limitData.dailyCount >= 300) {
            return res.status(429).json({ 
                message: 'Limite diário de 300 mensagens atingido. Por favor, tente novamente amanhã.' 
            });
        }
        
        // Increment counters
        limitData.count++;
        limitData.dailyCount++;
        
        next();
    };
};

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

    if (!email || !password) { // Removed password length check here, model handles it
        return res.status(400).json({ message: 'Email and password are required.' });
    }
     // Add basic email format check (more robust validation is in the model)
    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
     if (password.length < 6) {
         return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
     }


    try {
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } }); // <<< Check lowercase email
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use.' }); // Conflict
        }

        const newUser = await User.create({
            email: email, // Let hook handle lowercase
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
         console.error("Registration Error:", error); // Log the actual error
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
        const user = await User.findOne({ where: { email: email.toLowerCase() } }); // <<< Check lowercase email

        if (!user) {
            console.log(`Login attempt failed for email: ${email.toLowerCase()} (User not found)`);
            return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
        }

        const isMatch = await user.isValidPassword(password);
        if (!isMatch) {
             console.log(`Login attempt failed for email: ${email.toLowerCase()} (Password mismatch)`);
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
         console.log(`Login successful for email: ${email.toLowerCase()}`);
        res.json({ message: 'Login successful.', token, user: userResponse });

    } catch (error) {
        next(error);
    }
});

// GET /auth/me (Protected)
router.get('/auth/me', authenticateToken, (req, res) => {
    // req.user is populated by authenticateToken middleware
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
         // Verify userId exists if provided and associate
         let userToAssociate = null;
         if (userId) {
             userToAssociate = await User.findByPk(userId);
             if (!userToAssociate) {
                 // Don't fail, just log and save anonymously if user ID from request is invalid
                 console.warn(`User ID ${userId} provided for assessment but not found. Saving anonymously.`);
             }
         }

        const newAssessment = await Assessment.create({
            userId: userToAssociate ? userToAssociate.id : null, // Store valid userId or null
            phqScore,
            gadScore,
            riskLevel,
            isSuicidalRisk,
            answers, // Stored encrypted via setter/hook
            consentGiven: true,
        });
        console.log(`Assessment ${newAssessment.id} saved for user: ${userToAssociate ? userToAssociate.id : 'Anonymous'}`);
        res.status(201).json({ message: 'Assessment saved successfully.', assessmentId: newAssessment.id });
    } catch (error) {
        next(error);
    }
});

// GET /assessments (Protected, Pro/Admin - For Admin Panel)
router.get('/assessments', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    const { limit = 20, offset = 0, riskLevel, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    const whereClause = {};

    if (riskLevel && ['LOW', 'MODERATE', 'HIGH'].includes(riskLevel.toUpperCase())) {
        whereClause.riskLevel = riskLevel.toUpperCase();
    }
    if (dateFrom) {
        const startDate = new Date(dateFrom);
        if (!isNaN(startDate)) { // Check if date is valid
            startDate.setHours(0, 0, 0, 0);
             whereClause.createdAt = { ...whereClause.createdAt, [Op.gte]: startDate };
        }
    }
    if (dateTo) {
        const endDate = new Date(dateTo);
         if (!isNaN(endDate)) { // Check if date is valid
            endDate.setHours(23, 59, 59, 999);
             whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: endDate };
        }
    }

     const validSortOrders = ['ASC', 'DESC'];
     const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
     const validSortBy = ['createdAt', 'riskLevel', 'phqScore', 'gadScore'];
     const sortField = validSortBy.includes(sortBy) ? sortBy : 'createdAt';

    try {
        const { count, rows } = await Assessment.findAndCountAll({
            where: whereClause,
            include: [{ model: User, attributes: ['id', 'email'] }],
            limit: parseInt(limit, 10) || 20,
            offset: parseInt(offset, 10) || 0,
            order: [[sortField, order]],
            attributes: { exclude: ['answers', 'anonymizedAt'] } // Exclude sensitive/internal fields
        });
        res.json({ totalItems: count, assessments: rows }); // <<< Removed limit/offset from response body
    } catch (error) {
        next(error);
    }
});

// GET /assessments/history (Protected, User) - NEW ROUTE
router.get('/assessments/history', authenticateToken, async (req, res, next) => {
    const userId = req.user.id; // Get user ID from authenticated token

    try {
        const history = await Assessment.findAll({
            where: { userId: userId },
            attributes: ['id', 'phqScore', 'gadScore', 'riskLevel', 'isSuicidalRisk', 'createdAt'], // Select only needed fields
            order: [['createdAt', 'DESC']],
            limit: 50 // Limit history length if needed
        });
        res.json(history);
    } catch (error) {
        next(error);
    }
});


// --- Chat Routes ---

// POST /chat (Protected & Rate Limited)
router.post('/chat', authenticateToken, rateLimiter(), async (req, res, next) => {
    const { message, sessionId } = req.body;
    const userId = req.user.id; // Get user ID from authenticated token

    if (!message) {
        return res.status(400).json({ message: 'Message content is required.' });
    }

    try {
        let activeSessionId = sessionId;

        // --- Find or Create Active Session ---
        if (!activeSessionId) {
            let session = await ChatSession.findOne({ where: { userId, isActive: true }, order: [['createdAt', 'DESC']]});
            if (!session) {
                session = await ChatSession.create({ userId });
            }
            activeSessionId = session.id;
        } else {
             const session = await ChatSession.findOne({ where: { id: activeSessionId, userId, isActive: true }});
             if (!session) {
                 return res.status(403).json({ message: 'Invalid or inactive session ID.' });
             }
        }

        // --- Prepare Context and History for Chatbot ---
        const conversationHistoryWithContext = [];

        // 1. Add Assessment Context (System Message)
        const latestAssessment = await Assessment.findOne({
            where: { userId },
            order: [['createdAt', 'DESC']],
            attributes: ['phqScore', 'gadScore', 'riskLevel', 'createdAt']
        });

        if (latestAssessment) {
            const assessmentDate = new Date(latestAssessment.createdAt).toLocaleDateString('pt-BR');
            const assessmentContext = `Contexto da última autoavaliação do usuário (em ${assessmentDate}): Pontuação PHQ-9 (Depressão) = ${latestAssessment.phqScore}, Pontuação GAD-7 (Ansiedade) = ${latestAssessment.gadScore}, Nível de Risco Geral = ${latestAssessment.riskLevel}. Use este contexto para adaptar suas respostas, se relevante, mas NÃO mencione diretamente as pontuações ou o nível de risco, a menos que o usuário pergunte especificamente sobre seus resultados. Foque em fornecer apoio e informação geral baseada no contexto.`;
            conversationHistoryWithContext.push({ role: 'system', content: assessmentContext });
            console.log(`[Chat Context] User ${userId}, Session ${activeSessionId}: Added assessment context.`);
        }

        // 2. Fetch Recent Messages from the Active Session
        const recentMessages = await ChatMessage.findAll({
             where: {
                 sessionId: activeSessionId // Fetch only from the current active session
             },
             order: [['createdAt', 'ASC']], // Get in chronological order
             limit: 15, // Limit context window slightly more
             attributes: ['role', 'content']
         });

         // Add fetched messages to the context array
         conversationHistoryWithContext.push(...recentMessages);

        // 3. Add the current user message to the history being sent to the AI
        conversationHistoryWithContext.push({ role: 'user', content: message });

        // --- Call Chatbot Service ---
        // Now call with the correctly structured single array
        const botResponse = await generateO4MiniResponse(conversationHistoryWithContext);

        // --- Save User and Assistant Messages to DB ---
        // Save user message (using the already determined activeSessionId)
        await ChatMessage.create({
            sessionId: activeSessionId,
            userId: userId,
            role: 'user',
            content: message
        });

        // Ensure botResponse is a string before saving
        const botResponseContent = typeof botResponse === 'string' ? botResponse : JSON.stringify(botResponse);

        // Save assistant response
        await ChatMessage.create({
            sessionId: activeSessionId,
            userId: userId,
            role: 'assistant',
            content: botResponseContent
        });

        // --- Send Response to Client ---
        res.json({ reply: botResponseContent, sessionId: activeSessionId });

    } catch (error) {
        console.error("Chat Endpoint Error:", error);
        // Provide a more generic error to the client
        res.status(500).json({ message: "Ocorreu um erro interno ao processar sua mensagem no chat." });
        // No next(error) here to avoid sending detailed stack trace if not desired
    }
});

// GET /chat/history (Protected)
router.get('/chat/history', authenticateToken, async (req, res, next) => {
    const userId = req.user.id;
    try {
        // Find the latest active session for the user
        const activeSession = await ChatSession.findOne({
            where: { userId, isActive: true },
            order: [['createdAt', 'DESC']]
        });

        if (!activeSession) {
            return res.json({ messages: [] }); // No active session, return empty history
        }

        // Fetch messages for that session
        const messages = await ChatMessage.findAll({
            where: { sessionId: activeSession.id },
            order: [['createdAt', 'ASC']], // Chronological order
            attributes: ['role', 'content'] // Only return role and content
        });

        res.json({ messages: messages || [] });

    } catch (error) {
        console.error("Chat History Error:", error);
        next(error);
    }
});

// DELETE /chat/session (Protected)
router.delete('/chat/session', authenticateToken, async (req, res, next) => {
    const userId = req.user.id;
    try {
        // Find the latest active session for the user
        const activeSession = await ChatSession.findOne({
            where: { userId, isActive: true },
        });

        if (activeSession) {
            // Mark the session as inactive
            activeSession.isActive = false;
            await activeSession.save();
            res.status(200).json({ message: 'Chat session cleared successfully.' });
        } else {
            res.status(404).json({ message: 'No active chat session found to clear.' });
        }

    } catch (error) {
        console.error("Clear Chat Session Error:", error);
        next(error);
    }
});


// --- Appointment Routes ---

// POST /appointments
router.post('/appointments', async (req, res, next) => {
    const { name, contact, message } = req.body;

    if (!name || !contact) {
        return res.status(400).json({ message: 'Nome e informação de contato são obrigatórios.' });
    }
     // Basic validation examples (can be more complex)
     if (typeof name !== 'string' || name.length < 2) {
         return res.status(400).json({ message: 'Nome inválido.' });
     }
      if (typeof contact !== 'string' || contact.length < 5) { // Very basic check
         return res.status(400).json({ message: 'Informação de contato inválida.' });
     }


    try {
        const newAppointment = await Appointment.create({
            patientName: name,
            patientContact: contact, // Encrypted by setter
            message: message || null, // Encrypted by setter
            status: 'pending',
        });
        console.log(`Appointment request ${newAppointment.id} created for ${name}`);
        res.status(201).json({ message: 'Solicitação de agendamento recebida com sucesso.', appointmentId: newAppointment.id });
    } catch (error) {
        next(error);
    }
});

// GET /appointments (Protected, Pro/Admin)
router.get('/appointments', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
     const { limit = 20, offset = 0, status, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
     const whereClause = {};

      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
      if (status && validStatuses.includes(status.toLowerCase())) {
          whereClause.status = status.toLowerCase();
      }

       const validSortOrders = ['ASC', 'DESC'];
       const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
       const validSortBy = ['createdAt', 'status', 'patientName', 'updatedAt']; // Added updatedAt
       const sortField = validSortBy.includes(sortBy) ? sortBy : 'createdAt';

    try {
         const { count, rows } = await Appointment.findAndCountAll({
              where: whereClause,
              limit: parseInt(limit, 10) || 20,
              offset: parseInt(offset, 10) || 0,
              order: [[sortField, order]],
              // Ensure contact/message are included (getters will decrypt)
              attributes: { include: ['patientContact', 'message'] }
         });
        res.json({ totalItems: count, appointments: rows });
    } catch (error) {
        next(error);
    }
});

// PUT /appointments/:id (Protected, Pro/Admin)
router.put('/appointments/:id', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    const { id } = req.params;
    const { status, professionalId, dateTime } = req.body;

     const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
     if (status && !validStatuses.includes(status)) {
         return res.status(400).json({ message: 'Valor de status inválido.' });
     }

    try {
        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Agendamento não encontrado.' });
        }

        const updateData = {};
        let changed = false;

        if (status && appointment.status !== status) {
             updateData.status = status;
             changed = true;
        }
        if (professionalId !== undefined && appointment.professionalId !== professionalId) {
             updateData.professionalId = professionalId;
             changed = true;
             // Optional: Check if professionalId exists if provided and not null
             if (professionalId) {
                 const professionalExists = await User.findOne({ where: { id: professionalId, role: { [Op.in]: ['professional', 'admin'] } } }); // Allow admin too
                 if (!professionalExists) {
                      return res.status(400).json({ message: `Usuário profissional com ID ${professionalId} não encontrado.` });
                 }
             }
        }
        if (dateTime !== undefined && appointment.dateTime !== dateTime) {
             // Basic date validation
             const newDateTime = dateTime ? new Date(dateTime) : null;
             if (dateTime && isNaN(newDateTime)) {
                 return res.status(400).json({ message: 'Formato de data/hora inválido.' });
             }
             updateData.dateTime = newDateTime;
             changed = true;
        }


        if (!changed) {
             return res.status(200).json({ message: 'Nenhuma alteração detectada.', appointment });
         }

        await appointment.update(updateData);
         // Fetch again to get potentially decrypted values if they were updated
        const updatedAppointment = await Appointment.findByPk(id);
        console.log(`Appointment ${id} updated by user ${req.user.id}. New status: ${updatedAppointment.status}`);
        res.json({ message: 'Agendamento atualizado com sucesso.', appointment: updatedAppointment });

    } catch (error) {
        next(error);
    }
});

// --- Stats Routes ---

// GET /stats (Protected, Pro/Admin)
router.get('/stats', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    try {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

        const riskCountsToday = await Assessment.findAll({
            attributes: ['riskLevel', [fn('COUNT', col('id')), 'count']],
            where: {
                createdAt: { [Op.gte]: todayStart }
            },
            group: ['riskLevel'],
            raw: true,
        });

        const highRiskToday = riskCountsToday.find(r => r.riskLevel === 'HIGH')?.count || 0;

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const totalAssessmentsMonth = await Assessment.count({
            where: { createdAt: { [Op.gte]: startOfMonth } }
        });

        const newContactsPending = await Appointment.count({
             where: { status: 'pending' }
        });

        const stats = {
            highRiskToday: parseInt(highRiskToday, 10),
            totalAssessmentsMonth: totalAssessmentsMonth,
            newContactsPending: newContactsPending,
            // Ensure all levels exist in the output object
             riskCountsToday: {
                HIGH: parseInt(riskCountsToday.find(r => r.riskLevel === 'HIGH')?.count || 0, 10),
                MODERATE: parseInt(riskCountsToday.find(r => r.riskLevel === 'MODERATE')?.count || 0, 10),
                LOW: parseInt(riskCountsToday.find(r => r.riskLevel === 'LOW')?.count || 0, 10),
            },
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
            attributes: ['id', 'email', 'role', 'createdAt', 'updatedAt'],
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
    const { role } = req.body;

    if (!role || !['user', 'professional', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Função inválida fornecida.' });
    }

     if (parseInt(id, 10) === req.user.id && role !== 'admin') {
         return res.status(400).json({ message: 'Administrador não pode remover sua própria função de admin.' });
     }

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (user.role === role) {
            return res.status(200).json({ message: 'Nenhuma alteração na função.', user: { id: user.id, email: user.email, role: user.role } });
        }

        user.role = role;
        await user.save();
        console.log(`User ${id} role updated to ${role} by admin ${req.user.id}`);

        const userResponse = { id: user.id, email: user.email, role: user.role };
        res.json({ message: 'Função do usuário atualizada com sucesso.', user: userResponse });
    } catch (error) {
        next(error);
    }
});

// DELETE /admin/users/:id (Protected, Admin)
router.delete('/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
        return res.status(400).json({ message: "ID de usuário inválido." });
    }

    if (numericId === req.user.id) {
        return res.status(400).json({ message: "Administrador não pode excluir sua própria conta." });
    }

    try {
        const user = await User.findByPk(numericId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const userEmail = user.email; // Get email before destroying
        await user.destroy(); // This will trigger onDelete:'SET NULL' in related tables
        console.log(`User ${userEmail} (ID: ${numericId}) deleted by admin ${req.user.id}`);
        res.status(200).json({ message: 'Usuário excluído com sucesso.' });

    } catch (error) {
        next(error);
    }
});

// POST /admin/backup (Protected, Admin)
router.post('/admin/backup', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     const dbUrl = process.env.DATABASE_URL;
     if (!dbUrl || !dbUrl.startsWith('sqlite:')) {
         return res.status(500).json({ message: 'Backup suportado apenas para configuração SQLite.' });
     }
     const dbPath = path.resolve(__dirname, dbUrl.substring(7));
     const backupDir = path.resolve(__dirname, 'backups');
     const backupFileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
     const backupPath = path.join(backupDir, backupFileName);

     try {
         await fs.mkdir(backupDir, { recursive: true });
         await fs.copyFile(dbPath, backupPath);
         console.log(`Database backup created at: ${backupPath} by admin ${req.user.id}`);
         res.status(200).json({ message: `Backup criado com sucesso: ${backupFileName}` });
     } catch (error) {
         console.error('Backup failed:', error);
         next(new Error('Falha no backup do banco de dados. Verifique os logs do servidor.'));
     }
});

// POST /admin/anonymize (Protected, Admin)
router.post('/admin/anonymize', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     try {
         const { anonymizeOldAssessments } = await import('./cron.js');
         console.log(`Manually triggering anonymization task by admin ${req.user.id}...`);
         await anonymizeOldAssessments(true); // Pass flag indicating manual trigger
         res.status(200).json({ message: 'Tarefa de anonimização disparada com sucesso.' });
     } catch (error) {
         console.error('Manual anonymization trigger failed:', error);
         next(new Error('Falha ao disparar tarefa de anonimização.'));
     }
});

// GET /admin/logs (Protected, Admin)
router.get('/admin/logs', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     const logLinesLimit = parseInt(req.query.limit || 100, 10);

     try {
          try {
             await fs.access(LOG_FILE_PATH);
         } catch (e) {
              console.log("Log file not found, returning empty array.");
              return res.json({ logs: [] }); // Return empty array instead of message
          }

         const data = await fs.readFile(LOG_FILE_PATH, 'utf-8');
         const lines = data.split('\n').filter(line => line.trim() !== '');
         const recentLines = lines.slice(-logLinesLimit);
         res.json({ logs: recentLines });
     } catch (error) {
         console.error('Error reading log file:', error);
         next(new Error('Falha ao recuperar logs.'));
     }
});


export default router;