const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');

// Use a separate test database
const TEST_DB = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/videovault_test';

beforeAll(async () => {
  await mongoose.connect(TEST_DB);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Auth API', () => {
  let token;

  it('should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test@1234',
      organisation: 'TestOrg',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('should not register with duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User 2',
      email: 'test@example.com',
      password: 'Test@1234',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should login successfully', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Test@1234',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    expect(res.statusCode).toBe(401);
  });

  it('should get profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('Video API', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Test@1234',
    });
    token = res.body.token;
  });

  it('should return video list for authenticated user', async () => {
    const res = await request(app)
      .get('/api/videos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.videos)).toBe(true);
  });

  it('should return 404 for non-existent video', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/videos/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it('should reject upload without file', async () => {
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test Video');
    expect(res.statusCode).toBe(400);
  });
});

describe('Health Check', () => {
  it('should return OK status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});
