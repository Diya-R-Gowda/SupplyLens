const { app, request } = require('./helpers');

describe('GET /health', () => {
  test('reports ok with no auth required', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });
});

describe('GET /health/db', () => {
  test('reports the real MongoDB connection state with no auth required', async () => {
    const res = await request(app).get('/api/health/db');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.db.connected).toBe('boolean');
  });
});
