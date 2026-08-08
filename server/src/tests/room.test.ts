import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { User } from '../models/User';

let token: string;
let userId: string;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/whiteboard_test');

  // Create a test user
  const user = await User.create({ name: 'Room Tester', email: 'rooms@example.com', password: 'password123' });
  userId = String(user._id);
  token = jwt.sign({ id: userId }, process.env.JWT_SECRET ?? 'test_secret', { expiresIn: '1h' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Room API', () => {
  let roomId: string;

  it('POST /api/rooms — creates a room', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Room' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Room');
    expect(res.body.members[0].role).toBe('owner');
    roomId = res.body._id;
  });

  it('GET /api/rooms — lists user rooms', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/rooms/:roomId — gets room details', async () => {
    const res = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(roomId);
  });

  it('PATCH /api/rooms/:roomId/canvas — saves canvas', async () => {
    const res = await request(app)
      .patch(`/api/rooms/${roomId}/canvas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ canvasData: JSON.stringify({ objects: [] }) });

    expect(res.status).toBe(200);
  });

  it('DELETE /api/rooms/:roomId — owner can delete', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
