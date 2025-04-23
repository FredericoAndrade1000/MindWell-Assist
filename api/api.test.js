import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env before importing modules that rely on it
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });


// Mock dependencies BEFORE importing modules that use them
const mockGenerateO4MiniResponse = jest.fn();
jest.mock('./chatbot.js', () => ({
    generateO4MiniResponse: mockGenerateO4MiniResponse,
}));

// Mock DB operations if needed, or use a test database
// For simplicity here, we assume the real DB functions (initializeDatabase, models) work,
// but ideally, you'd mock the DB interactions for unit/integration tests not hitting the actual DB.
// This setup will hit the actual SQLite file defined in .env during tests.
// Consider using an in-memory SQLite DB for tests: process.env.DATABASE_URL = 'sqlite::memory:';

import apiRoutes from './routes.js'; // Import routes AFTER mocks
import { sequelize, initializeDatabase, User, Assessment } from './db.js'; // Import DB utils
import jwt from 'jsonwebtoken'; // Import jwt to create test tokens


// --- Test Setup ---
const app = express();
app.use(express.json()); // Need body parser for tests
app.use('/', apiRoutes); // Mount the routes


let testUser;
let testToken;
let adminToken;


// Before all tests, initialize the database and create test users/tokens
beforeAll(async () => {
     // Ensure using a test database (e.g., in-memory or a specific test file)
    // process.env.DATABASE_URL = 'sqlite::memory:'; // Set before initializing
    try {
        await initializeDatabase(); // Sync models

        // Clean up potentially existing users from previous runs if needed
        await User.destroy({ where: { email: ['test@example.com', 'admin@example.com'] }});

        // Create a regular test user
        testUser = await User.create({
            email: 'test@example.com',
            passwordHash: 'password123', // Hook will hash
            role: 'user'
        });

         // Create an admin test user
         const adminUser = await User.create({
             email: 'admin@example.com',
             passwordHash: 'adminpass', // Hook will hash
             role: 'admin'
         });


        // Generate tokens for tests
        testToken = jwt.sign({ id: testUser.id, email: testUser.email, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    } catch (error) {
        console.error("Test setup failed:", error);
        throw error; // Fail tests if setup doesn't work
    }
});

// After all tests, close the database connection
afterAll(async () => {
    await sequelize.close();
});

// Reset mocks before each test
beforeEach(() => {
    mockGenerateO4MiniResponse.mockReset();
});

// --- Test Suites ---

describe('Authentication API (/auth)', () => {
    it('POST /auth/register - should register a new user successfully', async () => {
        const newUserEmail = `newuser_${Date.now()}@example.com`;
        const res = await request(app)
            .post('/auth/register')
            .send({ email: newUserEmail, password: 'password123' });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'User registered successfully.');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toEqual(newUserEmail);
         expect(res.body.user).not.toHaveProperty('passwordHash');

         // Clean up created user
         await User.destroy({where: { email: newUserEmail }});
    });

     it('POST /auth/register - should fail if email is already in use', async () => {
         const res = await request(app)
             .post('/auth/register')
             .send({ email: 'test@example.com', password: 'password123' }); // Use existing test user

         expect(res.statusCode).toEqual(409);
         expect(res.body).toHaveProperty('message', 'Email already in use.');
     });

      it('POST /auth/register - should fail with weak password', async () => {
         const res = await request(app)
             .post('/auth/register')
             .send({ email: 'weakpass@example.com', password: '123' });
         expect(res.statusCode).toEqual(400);
         expect(res.body).toHaveProperty('message', expect.stringContaining('password must be at least 6 characters'));
     });


    it('POST /auth/login - should login the test user and return a token', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'password123' }); // Correct password

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Login successful.');
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toEqual('test@example.com');
         expect(res.body.user.role).toEqual('user');
         expect(res.body.user).not.toHaveProperty('passwordHash');
    });

     it('POST /auth/login - should fail with incorrect password', async () => {
         const res = await request(app)
             .post('/auth/login')
             .send({ email: 'test@example.com', password: 'wrongpassword' });

         expect(res.statusCode).toEqual(401);
         expect(res.body).toHaveProperty('message', 'Invalid credentials.');
     });

     it('POST /auth/login - should fail for non-existent user', async () => {
          const res = await request(app)
             .post('/auth/login')
             .send({ email: 'nosuchuser@example.com', password: 'password123' });
          expect(res.statusCode).toEqual(401); // Or 404 depending on implementation, 401 is common
          expect(res.body).toHaveProperty('message', 'Invalid credentials.');
     });


    it('GET /auth/me - should return user info for a valid token', async () => {
        const res = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${testToken}`); // Use the generated token

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('id', testUser.id);
        expect(res.body).toHaveProperty('email', testUser.email);
        expect(res.body).toHaveProperty('role', testUser.role);
    });

    it('GET /auth/me - should return 401 if no token is provided', async () => {
        const res = await request(app).get('/auth/me');
        expect(res.statusCode).toEqual(401);
    });

    it('GET /auth/me - should return 403 if token is invalid/malformed', async () => {
        const res = await request(app)
            .get('/auth/me')
            .set('Authorization', 'Bearer invalidtoken123');
        expect(res.statusCode).toEqual(403);
         expect(res.body).toHaveProperty('message', 'Invalid token');
    });

     it('GET /auth/me - should return 401 if token is expired', async () => {
         // Create an expired token
         const expiredToken = jwt.sign({ id: testUser.id, email: testUser.email, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: '-1s' });
         const res = await request(app)
             .get('/auth/me')
             .set('Authorization', `Bearer ${expiredToken}`);
         expect(res.statusCode).toEqual(401);
         expect(res.body).toHaveProperty('message', 'Token expired');
     });

});


describe('Assessment API (/assessments)', () => {
     let createdAssessmentId;

     it('POST /assessments - should save an anonymous assessment with consent', async () => {
         const assessmentData = {
             phqScore: 15,
             gadScore: 12,
             riskLevel: 'MODERATE',
             isSuicidalRisk: false,
             // answers: { q1: 3, q2: 2, ... }, // Optional answers, ensure encryption works
             consentGiven: true
         };
         const res = await request(app)
             .post('/assessments')
             .send(assessmentData);

         expect(res.statusCode).toEqual(201);
         expect(res.body).toHaveProperty('message', 'Assessment saved successfully.');
         expect(res.body).toHaveProperty('assessmentId');
         createdAssessmentId = res.body.assessmentId; // Save for potential cleanup

         // Verify in DB (optional but good)
         const savedAssessment = await Assessment.findByPk(createdAssessmentId);
         expect(savedAssessment).not.toBeNull();
         expect(savedAssessment.userId).toBeNull();
         expect(savedAssessment.phqScore).toBe(15);
         expect(savedAssessment.riskLevel).toBe('MODERATE');
          expect(savedAssessment.consentGiven).toBe(true);

          // Cleanup
          await Assessment.destroy({where: {id: createdAssessmentId}});

     });

      it('POST /assessments - should save an assessment for a logged-in user with consent', async () => {
         const assessmentData = {
             userId: testUser.id, // Associate with test user
             phqScore: 22,
             gadScore: 18,
             riskLevel: 'HIGH',
             isSuicidalRisk: true,
             consentGiven: true
         };
         const res = await request(app)
             .post('/assessments')
              // No token needed for this specific endpoint as designed (allows anonymous)
             .send(assessmentData);

         expect(res.statusCode).toEqual(201);
          expect(res.body).toHaveProperty('assessmentId');
          const savedId = res.body.assessmentId;

          // Verify in DB
          const savedAssessment = await Assessment.findByPk(savedId);
          expect(savedAssessment).not.toBeNull();
          expect(savedAssessment.userId).toBe(testUser.id);
          expect(savedAssessment.riskLevel).toBe('HIGH');
          expect(savedAssessment.isSuicidalRisk).toBe(true);
          expect(savedAssessment.consentGiven).toBe(true);

          // Cleanup
          await Assessment.destroy({where: {id: savedId}});
      });


     it('POST /assessments - should fail if consent is not given', async () => {
         const assessmentData = {
             phqScore: 5, gadScore: 3, riskLevel: 'LOW', isSuicidalRisk: false, consentGiven: false
         };
          const res = await request(app)
             .post('/assessments')
             .send(assessmentData);
          expect(res.statusCode).toEqual(400);
          expect(res.body).toHaveProperty('message', 'Consent is required to save assessment data.');
     });

      it('POST /assessments - should fail if required fields are missing', async () => {
           const assessmentData = { phqScore: 5, consentGiven: true }; // Missing fields
           const res = await request(app)
              .post('/assessments')
              .send(assessmentData);
           expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', expect.stringContaining('Missing required assessment fields'));
      });

      it('POST /assessments - should fail if riskLevel is invalid', async () => {
            const assessmentData = {
                 phqScore: 5, gadScore: 3, riskLevel: 'MEDIUM', isSuicidalRisk: false, consentGiven: true
            };
           const res = await request(app)
              .post('/assessments')
              .send(assessmentData);
           expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Invalid riskLevel provided.');
       });


     it('GET /assessments - should return 401 for unauthenticated user', async () => {
         const res = await request(app).get('/assessments');
         expect(res.statusCode).toEqual(401);
     });

      it('GET /assessments - should return 403 for user with incorrect role (user)', async () => {
          const res = await request(app)
              .get('/assessments')
              .set('Authorization', `Bearer ${testToken}`); // Regular user token
          expect(res.statusCode).toEqual(403);
          expect(res.body).toHaveProperty('message', expect.stringContaining('not authorized'));
      });


     it('GET /assessments - should return list of assessments for admin user', async () => {
          // Create a dummy assessment first
          const tempAssessment = await Assessment.create({ phqScore: 10, gadScore: 8, riskLevel: 'MODERATE', isSuicidalRisk: false, consentGiven: true });

          const res = await request(app)
             .get('/assessments')
             .set('Authorization', `Bearer ${adminToken}`); // Use admin token

         expect(res.statusCode).toEqual(200);
         expect(res.body).toHaveProperty('assessments');
         expect(Array.isArray(res.body.assessments)).toBe(true);
          expect(res.body.assessments.length).toBeGreaterThanOrEqual(1); // Should include the one we created
          expect(res.body.assessments[0]).not.toHaveProperty('answers'); // Ensure answers are excluded by default

          // Cleanup
          await Assessment.destroy({where: {id: tempAssessment.id}});
     });

      // Add tests for filtering/pagination if implemented in GET /assessments
       it('GET /assessments - should filter by riskLevel', async () => {
           // Create assessments with different risks
           const highRisk = await Assessment.create({ phqScore: 20, gadScore: 15, riskLevel: 'HIGH', isSuicidalRisk: false, consentGiven: true });
           const lowRisk = await Assessment.create({ phqScore: 2, gadScore: 1, riskLevel: 'LOW', isSuicidalRisk: false, consentGiven: true });

           const res = await request(app)
               .get('/assessments?riskLevel=HIGH')
               .set('Authorization', `Bearer ${adminToken}`);

           expect(res.statusCode).toEqual(200);
           expect(res.body.assessments).toHaveLength(1);
           expect(res.body.assessments[0].id).toEqual(highRisk.id);
            expect(res.body.assessments[0].riskLevel).toEqual('HIGH');

            // Cleanup
            await Assessment.destroy({where: {id: [highRisk.id, lowRisk.id]}});
       });

});

describe('Chat API (/chat)', () => {
    it('POST /chat - should return a mock bot response', async () => {
        const userMessage = 'Hello there!';
        const mockReply = 'Hello! This is MindGuide. How can I help?';
        mockGenerateO4MiniResponse.mockResolvedValue(mockReply); // Setup mock response

        const res = await request(app)
            .post('/chat')
            .send({ message: userMessage });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('reply', mockReply);
        expect(res.body).toHaveProperty('sessionId'); // Ensure session ID is returned
        expect(mockGenerateO4MiniResponse).toHaveBeenCalledTimes(1);
         // Check if the conversation history passed includes the user message
         expect(mockGenerateO4MiniResponse).toHaveBeenCalledWith(
             expect.arrayContaining([
                 expect.objectContaining({ role: 'user', content: userMessage })
             ]),
             'auto' // Default reasoning effort
         );
    });

     it('POST /chat - should handle OpenAI API errors gracefully', async () => {
         const userMessage = 'Tell me something';
          const errorMessage = 'AI assistant is currently unavailable.';
         mockGenerateO4MiniResponse.mockRejectedValue(new Error(errorMessage)); // Simulate API error

         const res = await request(app)
             .post('/chat')
             .send({ message: userMessage });

          // Depending on error handler, could be 500 or 503
         expect(res.statusCode).toBeGreaterThanOrEqual(500);
         expect(res.body).toHaveProperty('message', expect.stringContaining('AI assistant')); // Check for user-friendly message
     });

     it('POST /chat - should fail if message is missing', async () => {
          const res = await request(app)
             .post('/chat')
             .send({}); // No message field
          expect(res.statusCode).toEqual(400);
          expect(res.body).toHaveProperty('message', 'Message content is required.');
      });

      // TODO: Test chat history context passing
      // TODO: Test user association (sending userId)
});


// --- Add tests for Appointments, Stats, and Admin routes ---
// These would follow a similar pattern:
// 1. Check authentication/authorization (401, 403 errors)
// 2. Check successful operation (200, 201, 204 status codes)
// 3. Check expected response body/data
// 4. Check input validation (400 errors)
// 5. Check not found errors (404)
// 6. Mock external dependencies or DB calls if needed for isolation

describe('Admin API (/admin)', () => {
    let tempUserId;

     beforeAll(async () => {
        // Create a temporary user for manipulation in admin tests
         const tempUser = await User.create({ email: 'tempuser@example.com', passwordHash: 'temppass', role: 'user' });
         tempUserId = tempUser.id;
     });

     afterAll(async () => {
         // Clean up the temporary user
         await User.destroy({ where: { id: tempUserId } });
     });


    it('GET /admin/users - should return 401 for unauthenticated', async () => {
        const res = await request(app).get('/admin/users');
        expect(res.statusCode).toBe(401);
    });

    it('GET /admin/users - should return 403 for non-admin user', async () => {
         const res = await request(app)
             .get('/admin/users')
             .set('Authorization', `Bearer ${testToken}`); // Regular user token
         expect(res.statusCode).toBe(403);
     });

    it('GET /admin/users - should return list of users for admin', async () => {
        const res = await request(app)
            .get('/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        // Should contain at least the admin and the temp user
        expect(res.body.length).toBeGreaterThanOrEqual(2);
         expect(res.body[0]).not.toHaveProperty('passwordHash');
    });

     it('PUT /admin/users/:id - should update user role for admin', async () => {
         const res = await request(app)
             .put(`/admin/users/${tempUserId}`)
             .set('Authorization', `Bearer ${adminToken}`)
             .send({ role: 'professional' });

         expect(res.statusCode).toBe(200);
         expect(res.body.user.role).toBe('professional');

         // Verify in DB
         const updatedUser = await User.findByPk(tempUserId);
         expect(updatedUser.role).toBe('professional');
     });

     it('PUT /admin/users/:id - should fail if role is invalid', async () => {
          const res = await request(app)
             .put(`/admin/users/${tempUserId}`)
             .set('Authorization', `Bearer ${adminToken}`)
             .send({ role: 'superadmin' }); // Invalid role
           expect(res.statusCode).toBe(400);
           expect(res.body).toHaveProperty('message', 'Invalid role provided.');
      });

       it('PUT /admin/users/:id - should fail if admin tries to remove own admin role', async () => {
           const adminUser = await User.findOne({where: {email: 'admin@example.com'}});
           const res = await request(app)
              .put(`/admin/users/${adminUser.id}`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ role: 'user' });
           expect(res.statusCode).toBe(400);
           expect(res.body).toHaveProperty('message', 'Admin cannot remove their own admin role.');
       });


     it('DELETE /admin/users/:id - should delete user for admin', async () => {
         // Create another temp user specifically for deletion test
         const userToDelete = await User.create({ email: 'delete_me@example.com', passwordHash: 'pass', role: 'user' });

         const res = await request(app)
             .delete(`/admin/users/${userToDelete.id}`)
             .set('Authorization', `Bearer ${adminToken}`);

         expect(res.statusCode).toBe(200); // Or 204 if no content
         expect(res.body).toHaveProperty('message', 'User deleted successfully.');

         // Verify deletion in DB
         const deletedUser = await User.findByPk(userToDelete.id);
         expect(deletedUser).toBeNull();
     });

      it('DELETE /admin/users/:id - should fail if admin tries to delete self', async () => {
          const adminUser = await User.findOne({where: {email: 'admin@example.com'}});
          const res = await request(app)
             .delete(`/admin/users/${adminUser.id}`)
             .set('Authorization', `Bearer ${adminToken}`);
          expect(res.statusCode).toBe(400);
           expect(res.body).toHaveProperty('message', 'Admin cannot delete their own account.');
       });

       it('DELETE /admin/users/:id - should return 404 for non-existent user', async () => {
            const nonExistentId = 99999;
            const res = await request(app)
               .delete(`/admin/users/${nonExistentId}`)
               .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(404);
       });


     // Add tests for Backup, Anonymize, Logs endpoints if implemented robustly
     it('POST /admin/backup - should return success for admin', async () => {
        const res = await request(app)
            .post('/admin/backup')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('Backup created successfully');
        // TODO: Verify file was actually created (requires fs mocks or actual fs operations)
     });

      it('POST /admin/anonymize - should return success for admin', async () => {
          // Mock or spy on the actual anonymizeOldAssessments function if needed
          // For now, just test the endpoint response
          const res = await request(app)
              .post('/admin/anonymize')
              .set('Authorization', `Bearer ${adminToken}`);
          expect(res.statusCode).toBe(200);
          expect(res.body.message).toContain('Anonymization task triggered successfully');
      });

     // GET /admin/logs test would likely require mocking fs.readFile or ensuring a log file exists
});
