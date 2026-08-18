const db = require('./db');
const { app, request, registerUser } = require('./helpers');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

describe('GET /org/audit-logs', () => {
  test('a viewer is forbidden - this is admin-only', async () => {
    const admin = await registerUser('auditLogsViewerSetup');
    const viewerEmail = `auditLogsViewer_${Date.now()}@example.com`;
    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });
    const login = await request(app).post('/api/auth/login').send({ email: viewerEmail, password: 'ViewerPass123!' });

    const res = await request(app)
      .get('/api/org/audit-logs')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(res.status).toBe(403);
  });

  test('an admin with no actions yet gets an empty, well-shaped page', async () => {
    const admin = await registerUser('auditLogsEmpty');
    const res = await request(app)
      .get('/api/org/audit-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ logs: [], total: 0, page: 1, totalPages: 1 });
  });

  test('real admin actions appear, most recent first, with the acting user\'s email resolved', async () => {
    const admin = await registerUser('auditLogsRealActions');
    await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Logged Co', country: 'US' });
    await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ alertThresholds: { enabled: false } });

    const res = await request(app)
      .get('/api/org/audit-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.logs[0].action).toBe('riskConfig.updated'); // most recent first
    expect(res.body.data.logs[1].action).toBe('supplier.created');
    expect(res.body.data.logs.every((l) => l.userEmail === admin.user.email)).toBe(true);
  });

  test('never includes another org\'s audit log entries', async () => {
    const orgA = await registerUser('auditLogsIsolationA');
    const orgB = await registerUser('auditLogsIsolationB');
    await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: 'OrgA Private Co', country: 'US' });

    const res = await request(app)
      .get('/api/org/audit-logs')
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(res.body.data.total).toBe(0);
  });

  test('limit and page are respected, and totalPages is computed correctly', async () => {
    const admin = await registerUser('auditLogsPagination');
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ name: `Paginated Co ${i}`, country: 'US' });
    }

    const res = await request(app)
      .get('/api/org/audit-logs?page=2&limit=2')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.totalPages).toBe(3);
  });
});
