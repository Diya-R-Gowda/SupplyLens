const mongoose = require('mongoose');
const db = require('./db');
const { app, request, registerUser } = require('./helpers');
const Supplier = require('../models/Supplier');
const Document = require('../models/Document');
const HealthHistory = require('../models/HealthHistory');
const { computeHealthFactors, computeHealthScore } = require('../services/healthScoreService');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

const createSupplier = async (org, overrides = {}) => {
  const res = await request(app)
    .post('/api/suppliers')
    .set('Authorization', `Bearer ${org.accessToken}`)
    .send({
      name: overrides.name || `Supplier_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      country: overrides.country || 'US',
      category: 'raw_material',
    });
  return Supplier.findById(res.body.data._id);
};

describe('healthScoreService.computeHealthFactors', () => {
  test('esgScore: 50 (neutral) when never refreshed; otherwise the rounded average of whichever ESG components are present', async () => {
    const org = await registerUser('healthFactorsEsg');
    const supplier = await createSupplier(org);
    expect((await computeHealthFactors(supplier)).esgScore).toBe(50);

    supplier.esg = { refreshedAt: new Date(), environmentalScore: 60, socialScore: 80 }; // governanceScore absent
    expect((await computeHealthFactors(supplier)).esgScore).toBe(70); // avg of only the present components
  });

  test('logisticsScore: 50 (neutral) when never refreshed or the rate is null; otherwise the real rate', async () => {
    const org = await registerUser('healthFactorsLogistics');
    const supplier = await createSupplier(org);
    expect((await computeHealthFactors(supplier)).logisticsScore).toBe(50);

    supplier.logistics = { refreshedAt: new Date(), onTimeDeliveryRate: null }; // refreshed, but Gemini had no real figure
    expect((await computeHealthFactors(supplier)).logisticsScore).toBe(50);

    supplier.logistics = { refreshedAt: new Date(), onTimeDeliveryRate: 92 };
    expect((await computeHealthFactors(supplier)).logisticsScore).toBe(92);
  });

  test('docCompletenessScore: 0 docs is 0, 1-2 is 50, 3+ is 100 - the inverse framing of risk\'s docScore', async () => {
    const org = await registerUser('healthFactorsDocs');
    const supplier = await createSupplier(org);
    expect((await computeHealthFactors(supplier)).docCompletenessScore).toBe(0);

    await Document.create({ supplierId: supplier._id, fileName: 'a.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    expect((await computeHealthFactors(supplier)).docCompletenessScore).toBe(50);

    await Document.create({ supplierId: supplier._id, fileName: 'b.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    await Document.create({ supplierId: supplier._id, fileName: 'c.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    expect((await computeHealthFactors(supplier)).docCompletenessScore).toBe(100);
  });

  test('contractHealthScore: no expiry is 50 (neutral); <=30 days or expired is 20; 31-90 days is 60; >90 days is 100', async () => {
    const org = await registerUser('healthFactorsContract');
    const supplier = await createSupplier(org);
    expect((await computeHealthFactors(supplier)).contractHealthScore).toBe(50);

    supplier.contractExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000); // already expired
    expect((await computeHealthFactors(supplier)).contractHealthScore).toBe(20);

    supplier.contractExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    expect((await computeHealthFactors(supplier)).contractHealthScore).toBe(20);

    supplier.contractExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    expect((await computeHealthFactors(supplier)).contractHealthScore).toBe(60);

    supplier.contractExpiry = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    expect((await computeHealthFactors(supplier)).contractHealthScore).toBe(100);
  });

  test('riskComponent is 100 minus the supplier\'s current riskScore', async () => {
    const org = await registerUser('healthFactorsRiskComponent');
    const supplier = await createSupplier(org);
    supplier.riskScore = 30;
    expect((await computeHealthFactors(supplier)).riskComponent).toBe(70);
  });
});

describe('healthScoreService.computeHealthScore', () => {
  test('an update is capped at the max per-call delta and recorded as a real HealthHistory row with factors/weightsUsed', async () => {
    const org = await registerUser('healthComputeCapped');
    const supplier = await createSupplier(org);
    supplier.esg = { refreshedAt: new Date(), environmentalScore: 100, socialScore: 100, governanceScore: 100 };
    supplier.logistics = { refreshedAt: new Date(), onTimeDeliveryRate: 100 };
    supplier.contractExpiry = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000); // contractHealthScore 100
    await Document.create({ supplierId: supplier._id, fileName: 'a.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    await Document.create({ supplierId: supplier._id, fileName: 'b.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    await Document.create({ supplierId: supplier._id, fileName: 'c.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    // riskScore stays at the default 0 -> riskComponent 100. Every factor is
    // now 100, so the raw weighted score is 100 - a full 50-point jump from
    // the default healthScore of 50, well past MAX_SCORE_DELTA.

    const result = await computeHealthScore(supplier, 'unit_test_capped');

    expect(result.updated).toBe(true);
    expect(result.previousScore).toBe(50);
    expect(result.newScore).toBe(65); // 50 + capped delta of 15
    expect(result.delta).toBe(15);

    const history = await HealthHistory.findOne({ supplierId: supplier._id, reason: 'unit_test_capped' });
    expect(history).not.toBeNull();
    expect(history.factors).toMatchObject({ esgScore: 100, logisticsScore: 100, docCompletenessScore: 100, contractHealthScore: 100, riskComponent: 100 });
    expect(history.weightsUsed).toMatchObject({ esgScore: 0.25, logisticsScore: 0.2, docCompletenessScore: 0.15, contractHealthScore: 0.15, riskComponent: 0.25 });
  });

  test('a repeat call with the same reason inside the 24h rate-limit window is skipped, not re-scored', async () => {
    const org = await registerUser('healthComputeRateLimit');
    const supplier = await createSupplier(org);
    supplier.riskScore = 0; // ensure a real first change from the default healthScore

    const first = await computeHealthScore(supplier, 'dup_reason');
    expect(first.updated).toBe(true);

    const reloaded = await Supplier.findById(supplier._id);
    const second = await computeHealthScore(reloaded, 'dup_reason');
    expect(second).toEqual({ updated: false, skippedReason: 'rate_limited' });

    expect(await HealthHistory.countDocuments({ supplierId: supplier._id, reason: 'dup_reason' })).toBe(1);
  });

  test('a different reason is not blocked by another reason\'s rate limit (independent buckets)', async () => {
    const org = await registerUser('healthComputeBuckets');
    const supplier = await createSupplier(org);

    const first = await computeHealthScore(supplier, 'reason_a');
    expect(first.updated).toBe(true);

    const reloaded = await Supplier.findById(supplier._id);
    const second = await computeHealthScore(reloaded, 'reason_b');
    expect(second.skippedReason).not.toBe('rate_limited');
  });

  test('a raw score identical to the current score results in no_change and creates no new history row', async () => {
    const org = await registerUser('healthComputeNoChange');
    const supplier = await createSupplier(org);
    // Default supplier (no esg/logistics, 0 docs, no contractExpiry, riskScore 0):
    // 50*.25 + 50*.20 + 0*.15 + 50*.15 + 100*.25 = 55.
    supplier.healthScore = 55;
    await supplier.save();

    const result = await computeHealthScore(supplier, 'no_change_reason');
    expect(result).toEqual({ updated: false, skippedReason: 'no_change' });
    expect(await HealthHistory.countDocuments({ supplierId: supplier._id })).toBe(0);
  });

  test('uses the org\'s custom configured weights (via PATCH /org/risk-config), not the hardcoded defaults', async () => {
    const org = await registerUser('healthComputeCustomWeights');
    const patchRes = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ healthWeights: { esgScore: 0, logisticsScore: 0, docCompletenessScore: 0, contractHealthScore: 1, riskComponent: 0 } });
    expect(patchRes.status).toBe(200);

    const supplier = await createSupplier(org);
    supplier.contractExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // contractHealthScore 60

    const result = await computeHealthScore(supplier, 'custom_weights_reason');

    expect(result.updated).toBe(true);
    expect(result.newScore).toBe(60); // contractHealthScore(60) * weight(1), uncapped from default 50 (+10)

    const history = await HealthHistory.findOne({ supplierId: supplier._id, reason: 'custom_weights_reason' });
    expect(history.weightsUsed).toMatchObject({ esgScore: 0, logisticsScore: 0, docCompletenessScore: 0, contractHealthScore: 1, riskComponent: 0 });
  });
});
