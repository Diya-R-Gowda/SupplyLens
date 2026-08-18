const db = require('./db');
const { app, request, registerUser } = require('./helpers');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Organisation = require('../models/Organisation');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

describe('GET /org/risk-config', () => {
  test('any authenticated user (not just admin) gets the hardcoded defaults for a fresh org', async () => {
    const org = await registerUser('riskConfigGet');
    const res = await request(app)
      .get('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isDefault).toBe(true);
    expect(res.body.data.riskWeights).toMatchObject({ newsScore: 0.4, expiryScore: 0.3, docScore: 0.2, countryScore: 0.1 });
    expect(res.body.data.alertThresholds).toMatchObject({ riskThreshold: 70, healthThreshold: 30, enabled: true });
  });
});

describe('PATCH /org/risk-config - weight-sum validation edge cases', () => {
  test('a viewer is forbidden - this is admin-only', async () => {
    const admin = await registerUser('riskConfigViewerSetup');
    const viewerEmail = `riskConfigViewer_${Date.now()}@example.com`;
    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });
    const login = await request(app).post('/api/auth/login').send({ email: viewerEmail, password: 'ViewerPass123!' });

    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ riskWeights: { newsScore: 1, expiryScore: 0, docScore: 0, countryScore: 0 } });

    expect(res.status).toBe(403);
  });

  test('an empty body (nothing to update) is rejected with NO_CONFIG_PROVIDED', async () => {
    const org = await registerUser('riskConfigEmpty');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_CONFIG_PROVIDED');
  });

  test('a non-object riskWeights value is rejected as a clean VALIDATION_ERROR, not a 500', async () => {
    const org = await registerUser('riskConfigNonObject');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskWeights: 'not-an-object' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('missing weight fields are rejected with INVALID_CONFIG, listing what is missing', async () => {
    const org = await registerUser('riskConfigMissingFields');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskWeights: { newsScore: 0.5, expiryScore: 0.5 } }); // docScore/countryScore missing

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CONFIG');
    expect(res.body.error.details.problems.join(' ')).toMatch(/Missing weight fields/);
  });

  test('an unknown extra weight field is rejected with INVALID_CONFIG', async () => {
    const org = await registerUser('riskConfigExtraField');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({
        riskWeights: {
          newsScore: 0.25, expiryScore: 0.25, docScore: 0.25, countryScore: 0.15, bogusScore: 0.1,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.details.problems.join(' ')).toMatch(/Unknown weight fields/);
  });

  test('a weight outside 0-1 is rejected with INVALID_CONFIG', async () => {
    const org = await registerUser('riskConfigOutOfRange');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskWeights: { newsScore: 1.5, expiryScore: -0.2, docScore: 0.2, countryScore: 0.1 } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CONFIG');
  });

  test('weights that do not sum to 1 are rejected outright, not silently normalized', async () => {
    const org = await registerUser('riskConfigBadSum');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskWeights: { newsScore: 0.1, expiryScore: 0.1, docScore: 0.1, countryScore: 0.1 } }); // sums to 0.4

    expect(res.status).toBe(400);
    expect(res.body.error.details.problems.join(' ')).toMatch(/must sum to 1/);
  });

  test('weights summing to 1 within the documented floating-point tolerance succeed', async () => {
    const org = await registerUser('riskConfigTolerance');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskWeights: { newsScore: 0.4, expiryScore: 0.3, docScore: 0.2, countryScore: 0.1004 } }); // sum 1.0004, within 0.005 tolerance

    expect(res.status).toBe(200);
    expect(res.body.data.isDefault).toBe(false);
  });

  test('a fully valid riskWeights update persists and is reflected on the next GET', async () => {
    const org = await registerUser('riskConfigPersist');
    const newWeights = { newsScore: 0.25, expiryScore: 0.25, docScore: 0.25, countryScore: 0.25 };
    const patchRes = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskWeights: newWeights });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.riskWeights).toMatchObject(newWeights);

    const getRes = await request(app)
      .get('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(getRes.body.data.riskWeights).toMatchObject(newWeights);
    expect(getRes.body.data.isDefault).toBe(false);
  });

  test('healthWeights are validated with the same missing-field/sum rules as riskWeights', async () => {
    const org = await registerUser('riskConfigHealthWeights');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ healthWeights: { esgScore: 0.5, logisticsScore: 0.5 } }); // missing 3 fields

    expect(res.status).toBe(400);
    expect(res.body.error.details.problems.join(' ')).toMatch(/Missing weight fields/);
  });

  test('alertThresholds accepts a partial object with no sum constraint (e.g. just toggling enabled)', async () => {
    const org = await registerUser('riskConfigThresholdPartial');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ alertThresholds: { enabled: false } });

    expect(res.status).toBe(200);
    expect(res.body.data.alertThresholds).toMatchObject({ enabled: false, riskThreshold: 70, healthThreshold: 30 });
  });

  test('an out-of-range alertThreshold value is rejected', async () => {
    const org = await registerUser('riskConfigThresholdRange');
    const res = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ alertThresholds: { riskThreshold: 150 } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CONFIG');
  });

  test('a successful update records a riskConfig.updated audit log entry', async () => {
    const org = await registerUser('riskConfigAudit');
    await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ alertThresholds: { enabled: false } });

    const entry = await AuditLog.findOne({ orgId: org.user.orgId, action: 'riskConfig.updated' });
    expect(entry).not.toBeNull();
    expect(entry.detail.fieldsChanged).toEqual(['alertThresholds']);
  });
});

