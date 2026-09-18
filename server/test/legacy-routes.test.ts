import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';

// Characterization tests for the legacy route stack (Task 10): lock the
// observable behavior of representative legacy endpoints while
// server/routes.ts is split into server/routes/legacy/* modules.

// server/db.ts throws at import time without DATABASE_URL. Point it at a
// refused port: registerRoutes only touches the DB via initSpotifyTokens,
// which swallows connection failures.
process.env.DATABASE_URL ||= 'postgres://localhost:1/legacy-test';
// Force AI endpoints down their no-key fallback paths, and keep
// registerRoutes' startup side effects (Supabase storage buckets) inert.
const savedEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
process.env.OPENAI_API_KEY = '';
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';

let app: Express;

beforeAll(async () => {
  const { registerRoutes } = await import('../routes');
  app = express();
  app.use(express.json());
  await registerRoutes(app);
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('legacy routes (characterization)', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/is-admin without auth returns admin:false', async () => {
    const res = await request(app).get('/api/is-admin');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ admin: false });
  });

  it('GET /api/suggest-articles falls back to the curated catalog without auth', async () => {
    const res = await request(app).get('/api/suggest-articles');
    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(7);
    for (const a of res.body.articles) {
      expect(a).toHaveProperty('title');
      expect(a).toHaveProperty('url');
    }
  });

  it('GET /api/curated-videos falls back to the curated catalog without auth', async () => {
    const res = await request(app).get('/api/curated-videos');
    expect(res.status).toBe(200);
    expect(res.body.videos).toHaveLength(6);
    for (const v of res.body.videos) {
      expect(v).toHaveProperty('title');
      expect(v).toHaveProperty('youtubeId');
    }
  });

  it('GET /api/curated-quotes falls back to the curated catalog without auth', async () => {
    const res = await request(app).get('/api/curated-quotes');
    expect(res.status).toBe(200);
    expect(res.body.quotes).toHaveLength(5);
    for (const q of res.body.quotes) {
      expect(q).toHaveProperty('text');
      expect(q).toHaveProperty('author');
    }
  });

  it('GET /api/article-metadata rejects missing and private URLs', async () => {
    expect((await request(app).get('/api/article-metadata')).status).toBe(400);
    const res = await request(app)
      .get('/api/article-metadata')
      .query({ url: 'http://localhost:1/x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid URL');
  });

  it('POST /api/inbound-calendar rejects a missing token', async () => {
    const res = await request(app).post('/api/inbound-calendar').send('BEGIN:VCALENDAR');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing token parameter');
  });
});
