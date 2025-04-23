import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });


import apiRoutes from './routes.js';
import { initializeDatabase } from './db.js';
import { startCronJobs } from './cron.js';
// Basic Swagger spec (can be expanded)
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MindWell API',
    version: '1.0.0',
    description: 'API for the Mental Health Assessment Platform',
  },
  servers: [
    {
      url: process.env.VITE_API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
    },
  ],
  // Define basic paths/schemas here later if needed
   paths: {},
   components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{
      bearerAuth: [] // Make JWT default for protected routes visually
    }]
};

const app = express();
const PORT = process.env.PORT || 4000;

// --- Database Initialization ---
initializeDatabase()
  .then(() => console.log('Database initialized successfully.'))
  .catch(err => {
      console.error('Failed to initialize database:', err);
      process.exit(1); // Exit if DB fails to initialize
   });


// --- Middlewares ---

// Security Headers
app.use(helmet());

// CORS Configuration
// Adjust origin based on your deployment needs
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['YOUR_PRODUCTION_FRONTEND_URL'] // Add your frontend production URL here
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If you need cookies or authorization headers
}));


// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', apiLimiter); // Apply to all /api routes

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
	max: 10, // Limit each IP to 10 login/register attempts per hour
	message: 'Too many authentication attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);


// --- API Routes ---
app.use('/', apiRoutes); // Mount all routes defined in routes.js

// --- Swagger UI ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Basic Root/Health Check ---
app.get('/', (req, res) => {
  res.send('MindWell API is running!');
});

// --- Global Error Handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
   // Check for specific error types if needed (e.g., validation errors)
   if (err.name === 'ValidationError') { // Example for a validation library
       return res.status(400).json({ message: "Validation Failed", errors: err.errors });
   }
   // Default error response
   res.status(err.status || 500).json({
       message: err.message || 'An unexpected error occurred on the server.',
        // Only include stack trace in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
   });
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`API Server listening on http://localhost:${PORT}`);
   console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
   // Start Cron Jobs after server starts
   startCronJobs();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    // Perform cleanup if needed (e.g., close DB connection gracefully)
    server.close(() => { // Assuming 'server' holds the app.listen result if needed
        console.log('HTTP server closed');
        process.exit(0);
    });
});
