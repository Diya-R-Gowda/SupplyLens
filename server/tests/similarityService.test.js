const mongoose = require('mongoose');
const db = require('./db');
const { registerUser } = require('./helpers');
const Supplier = require('../models/Supplier');
const { scoreCandidate, findAlternativeSuppliers } = require('../services/similarityService');

// scoreCandidate itself is pure (no DB) - proximityScore isn't separately
// exported, so its behavior is verified through scoreCandidate, the actual
// public surface concentrationGraphService.js also reuses. The category
// hard-filter lives one level up, in findAlternativeSuppliers' candidate
// query, so that part needs a real DB (mongodb-memory-server).
describe('similarityService.scoreCandidate (pure scoring)', () => {
  const flagsNone = { risk: false, health: false };
  const flagsBoth = { risk: true, health: true };

  test('country match adds 25 points; a mismatch adds none', () => {
    const target = { country: 'US' };
    const match = scoreCandidate(target, flagsNone, { country: 'US' }, flagsNone);
    const mismatch = scoreCandidate(target, flagsNone, { country: 'GB' }, flagsNone);
    expect(match.score).toBe(25);
    expect(mismatch.score).toBe(0);
    // country is always compared and reported, regardless of match
    expect(match.comparedOn).toEqual(['category', 'country']);
    expect(mismatch.comparedOn).toEqual(['category', 'country']);
  });

  test('risk/health proximity only counts when BOTH suppliers have an actual assessed-score flag', () => {
    const target = { country: 'CN', riskScore: 50, healthScore: 50 };
    const candidate = { country: 'CN', riskScore: 50, healthScore: 50 };

    const noFlags = scoreCandidate(target, flagsNone, candidate, flagsNone);
    expect(noFlags.comparedOn).not.toContain('riskScore');
    expect(noFlags.comparedOn).not.toContain('healthScore');
    expect(noFlags.score).toBe(25); // country match only

    const withFlags = scoreCandidate(target, flagsBoth, candidate, flagsBoth);
    expect(withFlags.comparedOn).toEqual(expect.arrayContaining(['riskScore', 'healthScore']));
    expect(withFlags.score).toBeGreaterThan(noFlags.score);
  });

  test('one-sided assessed flags (only target OR only candidate has real history) still exclude the comparison', () => {
    const target = { country: 'CN', riskScore: 50 };
    const candidate = { country: 'CN', riskScore: 50 };
    const targetOnly = scoreCandidate(target, { risk: true, health: false }, candidate, { risk: false, health: false });
    expect(targetOnly.comparedOn).not.toContain('riskScore');
  });

  test('identical risk scores get full proximity points plus the lower-risk performance nudge', () => {
    const target = { country: 'CN', riskScore: 40 };
    const candidate = { country: 'CN', riskScore: 40 };
    const result = scoreCandidate(target, { risk: true, health: false }, candidate, { risk: true, health: false });
    // country(25) + proximity(20, diff 0) + performance bonus (100-40)*0.1=6
    expect(result.score).toBeCloseTo(25 + 20 + 6, 5);
  });

  test('a lower-risk candidate outscores an equally-close higher-risk one via the performance nudge', () => {
    const target = { country: 'CN', riskScore: 50 };
    const lowRisk = scoreCandidate(target, { risk: true, health: false }, { country: 'CN', riskScore: 40 }, { risk: true, health: false });
    const highRisk = scoreCandidate(target, { risk: true, health: false }, { country: 'CN', riskScore: 60 }, { risk: true, health: false });
    // Both are 10 points away from target (identical proximity score), but
    // lower risk gets a bigger (100-risk)*0.1 nudge.
    expect(lowRisk.score).toBeGreaterThan(highRisk.score);
  });

  test('a higher-health candidate outscores an equally-close lower-health one via the performance nudge', () => {
    const target = { country: 'CN', healthScore: 50 };
    const highHealth = scoreCandidate(target, { risk: false, health: true }, { country: 'CN', healthScore: 60 }, { risk: false, health: true });
    const lowHealth = scoreCandidate(target, { risk: false, health: true }, { country: 'CN', healthScore: 40 }, { risk: false, health: true });
    expect(highHealth.score).toBeGreaterThan(lowHealth.score);
  });

  test('industry match (case-insensitive) only counts when BOTH suppliers have real enrichment on file', () => {
    const target = { country: 'US', enrichment: { enrichedAt: new Date(), industry: 'Automotive' } };
    const match = scoreCandidate(target, flagsNone, { country: 'GB', enrichment: { enrichedAt: new Date(), industry: 'automotive' } }, flagsNone);
    const mismatch = scoreCandidate(target, flagsNone, { country: 'GB', enrichment: { enrichedAt: new Date(), industry: 'Retail' } }, flagsNone);
    const noEnrichment = scoreCandidate(target, flagsNone, { country: 'GB' }, flagsNone);

    expect(match.score).toBe(15);
    expect(mismatch.score).toBe(0);
    expect(mismatch.comparedOn).toContain('enrichment.industry'); // compared, just didn't match
    expect(noEnrichment.comparedOn).not.toContain('enrichment.industry'); // never compared at all
  });

  test('ESG proximity only counts when both suppliers have refreshed ESG data with numeric environmental scores', () => {
    const target = { country: 'US', esg: { refreshedAt: new Date(), environmentalScore: 60 } };
    const withEsg = scoreCandidate(target, flagsNone, { country: 'GB', esg: { refreshedAt: new Date(), environmentalScore: 60 } }, flagsNone);
    const withoutEsg = scoreCandidate(target, flagsNone, { country: 'GB' }, flagsNone);

    expect(withEsg.comparedOn).toContain('esg');
    expect(withEsg.score).toBe(10); // full 10 points, identical scores
    expect(withoutEsg.comparedOn).not.toContain('esg');
  });

  test('logistics proximity only counts when both suppliers have refreshed logistics data with a numeric on-time rate', () => {
    const target = { country: 'US', logistics: { refreshedAt: new Date(), onTimeDeliveryRate: 90 } };
    const withLogistics = scoreCandidate(target, flagsNone, { country: 'GB', logistics: { refreshedAt: new Date(), onTimeDeliveryRate: 80 } }, flagsNone);
    const withoutLogistics = scoreCandidate(target, flagsNone, { country: 'GB' }, flagsNone);

    expect(withLogistics.comparedOn).toContain('logistics.onTimeDeliveryRate');
    expect(withLogistics.score).toBeCloseTo(10 * (1 - 10 / 100), 5);
    expect(withoutLogistics.comparedOn).not.toContain('logistics.onTimeDeliveryRate');
  });

  test('the final score is always rounded to one decimal place', () => {
    const target = { country: 'US', riskScore: 33 };
    const candidate = { country: 'US', riskScore: 37 };
    const result = scoreCandidate(target, { risk: true, health: false }, candidate, { risk: true, health: false });
    expect(Math.round(result.score * 10) / 10).toBe(result.score);
  });
});

