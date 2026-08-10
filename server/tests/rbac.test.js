const requireRole = require('../middleware/requireRole');
const db = require('./db');
const { app, request, registerUser } = require('./helpers');

// Tests the middleware in isolation with mock req/res/next - no app, no DB,
// no HTTP. This is the actual gate every admin-only route in the app relies
// on, so its allow/deny logic deserves a direct unit test independent of any
// particular route wiring it correctly.
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requireRole middleware', () => {
  test('calls next() with no error when req.user.role is in the allowed list', () => {
    const req = { user: { role: 'admin' } };
    const next = jest.fn();
    requireRole('admin')(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  test('calls next(err) with a 403 ApiError when req.user.role is not in the allowed list', () => {
    const req = { user: { role: 'viewer' } };
    const next = jest.fn();
    requireRole('admin')(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  test('calls next(err) with 403 when req.user is missing entirely', () => {
    const req = {};
    const next = jest.fn();
    requireRole('admin')(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  test('accepts multiple allowed roles', () => {
    const next = jest.fn();
    requireRole('admin', 'viewer')({ user: { role: 'viewer' } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  test('a role not in a multi-role list is still rejected', () => {
    const next = jest.fn();
    requireRole('admin', 'viewer')({ user: { role: 'superuser' } }, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});

// The mocked-req/res tests above prove requireRole's own logic is correct in
// isolation, but until POST /org/invite-user existed, that logic was
// unreachable in practice: /auth/register always creates an admin, so no
// real request could ever arrive with role: 'viewer'. This block drives the
// real app + a real DB end to end to confirm the gate now corresponds to an
// actually-provisionable account, not just something testable via a mock.
describe('POST /org/invite-user (closing the previously-unreachable viewer-role gap)', () => {
  beforeAll(async () => { await db.connect(); });
  afterEach(async () => { await db.clearDatabase(); });
  afterAll(async () => { await db.disconnect(); });

  test('an admin can create a real viewer account in their own org', async () => {
    const admin = await registerUser('inviteAdmin');
    const viewerEmail = `viewer_${Date.now()}@example.com`;

    const res = await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: viewerEmail, role: 'viewer', orgId: admin.user.orgId });
  });

  test('the created viewer account can really log in and receives a viewer-role token', async () => {
    const admin = await registerUser('inviteAdmin2');
    const viewerEmail = `viewer2_${Date.now()}@example.com`;

    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: viewerEmail, password: 'ViewerPass123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('viewer');
    expect(loginRes.body.data.user.orgId).toBe(admin.user.orgId);
  });

  test('the real logged-in viewer is genuinely blocked from an admin-only route - the gate now guards a reachable account, not just a mock', async () => {
    const admin = await registerUser('inviteAdmin3');
    const viewerEmail = `viewer3_${Date.now()}@example.com`;

    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: viewerEmail, password: 'ViewerPass123!' });
    const viewerToken = loginRes.body.data.accessToken;

    const blocked = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Should Be Blocked', country: 'US' });

    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('FORBIDDEN');

    // Confirm the real viewer CAN still do viewer-level things (read access) -
    // the gate is a genuine allow/deny, not an accidental full lockout.
    const allowed = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(allowed.status).toBe(200);
  });

  test('a viewer cannot invite other users - invite-user is admin-only too', async () => {
    const admin = await registerUser('inviteAdmin4');
    const viewerEmail = `viewer4_${Date.now()}@example.com`;

    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: viewerEmail, password: 'ViewerPass123!' });
    const viewerToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ email: `someone_else_${Date.now()}@example.com`, password: 'Whatever123!', role: 'viewer' });

    expect(res.status).toBe(403);
  });

  test('rejects a duplicate email with 409', async () => {
    const admin = await registerUser('inviteAdmin5');

    const res = await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: admin.user.email, password: 'ViewerPass123!', role: 'viewer' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('rejects an invalid role with a clean 400, not a Mongoose validation error', async () => {
    const admin = await registerUser('inviteAdmin6');

    const res = await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: `bad_role_${Date.now()}@example.com`, password: 'ViewerPass123!', role: 'superuser' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
