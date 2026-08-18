const db = require('./db');
const { registerUser } = require('./helpers');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Document = require('../models/Document');
const DocChunk = require('../models/DocChunk');
const NewsCache = require('../models/NewsCache');
const Conversation = require('../models/Conversation');
const RiskHistory = require('../models/RiskHistory');
const HealthHistory = require('../models/HealthHistory');
const SupplierSnapshot = require('../models/SupplierSnapshot');
const { uploadBuffer, getBucket } = require('../services/gridfsService');
const { deleteSupplierCascade } = require('../services/supplierCascadeService');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

// Builds one real row in every collection deleteSupplierCascade touches,
// plus a real GridFS binary - proving an actual cascade against real
// documents rather than trusting the code's own comment listing what it's
// supposed to clean up.
const buildFixtures = async (prefix) => {
  const org = await registerUser(prefix);
  const user = await User.findOne({ email: org.email });
  const supplier = await Supplier.create({ name: `CascadeMe_${prefix}`, country: 'US', category: 'saas', orgId: org.user.orgId });

  const gridFsFileId = await uploadBuffer(Buffer.from('pdf-bytes'), 'file.pdf', {});
  const doc = await Document.create({ supplierId: supplier._id, fileName: 'file.pdf', gridFsFileId });
  await DocChunk.create({ text: 'chunk text', supplierId: supplier._id, docId: doc._id, chunkIndex: 0 });
  await NewsCache.create({ supplierId: supplier._id, orgId: org.user.orgId, headline: 'headline', sentiment: 'negative' });
  await Conversation.create({
    supplierId: supplier._id, orgId: org.user.orgId, userId: user._id, messages: [{ role: 'user', content: 'hi' }],
  });
  await RiskHistory.create({
    supplierId: supplier._id, orgId: org.user.orgId, previousScore: 0, newScore: 10, delta: 10, reason: 'test', factors: {},
  });
  await HealthHistory.create({
    supplierId: supplier._id, orgId: org.user.orgId, previousScore: 50, newScore: 60, delta: 10, reason: 'test', factors: {},
  });
  await SupplierSnapshot.create({
    supplierId: supplier._id, orgId: org.user.orgId, reason: 'manual', state: { some: 'state' },
  });

  return { supplier, gridFsFileId };
};

describe('supplierCascadeService.deleteSupplierCascade', () => {
  test('deletes the supplier document itself', async () => {
    const { supplier } = await buildFixtures('cascadeSup1');
    await deleteSupplierCascade(supplier);
    expect(await Supplier.findById(supplier._id)).toBeNull();
  });

  test('deletes every collection that references the supplier: documents, doc chunks, news, conversations, risk/health history, snapshots', async () => {
    const { supplier } = await buildFixtures('cascadeSup2');
    const supplierId = supplier._id;

    await deleteSupplierCascade(supplier);

    const counts = await Promise.all([
      Document.countDocuments({ supplierId }),
      DocChunk.countDocuments({ supplierId }),
      NewsCache.countDocuments({ supplierId }),
      Conversation.countDocuments({ supplierId }),
      RiskHistory.countDocuments({ supplierId }),
      HealthHistory.countDocuments({ supplierId }),
      SupplierSnapshot.countDocuments({ supplierId }),
    ]);
    counts.forEach((count) => expect(count).toBe(0));
  });

  test('deletes the real GridFS binary the document referenced', async () => {
    const { supplier, gridFsFileId } = await buildFixtures('cascadeSup3');
    await deleteSupplierCascade(supplier);

    const remaining = await getBucket().find({ _id: gridFsFileId }).toArray();
    expect(remaining).toHaveLength(0);
  });

  test('never touches another supplier\'s data in the same collections', async () => {
    const { supplier: target } = await buildFixtures('cascadeSup4a');
    const { supplier: untouched } = await buildFixtures('cascadeSup4b');

    await deleteSupplierCascade(target);

    expect(await Supplier.findById(untouched._id)).not.toBeNull();
    expect(await Document.countDocuments({ supplierId: untouched._id })).toBe(1);
    expect(await NewsCache.countDocuments({ supplierId: untouched._id })).toBe(1);
    expect(await RiskHistory.countDocuments({ supplierId: untouched._id })).toBe(1);
  });

  test('is safe to call on a supplier with none of the optional referencing collections populated', async () => {
    const org = await registerUser('cascadeSupBare');
    const supplier = await Supplier.create({ name: 'Bare', country: 'US', orgId: org.user.orgId });

    await expect(deleteSupplierCascade(supplier)).resolves.not.toThrow();
    expect(await Supplier.findById(supplier._id)).toBeNull();
  });
});
