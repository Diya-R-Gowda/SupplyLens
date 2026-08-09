const db = require('./db');
const { app, request, registerUser } = require('./helpers');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

describe('auth flow', () => {
  test('register creates an org+admin user and returns a token pair', async () => {
    const email = `newuser_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ email, password: 'TestPass123!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ email, role: 'admin' });
    expect(res.body.data.user.orgId).toEqual(expect.any(String));
  });

  test('register rejects a duplicate email with 409', async () => {
    const user = await registerUser('dupe');
    const res = await request(app).post('/api/auth/register').send({ email: user.email, password: 'TestPass123!' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('register rejects a missing password with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'nopass@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CREDENTIALS_REQUIRED');
  });

  test('login succeeds with correct credentials', async () => {
    const user = await registerUser('login');
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(user.email);
  });

  test('login rejects an unknown email with 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('login rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    const user = await registerUser('wrongpw');
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'totallyWrong123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('refresh issues a new token pair and rotates the old refresh token out', async () => {
    const user = await registerUser('refresh');
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: user.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).not.toBe(user.refreshToken);

    // Reusing the now-rotated-out original refresh token must fail.
    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  test('refresh rejects a garbage token with 401', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  test('logout revokes the refresh token so it can no longer be used', async () => {
    const user = await registerUser('logout');
    const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken: user.refreshToken });
    expect(logoutRes.status).toBe(200);

    const refreshAfterLogout = await request(app).post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });

  test('a protected route rejects requests with no Authorization header', async () => {
    const res = await request(app).get('/api/suppliers');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  test('a protected route rejects a malformed/invalid access token', async () => {
    const res = await request(app).get('/api/suppliers').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });
});