describe('similarityService.findAlternativeSuppliers - category hard filter (real DB)', () => {
  beforeAll(async () => { await db.connect(); });
  afterEach(async () => { await db.clearDatabase(); });
  afterAll(async () => { await db.disconnect(); });

  test('a supplier with no category set returns no_category_set without querying candidates', async () => {
    const org = await registerUser('simNoCat');
    const supplier = await Supplier.create({ name: 'NoCat', country: 'US', orgId: org.user.orgId });

    const result = await findAlternativeSuppliers(supplier);
    expect(result.status).toBe('no_alternatives_found');
    expect(result.reason).toBe('no_category_set');
    expect(result.candidatePoolSize).toBe(0);
  });

  test('no other suppliers sharing the category returns no_other_suppliers_in_category, even if other suppliers exist', async () => {
    const org = await registerUser('simLonely');
    const supplier = await Supplier.create({ name: 'Lonely', country: 'US', category: 'saas', orgId: org.user.orgId });
    await Supplier.create({ name: 'DifferentCat', country: 'US', category: 'logistics', orgId: org.user.orgId });

    const result = await findAlternativeSuppliers(supplier);
    expect(result.status).toBe('no_alternatives_found');
    expect(result.reason).toBe('no_other_suppliers_in_category');
  });

  test('category is a hard filter: a same-country, different-category supplier never appears as an alternative', async () => {
    const org = await registerUser('simHardFilter');
    const target = await Supplier.create({ name: 'Target', country: 'US', category: 'saas', orgId: org.user.orgId });
    const sameCategory = await Supplier.create({ name: 'SameCat', country: 'GB', category: 'saas', orgId: org.user.orgId });
    await Supplier.create({ name: 'OtherCat', country: 'US', category: 'logistics', orgId: org.user.orgId }); // same country, wrong category

    const result = await findAlternativeSuppliers(target);
    expect(result.status).toBe('ok');
    expect(result.candidatePoolSize).toBe(1);
    expect(result.alternatives.map((a) => a.name)).toEqual(['SameCat']);
    expect(String(result.alternatives[0].supplierId)).toBe(String(sameCategory._id));
  });

  test('never includes suppliers from a different org, even in the same category', async () => {
    const org = await registerUser('simOrgIsolation');
    const otherOrgId = new mongoose.Types.ObjectId();
    const target = await Supplier.create({ name: 'Target2', country: 'US', category: 'saas', orgId: org.user.orgId });
    await Supplier.create({ name: 'OtherOrgSameCat', country: 'US', category: 'saas', orgId: otherOrgId });

    const result = await findAlternativeSuppliers(target);
    expect(result.status).toBe('no_alternatives_found');
  });

  test('results are sorted by similarityScore, highest first', async () => {
    const org = await registerUser('simSort');
    const target = await Supplier.create({ name: 'Target3', country: 'US', category: 'saas', orgId: org.user.orgId });
    await Supplier.create({ name: 'CloseMatch', country: 'US', category: 'saas', orgId: org.user.orgId }); // country match = 25
    await Supplier.create({ name: 'FarMatch', country: 'FR', category: 'saas', orgId: org.user.orgId }); // no country match = 0

    const result = await findAlternativeSuppliers(target);
    expect(result.alternatives[0].name).toBe('CloseMatch');
    expect(result.alternatives[0].similarityScore).toBeGreaterThan(result.alternatives[1].similarityScore);
  });
});
