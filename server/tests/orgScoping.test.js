const db = require('./db');
const { app, request, registerUser } = require('./helpers');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

// This project's most-repeated manual verification, turned into a real,
// repeatable suite: a record that belongs to a different org must 404, not
// 403 or leak any data - so a caller can never tell the difference between
// "doesn't exist" and "exists in someone else's org". Covers 4 endpoints
// spread across 4 different route files (not just suppliers.js), matching
// the pattern documented identically in each of their own Swagger blocks.
describe('cross-org isolation (404, never data leakage)', () => {
  let orgA;
  let orgB;
  let supplierIdInOrgA;

  beforeEach(async () => {
    orgA = await registerUser('orgA');
    orgB = await registerUser('orgB');

    const createRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: 'OrgA Only Supplier', country: 'US', category: 'raw_material' });
    supplierIdInOrgA = createRes.body.data._id;
  });

  test('GET /suppliers/:id - org B gets 404 for org A supplier, not the data', async () => {
    const res = await request(app)
      .get(`/api/suppliers/${supplierIdInOrgA}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();

    // Sanity check: org A itself can read it fine, confirming the 404 above
    // is genuinely org-scoping and not a bug that 404s for everyone.
    const ownRes = await request(app)
      .get(`/api/suppliers/${supplierIdInOrgA}`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);
    expect(ownRes.status).toBe(200);
  });

  test('GET /documents/:supplierId - org B gets 404, not org A\'s document list', async () => {
    const res = await request(app)
      .get(`/api/documents/${supplierIdInOrgA}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SUPPLIER_NOT_FOUND');
  });

  test('GET /news/:supplierId - org B gets 404, not org A\'s cached news', async () => {
    const res = await request(app)
      .get(`/api/news/${supplierIdInOrgA}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SUPPLIER_NOT_FOUND');
  });

  test('POST /rag/:supplierId - org B gets 404, cannot ask questions against org A\'s documents', async () => {
    const res = await request(app)
      .post(`/api/rag/${supplierIdInOrgA}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .send({ question: 'What are the payment terms?' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SUPPLIER_NOT_FOUND');
  });

  test('DELETE /suppliers/:id - org B (even as admin of its own org) cannot delete org A\'s supplier', async () => {
    const res = await request(app)
      .delete(`/api/suppliers/${supplierIdInOrgA}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(res.status).toBe(404);

    // Confirm it genuinely wasn't deleted - org A can still read it.
    const stillThere = await request(app)
      .get(`/api/suppliers/${supplierIdInOrgA}`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);
    expect(stillThere.status).toBe(200);
  });

  test('GET /suppliers (list) never includes another org\'s suppliers', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((s) => s._id);
    expect(ids).not.toContain(supplierIdInOrgA);
  });
});
