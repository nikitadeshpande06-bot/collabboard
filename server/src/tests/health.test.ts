/// <reference types="jest" />
import request from 'supertest';
import { app } from '../index';

/**
 * Health Endpoint Rate-Limiter Bypass Test
 *
 * Verifies that /api/health is NOT rate-limited, so Railway's
 * healthcheck pings never cause the deployment to be marked unhealthy.
 */

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('is NOT rate-limited even after exceeding the 100 req/15min limit', async () => {
    // Fire 110 requests (over the 100 req / 15 min limit)
    for (let i = 0; i < 110; i++) {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
    }
  });
});

describe('Rate limiter still protects other endpoints', () => {
  it('returns 429 for non-health endpoints after exceeding the limit', async () => {
    // Fire 110 requests to a non-health endpoint
    for (let i = 0; i < 110; i++) {
      await request(app).get('/api/nonexistent');
    }

    // The next request should be rate-limited
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(429);
  });
});