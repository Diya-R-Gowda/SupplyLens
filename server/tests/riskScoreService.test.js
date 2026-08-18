const mongoose = require('mongoose');
const db = require('./db');
const { app, request, registerUser } = require('./helpers');
const Supplier = require('../models/Supplier');
const NewsCache = require('../models/NewsCache');
const Document = require('../models/Document');
const RiskHistory = require('../models/RiskHistory');
const { computeFactors, computeRiskScore } = require('../services/riskScoreService');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

// Created through the real API (matching this project's established
// test-data pattern) so orgId/auth are genuine, then re-fetched as a real
// Mongoose document since computeRiskScore calls supplier.save().
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

describe('riskScoreService.computeFactors', () => {
  test('newsScore: 0 negative articles is 0, 1 is 50, 2+ is 100 - positive/neutral articles never count', async () => {
    const org = await registerUser('riskFactorsNews');
    const supplier = await createSupplier(org);

    expect((await computeFactors(supplier)).newsScore).toBe(0);

    await NewsCache.create({ supplierId: supplier._id, orgId: org.user.orgId, headline: 'good', sentiment: 'positive' });
    expect((await computeFactors(supplier)).newsScore).toBe(0);

    await NewsCache.create({ supplierId: supplier._id, orgId: org.user.orgId, headline: 'bad1', sentiment: 'negative' });
    expect((await computeFactors(supplier)).newsScore).toBe(50);

    await NewsCache.create({ supplierId: supplier._id, orgId: org.user.orgId, headline: 'bad2', sentiment: 'negative' });
    expect((await computeFactors(supplier)).newsScore).toBe(100);
  });

  test('expiryScore: no contractExpiry is treated as risky (75); <=30 days is 100; <=90 days is 50; further out is 0', async () => {
    const org = await registerUser('riskFactorsExpiry');
    const supplier = await createSupplier(org);

    expect((await computeFactors(supplier)).expiryScore).toBe(75);

    supplier.contractExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    expect((await computeFactors(supplier)).expiryScore).toBe(100);

    supplier.contractExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    expect((await computeFactors(supplier)).expiryScore).toBe(50);

    supplier.contractExpiry = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    expect((await computeFactors(supplier)).expiryScore).toBe(0);
  });

  test('docScore: 0 docs is 100 (risky, inverted from health\'s docCompletenessScore); 1-2 is 50; 3+ is 0', async () => {
    const org = await registerUser('riskFactorsDocs');
    const supplier = await createSupplier(org);

    expect((await computeFactors(supplier)).docScore).toBe(100);

    await Document.create({ supplierId: supplier._id, fileName: 'a.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    expect((await computeFactors(supplier)).docScore).toBe(50);

    await Document.create({ supplierId: supplier._id, fileName: 'b.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    await Document.create({ supplierId: supplier._id, fileName: 'c.pdf', gridFsFileId: new mongoose.Types.ObjectId() });
    expect((await computeFactors(supplier)).docScore).toBe(0);
  });

  test('countryScore comes from the static lookup table, defaulting to 50 for an unlisted country code', async () => {
    const org = await registerUser('riskFactorsCountry');
    const usSupplier = await createSupplier(org, { country: 'US', name: 'US Co' });
    expect((await computeFactors(usSupplier)).countryScore).toBe(10);

    const jpSupplier = await createSupplier(org, { country: 'JP', name: 'JP Co' }); // valid ISO code, not in countryRisk.json
    expect((await computeFactors(jpSupplier)).countryScore).toBe(50);
  });
});

describe('riskScoreService.computeRiskScore', () => {
  test('an update is capped at the max per-call delta and recorded as a real RiskHistory row with factors/weightsUsed', async () => {
    const org = await registerUser('riskComputeCapped');
    // 2 negative articles + soon-expiring contract + 0 docs + risky country ->
    // a raw score far above the default 0, forcing the cap to kick in.
    const supplier = await createSupplier(org, { country: 'CN' });
    await NewsCache.create({ supplierId: supplier._id, orgId: org.user.orgId, headline: 'a', sentiment: 'negative' });
    await NewsCache.create({ supplierId: supplier._id, orgId: org.user.orgId, headline: 'b', sentiment: 'negative' });

    const result = await computeRiskScore(supplier, 'unit_test_capped');

    expect(result.updated).toBe(true);
    expect(result.previousScore).toBe(0);
    expect(result.newScore).toBe(15); // capped at MAX_SCORE_DELTA
    expect(result.delta).toBe(15);

    const history = await RiskHistory.findOne({ supplierId: supplier._id, reason: 'unit_test_capped' });
    expect(history).not.toBeNull();
    expect(history.previousScore).toBe(0);
    expect(history.newScore).toBe(15);
    expect(history.factors).toMatchObject({ newsScore: 100, docScore: 100 });
    expect(history.weightsUsed).toMatchObject({ newsScore: 0.4, expiryScore: 0.3, docScore: 0.2, countryScore: 0.1 });
  });

  test('a repeat call with the same reason inside the 24h rate-limit window is skipped, not re-scored', async () => {
    const org = await registerUser('riskComputeRateLimit');
    const supplier = await createSupplier(org);

    const first = await computeRiskScore(supplier, 'dup_reason');
    expect(first.updated).toBe(true);

    const reloaded = await Supplier.findById(supplier._id);
    const second = await computeRiskScore(reloaded, 'dup_reason');
    expect(second).toEqual({ updated: false, skippedReason: 'rate_limited' });

    const rows = await RiskHistory.find({ supplierId: supplier._id, reason: 'dup_reason' });
    expect(rows).toHaveLength(1); // no duplicate history row from the skipped call
  });

  test('a different reason is not blocked by another reason\'s rate limit (independent buckets)', async () => {
    const org = await registerUser('riskComputeBuckets');
    const supplier = await createSupplier(org);

    const first = await computeRiskScore(supplier, 'reason_a');
    expect(first.updated).toBe(true);

    const reloaded = await Supplier.findById(supplier._id);
    const second = await computeRiskScore(reloaded, 'reason_b');
    expect(second.skippedReason).not.toBe('rate_limited');
  });

  test('a raw score identical to the current score results in no_change and creates no new history row', async () => {
    const org = await registerUser('riskComputeNoChange');
    const supplier = await createSupplier(org, { country: 'US' });
    // Default supplier (no news, no contractExpiry, no docs, country US) has
    // a deterministic raw score: 0*.4 + 75*.3 + 100*.2 + 10*.1 = 44.
    supplier.riskScore = 44;
    await supplier.save();

    const result = await computeRiskScore(supplier, 'no_change_reason');
    expect(result).toEqual({ updated: false, skippedReason: 'no_change' });
    expect(await RiskHistory.countDocuments({ supplierId: supplier._id })).toBe(0);
  });

  test('uses the org\'s custom configured weights (via PATCH /org/risk-config), not the hardcoded defaults', async () => {
    const org = await registerUser('riskComputeCustomWeights');
    // All weight on countryScore, so the raw score is driven purely by the
    // country lookup (10 for US) - an unambiguous way to prove the custom
    // weights, not the defaults, were actually used.
    const patchRes = await request(app)
      .patch('/api/org/risk-config')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskWeights: { newsScore: 0, expiryScore: 0, docScore: 0, countryScore: 1 } });
    expect(patchRes.status).toBe(200);

    const supplier = await createSupplier(org, { country: 'US' });
    const result = await computeRiskScore(supplier, 'custom_weights_reason');

    expect(result.updated).toBe(true);
    expect(result.newScore).toBe(10); // countryScore(10) * weight(1), uncapped

    const history = await RiskHistory.findOne({ supplierId: supplier._id, reason: 'custom_weights_reason' });
    expect(history.weightsUsed).toMatchObject({ newsScore: 0, expiryScore: 0, docScore: 0, countryScore: 1 });
  });
});
