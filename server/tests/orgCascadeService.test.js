const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { registerUser } = require('./helpers');
const User = require('../models/User');
const Organisation = require('../models/Organisation');
const Supplier = require('../models/Supplier');
const RiskConfig = require('../models/RiskConfig');
const Document = require('../models/Document');
const { deleteOrgCascade } = require('../services/orgCascadeService');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

// No route in the app deletes an Organisation or User today (register is
// the only place either is created) - this exercises deleteOrgCascade
// directly against real fixtures: a real org, more than one real user, a
// real RiskConfig, and a real supplier whose own cascade (proven separately
// in supplierCascadeService.test.js) must fire transitively too.
const buildFixtures = async (prefix) => {
  const admin = await registerUser(prefix);
  const orgId = admin.user.orgId;

  await User.create({
    email: `member_${prefix}_${Date.now()}@example.com`,
    password: await bcrypt.hash('MemberPass123!', 10),
    role: 'viewer',
    orgId,
  });

  const supplier = await Supplier.create({ name: `OrgCascadeSupplier_${prefix}`, country: 'US', category: 'saas', orgId });
  await Document.create({ supplierId: supplier._id, fileName: 'a.pdf', gridFsFileId: new mongoose.Types.ObjectId() });

  await RiskConfig.create({ orgId });

  const org = await Organisation.findById(orgId);
  return { org, orgId, supplierId: supplier._id };
};

describe('orgCascadeService.deleteOrgCascade', () => {
  test('deletes the organisation document itself', async () => {
    const { org, orgId } = await buildFixtures('orgCascade1');
    await deleteOrgCascade(org);
    expect(await Organisation.findById(orgId)).toBeNull();
  });

  test('deletes every user in the org, not just the admin who registered it', async () => {
    const { org, orgId } = await buildFixtures('orgCascade2');
    expect(await User.countDocuments({ orgId })).toBe(2); // admin + the added viewer

    await deleteOrgCascade(org);
    expect(await User.countDocuments({ orgId })).toBe(0);
  });

  test('deletes the org\'s RiskConfig document', async () => {
    const { org, orgId } = await buildFixtures('orgCascade3');
    await deleteOrgCascade(org);
    expect(await RiskConfig.countDocuments({ orgId })).toBe(0);
  });

  test('cascades transitively to every supplier in the org and that supplier\'s own referencing collections', async () => {
    const { org, supplierId } = await buildFixtures('orgCascade4');
    await deleteOrgCascade(org);

    expect(await Supplier.findById(supplierId)).toBeNull();
    expect(await Document.countDocuments({ supplierId })).toBe(0);
  });

  test('never touches a different organisation\'s users, suppliers, or config', async () => {
    const { org } = await buildFixtures('orgCascade5');
    const { orgId: otherOrgId, supplierId: otherSupplierId } = await buildFixtures('orgCascade5other');

    await deleteOrgCascade(org);

    expect(await Organisation.findById(otherOrgId)).not.toBeNull();
    expect(await User.countDocuments({ orgId: otherOrgId })).toBe(2);
    expect(await Supplier.findById(otherSupplierId)).not.toBeNull();
    expect(await RiskConfig.countDocuments({ orgId: otherOrgId })).toBe(1);
  });

  test('is safe to call on an org with no suppliers at all', async () => {
    const admin = await registerUser('orgCascadeNoSuppliers');
    const orgId = admin.user.orgId;
    // registerUser seeds one starter supplier - remove it so this org
    // genuinely has zero suppliers, proving Promise.all([]) over an empty
    // supplier list doesn't throw.
    await Supplier.deleteMany({ orgId });
    const org = await Organisation.findById(orgId);

    await expect(deleteOrgCascade(org)).resolves.not.toThrow();
    expect(await Organisation.findById(orgId)).toBeNull();
  });
});
