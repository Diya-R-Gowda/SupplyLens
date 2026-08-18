const db = require('./db');
const Organisation = require('../models/Organisation');
const User = require('../models/User');
const { backfillAdminCounts } = require('../scripts/backfillAdminCount');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

const makeOrg = async (name, adminCountField) => {
  const org = await Organisation.create({ name, adminCount: adminCountField });
  return org;
};

const makeUser = async (orgId, role) => User.create({
  email: `${role}_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
  password: 'irrelevant-hash',
  role,
  orgId,
});

describe('backfillAdminCounts (pre-existing-data migration)', () => {
  test('an org whose adminCount field is missing/stale is corrected to the real admin count', async () => {
    const org = await makeOrg('Stale Org', 999); // deliberately wrong
    await makeUser(org._id, 'admin');
    await makeUser(org._id, 'admin');
    await makeUser(org._id, 'viewer');

    const results = await backfillAdminCounts();

    const entry = results.find((r) => r.orgId === String(org._id));
    expect(entry.changed).toBe(true);
    expect(entry.realAdminCount).toBe(2);

    const reloaded = await Organisation.findById(org._id);
    expect(reloaded.adminCount).toBe(2);
  });

  test('an org whose adminCount is already correct is left alone (reports changed: false)', async () => {
    const org = await makeOrg('Already Correct Org', 1);
    await makeUser(org._id, 'admin');
    await makeUser(org._id, 'viewer');

    const results = await backfillAdminCounts();

    const entry = results.find((r) => r.orgId === String(org._id));
    expect(entry.changed).toBe(false);
    expect(entry.realAdminCount).toBe(1);
  });

  test('an org with zero admins (edge case, should not exist via the real API, but backfill must not crash) is set to 0', async () => {
    const org = await makeOrg('Zero Admin Org', 1);
    await makeUser(org._id, 'viewer');

    const results = await backfillAdminCounts();

    const entry = results.find((r) => r.orgId === String(org._id));
    expect(entry.realAdminCount).toBe(0);
    const reloaded = await Organisation.findById(org._id);
    expect(reloaded.adminCount).toBe(0);
  });

  test('is idempotent - running it twice in a row produces the same, stable result', async () => {
    const org = await makeOrg('Idempotency Org', 5);
    await makeUser(org._id, 'admin');
    await makeUser(org._id, 'admin');
    await makeUser(org._id, 'admin');

    await backfillAdminCounts();
    const secondRun = await backfillAdminCounts();

    const entry = secondRun.find((r) => r.orgId === String(org._id));
    expect(entry.changed).toBe(false); // already fixed by the first run
    expect(entry.previousAdminCount).toBe(3);
    expect(entry.realAdminCount).toBe(3);
  });

  test('multiple orgs are each corrected independently, never cross-contaminating counts', async () => {
    const orgA = await makeOrg('Org A', 0);
    const orgB = await makeOrg('Org B', 0);
    await makeUser(orgA._id, 'admin');
    await makeUser(orgB._id, 'admin');
    await makeUser(orgB._id, 'admin');

    await backfillAdminCounts();

    expect((await Organisation.findById(orgA._id)).adminCount).toBe(1);
    expect((await Organisation.findById(orgB._id)).adminCount).toBe(2);
  });
});
