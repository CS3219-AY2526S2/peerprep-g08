// Focus on integration testing of API calls to ensure consistent route behavior

const request = require('supertest');
const mongoose = require('mongoose');
// Set up a test database using MongoDB Memory Server
const {MongoMemoryServer} = require('mongodb-memory-server');

const Question = require('../models/questionModel'); // Fixed the import path
const app = require('../index'); // Require the express app

let mongoServer;

describe('Question API Endpoints', () => {
    // Set up new db before all the test. 
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(uri);
    });

    // Clean between test so we have a clean slate
    afterEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany();
        }
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    // test cases for question routes
    describe('GET /api/questions', () => {
        it('should return an empty array when no questions exist', async () => {
            const response = await request(app).get('/api/questions');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should return all questions in the database', async () => {
            await Question.create({
                title: 'Two Sum',
                question: '2 + 2',
                answer: '4',
                difficulty: 'easy',
                category: 'Hash Map'
            });

            const response = await request(app).get('/api/questions');
            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].title).toBe('Two Sum');
        });
    });

    describe('POST /api/questions', () => {
        it('should create a new question when valid data is provided', async () => {
            const newQuestion = {
                title: 'Two Sum',
                question: 'What is 2+2?',
                answer: '4',
                difficulty: 'easy',
                category: 'Hash Map'
            };

            const response = await request(app)
                .post('/api/questions')
                .send(newQuestion);

            expect(response.status).toBe(201);
            expect(response.body.title).toBe(newQuestion.title);
            
            const questionInDb = await Question.findOne({ title: 'Two Sum' });
            expect(questionInDb).toBeTruthy();
            expect(questionInDb.question).toBe('What is 2+2?');
        });

        it('should return 400 when required fields are missing', async () => {
            const invalidQuestion = {
                title: 'Invalid Question'
                // Missing question, answer, difficulty, category
            };

            const response = await request(app)
                .post('/api/questions')
                .send(invalidQuestion);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Please provide all required fields');
        });
    });

    describe('PUT /api/questions/:id', () => {
        it('should update an existing question', async () => {
            const question = await Question.create({
                title: 'Two Sum',
                question: 'What is 2+2?',
                answer: '4',
                difficulty: 'easy',
                category: 'Hash Map'
            });

            const updatedData = {
                title: 'Three Sum',
                question: 'What is 3+3?',
                answer: '6',
                difficulty: 'medium',
                category: 'Hash Map '
            };

            const response = await request(app)
                .put(`/api/questions/${question._id}`)
                .send(updatedData);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Three Sum');
            expect(response.body.difficulty).toBe('medium');

            const questionInDb = await Question.findById(question._id);
            expect(questionInDb.title).toBe('Three Sum');
        });

        it('should return 400 if updating with missing required fields', async () => {
            const question = await Question.create({
                title: 'Two Sum',
                question: 'What is 2+2?',
                answer: '4',
                difficulty: 'easy',
                category: 'Hash Map'
            });

            const invalidUpdate = {
                title: 'Three Sum'
                // missing other required fields
            };

            const response = await request(app)
                .put(`/api/questions/${question._id}`)
                .send(invalidUpdate);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Please provide all required fields');
        });
    });

    describe('DELETE /api/questions/:id', () => {
        it('should delete an existing question', async () => {
            const question = await Question.create({
                title: 'To Be Deleted',
                question: 'Delete me',
                answer: 'Yes',
                difficulty: 'easy',
                category: 'Misc'
            });

            const response = await request(app).delete(`/api/questions/${question._id}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Question deleted successfully');

            const questionInDb = await Question.findById(question._id);
            expect(questionInDb).toBeNull();
        });

        it('should return 400 for an invalid ID format', async () => {
            const response = await request(app).delete('/api/questions/invalid-id-format');
            
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid question ID');
        });
    });
});
