const db = require('./db');
const { app, request, registerUser } = require('./helpers');
const AuditLog = require('../models/AuditLog');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

// Cross-org isolation is already covered by orgScoping.test.js. This file
// covers what that one doesn't: create/update/delete validation and RBAC.
describe('POST /suppliers (create)', () => {
  test('a viewer is forbidden from creating a supplier', async () => {
    const admin = await registerUser('supplierCreateViewerSetup');
    const viewerEmail = `supplierCreateViewer_${Date.now()}@example.com`;
    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });
    const login = await request(app).post('/api/auth/login').send({ email: viewerEmail, password: 'ViewerPass123!' });

    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ name: 'Blocked Co', country: 'US' });

    expect(res.status).toBe(403);
  });

  test('a missing required field (country) is rejected with a clean VALIDATION_ERROR', async () => {
    const org = await registerUser('supplierCreateMissingCountry');
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'No Country Co' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('a country code that is not a 2-letter ISO code is rejected', async () => {
    const org = await registerUser('supplierCreateBadCountry');
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Bad Country Co', country: 'USA' });

    expect(res.status).toBe(400);
  });

  test('a lowercase country code is accepted and uppercased', async () => {
    const org = await registerUser('supplierCreateLowercaseCountry');
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Lowercase Co', country: 'us' });

    expect(res.status).toBe(201);
    expect(res.body.data.country).toBe('US');
  });

  test('an invalid category is rejected', async () => {
    const org = await registerUser('supplierCreateBadCategory');
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Bad Category Co', country: 'US', category: 'not-a-real-category' });

    expect(res.status).toBe(400);
  });

  test('riskScore out of the 0-100 range is rejected', async () => {
    const org = await registerUser('supplierCreateBadRiskScore');
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Bad Score Co', country: 'US', riskScore: 150 });

    expect(res.status).toBe(400);
  });

  test('a valid create succeeds, is scoped to the caller\'s org, and records a supplier.created audit log entry', async () => {
    const org = await registerUser('supplierCreateValid');
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Valid Co', country: 'US', category: 'saas', paymentTerms: 'Net 30' });

    expect(res.status).toBe(201);
    expect(res.body.data.orgId).toBe(org.user.orgId);
    expect(res.body.data.healthScore).toBe(50); // schema default

    const entry = await AuditLog.findOne({ orgId: org.user.orgId, action: 'supplier.created' });
    expect(entry).not.toBeNull();
    expect(entry.detail.name).toBe('Valid Co');
  });

  test('two suppliers with the same name in the same org are rejected (unique index)', async () => {
    const org = await registerUser('supplierCreateDuplicate');
    await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Duplicate Co', country: 'US' });

    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Duplicate Co', country: 'GB' });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /suppliers/:id (update)', () => {
  const createSupplier = async (org, overrides = {}) => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Update Target Co', country: 'US', ...overrides });
    return res.body.data._id;
  };

  test('a viewer is forbidden from updating a supplier', async () => {
    const admin = await registerUser('supplierUpdateViewerSetup');
    const supplierId = await createSupplier(admin);
    const viewerEmail = `supplierUpdateViewer_${Date.now()}@example.com`;
    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });
    const login = await request(app).post('/api/auth/login').send({ email: viewerEmail, password: 'ViewerPass123!' });

    const res = await request(app)
      .patch(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ name: 'Renamed Co' });

    expect(res.status).toBe(403);
  });

  test('a partial update changes only the given fields', async () => {
    const org = await registerUser('supplierUpdatePartial');
    const supplierId = await createSupplier(org, { category: 'saas', paymentTerms: 'Net 30' });

    const res = await request(app)
      .patch(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ paymentTerms: 'Net 60' });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentTerms).toBe('Net 60');
    expect(res.body.data.category).toBe('saas'); // untouched
  });

  test('an invalid field value on update is rejected the same as on create', async () => {
    const org = await registerUser('supplierUpdateInvalid');
    const supplierId = await createSupplier(org);

    const res = await request(app)
      .patch(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ country: 'USA' });

    expect(res.status).toBe(400);
  });

  test('a malformed id (not a valid ObjectId shape) is rejected as a clean 400, not a 500', async () => {
    const org = await registerUser('supplierUpdateBadId');
    const res = await request(app)
      .patch('/api/suppliers/not-a-real-id')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Whatever' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /suppliers/:id', () => {
  test('a viewer is forbidden from deleting a supplier', async () => {
    const admin = await registerUser('supplierDeleteViewerSetup');
    const createRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Delete Target Co', country: 'US' });
    const supplierId = createRes.body.data._id;

    const viewerEmail = `supplierDeleteViewer_${Date.now()}@example.com`;
    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });
    const login = await request(app).post('/api/auth/login').send({ email: viewerEmail, password: 'ViewerPass123!' });

    const res = await request(app)
      .delete(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(res.status).toBe(403);

    // Confirm it genuinely wasn't deleted.
    const stillThere = await request(app)
      .get(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(stillThere.status).toBe(200);
  });

  test('a successful delete records a supplier.deleted audit log entry with the pre-deletion name', async () => {
    const org = await registerUser('supplierDeleteAudit');
    const createRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Audited Delete Co', country: 'US' });
    const supplierId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(res.status).toBe(200);

    const entry = await AuditLog.findOne({ orgId: org.user.orgId, action: 'supplier.deleted' });
    expect(entry).not.toBeNull();
    expect(entry.detail.name).toBe('Audited Delete Co');

    const getRes = await request(app)
      .get(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(getRes.status).toBe(404);
  });
});