describe('GET /org/users (role-management: list org members)', () => {
  test('an admin sees every member of their org (email + role only), sorted by email', async () => {
    const admin = await registerUser('orgUsersList');
    const viewerEmail = `zzz_viewer_${Date.now()}@example.com`;
    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });

    const res = await request(app)
      .get('/api/org/users')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    const emails = res.body.data.map((u) => u.email);
    expect(emails).toContain(admin.user.email); // registerUser's top-level `.email` keeps the pre-lowercase original casing; `.user.email` is the real, DB-sourced value
    expect(emails).toContain(viewerEmail);
    expect([...emails].sort()).toEqual(emails); // sorted by email
    res.body.data.forEach((u) => expect(u.password).toBeUndefined());
  });

  test('a viewer is forbidden from listing org members', async () => {
    const admin = await registerUser('orgUsersListViewer');
    const viewerEmail = `viewer_${Date.now()}@example.com`;
    await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: viewerEmail, password: 'ViewerPass123!', role: 'viewer' });
    const login = await request(app).post('/api/auth/login').send({ email: viewerEmail, password: 'ViewerPass123!' });

    const res = await request(app)
      .get('/api/org/users')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  test('never includes another org\'s members', async () => {
    const orgA = await registerUser('orgUsersIsolationA');
    const orgB = await registerUser('orgUsersIsolationB');

    const res = await request(app)
      .get('/api/org/users')
      .set('Authorization', `Bearer ${orgA.accessToken}`);

    expect(res.body.data.map((u) => u.email)).not.toContain(orgB.email);
  });
});

