import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../index';

/**
 * Auth API Integration Tests
 *
 * These tests run against a real MongoDB test database.
 * The test database is isolated from the development database.
 */

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/whiteboard_test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.password).toBeUndefined();  // never exposed
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dupe', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('rejects weak password with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short', email: 'short@example.com', password: '123' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });
});