describe('PATCH /org/users/:userId/role (role-management: change a member\'s role)', () => {
  const inviteViewer = async (admin, prefix) => {
    const email = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
    const res = await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email, password: 'ViewerPass123!', role: 'viewer' });
    return { email, userId: res.body.data ? undefined : undefined, role: res.body.data.role };
  };

  const getUserId = async (admin, email) => {
    const listRes = await request(app).get('/api/org/users').set('Authorization', `Bearer ${admin.accessToken}`);
    return listRes.body.data.find((u) => u.email === email)._id;
  };

  test('an admin can promote a viewer to admin', async () => {
    const admin = await registerUser('roleUpdatePromote');
    const { email } = await inviteViewer(admin, 'promote');
    const userId = await getUserId(admin, email);

    const res = await request(app)
      .patch(`/api/org/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('admin');
  });

  test('promoting a viewer to admin increments Organisation.adminCount', async () => {
    const admin = await registerUser('roleUpdatePromoteCounter');
    const { email } = await inviteViewer(admin, 'promotecounter');
    const userId = await getUserId(admin, email);

    expect(await Organisation.findById(admin.user.orgId).then((o) => o.adminCount)).toBe(1);

    const res = await request(app)
      .patch(`/api/org/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(await Organisation.findById(admin.user.orgId).then((o) => o.adminCount)).toBe(2);
  });

  test('an admin can demote a second admin to viewer (not the last admin)', async () => {
    const admin = await registerUser('roleUpdateDemote');
    const { email } = await inviteViewer(admin, 'tobeadmin');
    const userId = await getUserId(admin, email);
    await request(app).patch(`/api/org/users/${userId}/role`).set('Authorization', `Bearer ${admin.accessToken}`).send({ role: 'admin' });

    const res = await request(app)
      .patch(`/api/org/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('viewer');
  });

  test('a viewer is forbidden from changing anyone\'s role', async () => {
    const admin = await registerUser('roleUpdateViewerForbidden');
    const { email } = await inviteViewer(admin, 'target');
    const userId = await getUserId(admin, email);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'ViewerPass123!' });
    const res = await request(app)
      .patch(`/api/org/users/${userId}/role`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(403);
  });

  test('an admin cannot change their own role (sidesteps lockout logic entirely)', async () => {
    const admin = await registerUser('roleUpdateSelf');
    const selfId = await getUserId(admin, admin.user.email);

    const res = await request(app)
      .patch(`/api/org/users/${selfId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_ROLE_CHANGE');
  });

  // The LAST_ADMIN branch (orgConfig.js's `if (adminCount <= 1) throw ...
  // LAST_ADMIN`) can't be reached through a normal same-session sequence of
  // calls: requireRole('admin') means the caller is always an admin, and the
  // SELF_ROLE_CHANGE check above it already rejects a caller demoting
  // themselves - so by the time the admin-count check runs, caller and
  // target are always two distinct admins, making adminCount >= 2. The
  // *practical* protection against a fresh org losing its last admin holds
  // via SELF_ROLE_CHANGE alone. LAST_ADMIN itself is kept as defense-in-depth
  // against a caller whose token still claims admin but whose DB role has
  // since desynced (see orgConfig.js's comment on that check) - exercised
  // below by simulating exactly that desync directly.
  test('a lone admin cannot demote themselves - self-role-change fires first, which as a side effect keeps a fresh org from ever reaching zero admins', async () => {
    const admin = await registerUser('roleUpdateLoneAdminSelf');
    const selfId = await getUserId(admin, admin.user.email);

    const res = await request(app)
      .patch(`/api/org/users/${selfId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_ROLE_CHANGE');
  });

  test('with two admins, one can demote the other (a non-self admin-to-admin demotion) without any last-admin rejection', async () => {
    const admin = await registerUser('roleUpdateTwoAdmins');
    const { email } = await inviteViewer(admin, 'secondadmin');
    const secondUserId = await getUserId(admin, email);
    await request(app).patch(`/api/org/users/${secondUserId}/role`).set('Authorization', `Bearer ${admin.accessToken}`).send({ role: 'admin' });

    const res = await request(app)
      .patch(`/api/org/users/${secondUserId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('viewer');
  });

  test('two admins racing to demote each other (a real TOCTOU race, not sequential) leaves exactly one admin, never zero', async () => {
    const admin = await registerUser('roleUpdateRaceA');
    const inviteRes = await request(app)
      .post('/api/org/invite-user')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: `roleUpdateRaceB_${Date.now()}@example.com`, password: 'TestPass123!', role: 'admin' });
    const emailB = inviteRes.body.data.email;
    const loginB = await request(app).post('/api/auth/login').send({ email: emailB, password: 'TestPass123!' });
    const tokenB = loginB.body.data.accessToken;

    const listRes = await request(app).get('/api/org/users').set('Authorization', `Bearer ${admin.accessToken}`);
    const users = listRes.body.data;
    const idA = users.find((u) => u.email !== emailB)._id;
    const idB = users.find((u) => u.email === emailB)._id;

    expect(await User.countDocuments({ orgId: admin.user.orgId, role: 'admin' })).toBe(2);

    // Genuinely concurrent, not two awaited-in-sequence calls: both PATCH
    // requests are in flight at once, each trying to demote the other admin.
    // A bare session.withTransaction() (tried first, see TODO.md/the route's
    // own comment) does NOT close this race - both requests read overlapping
    // data but write to two different User documents, so MongoDB has no
    // document-level conflict to detect and both silently succeeded, leaving
    // zero admins. Reproduced for real with this exact test shape before the
    // Organisation.adminCount atomic-counter fix landed.
    const [resAtoB, resBtoA] = await Promise.all([
      request(app).patch(`/api/org/users/${idB}/role`).set('Authorization', `Bearer ${admin.accessToken}`).send({ role: 'viewer' }),
      request(app).patch(`/api/org/users/${idA}/role`).set('Authorization', `Bearer ${tokenB}`).send({ role: 'viewer' }),
    ]);

    const statuses = [resAtoB.status, resBtoA.status].sort();
    expect(statuses).toEqual([200, 400]); // one genuinely succeeds, one genuinely rejected - not both, not neither
    const rejected = resAtoB.status === 400 ? resAtoB : resBtoA;
    expect(rejected.body.error.code).toBe('LAST_ADMIN');

    const realAdminCount = await User.countDocuments({ orgId: admin.user.orgId, role: 'admin' });
    const orgAdminCount = await Organisation.findById(admin.user.orgId).then((o) => o.adminCount);
    expect(realAdminCount).toBe(1);
    expect(orgAdminCount).toBe(1);
    expect(orgAdminCount).toBe(realAdminCount); // the atomic counter and reality never drifted apart
  });

  test('LAST_ADMIN trusts Organisation.adminCount as the source of truth, not a live User recount', async () => {
    // The guard is now a fast atomic counter check, not a live
    // countDocuments() - correct and race-safe in normal operation (see the
    // concurrency test above), but that means it's only as accurate as the
    // counter itself. Simulates the counter having drifted stale (e.g. an
    // org from before scripts/backfillAdminCount.js existed, or some other
    // write bypassing this route) even though 2 real admins genuinely exist
    // in the User collection - the route correctly enforces against the
    // counter's value, not reality, which is the honest tradeoff of moving
    // off a live recount. See TODO.md for the fuller writeup.
    const admin = await registerUser('roleUpdateStaleCounter');
    const { email } = await inviteViewer(admin, 'stalecountersecond');
    const secondUserId = await getUserId(admin, email);
    await request(app).patch(`/api/org/users/${secondUserId}/role`).set('Authorization', `Bearer ${admin.accessToken}`).send({ role: 'admin' });
    expect(await User.countDocuments({ orgId: admin.user.orgId, role: 'admin' })).toBe(2); // 2 real admins

    await Organisation.updateOne({ _id: admin.user.orgId }, { adminCount: 1 }); // counter says otherwise

    const res = await request(app)
      .patch(`/api/org/users/${secondUserId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LAST_ADMIN');
  });

  test('a 404, not 403, is returned for a userId outside the caller\'s org (never confirms it exists elsewhere)', async () => {
    const orgA = await registerUser('roleUpdateCrossOrgA');
    const orgB = await registerUser('roleUpdateCrossOrgB');
    const targetInOrgB = await getUserId(orgB, orgB.user.email);

    const res = await request(app)
      .patch(`/api/org/users/${targetInOrgB}/role`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  test('an invalid role value is rejected with a clean VALIDATION_ERROR', async () => {
    const admin = await registerUser('roleUpdateInvalidRole');
    const { email } = await inviteViewer(admin, 'badrole');
    const userId = await getUserId(admin, email);

    const res = await request(app)
      .patch(`/api/org/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'superuser' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('a successful role change records a user.role_updated audit log entry', async () => {
    const admin = await registerUser('roleUpdateAudit');
    const { email } = await inviteViewer(admin, 'audited');
    const userId = await getUserId(admin, email);

    await request(app)
      .patch(`/api/org/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'admin' });

    const entry = await AuditLog.findOne({ orgId: admin.user.orgId, action: 'user.role_updated' });
    expect(entry).not.toBeNull();
    expect(entry.detail).toMatchObject({ email, oldRole: 'viewer', newRole: 'admin' });
  });
});
