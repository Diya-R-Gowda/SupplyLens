const Document = require('../models/Document');
const HealthHistory = require('../models/HealthHistory');
const { isRateLimited, applyCappedDelta } = require('./scoringEngine');
const { getOrgWeights } = require('./riskConfigService');

// Same defaults as riskScoreService - not tuned differently on purpose,
// these are first-pass guardrail values either score can have independently
// re-tuned later (see TODO.md).
const MAX_SCORE_DELTA = 15;
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

// Health Score answers a genuinely different question than Risk Score:
// "is this a good, reliable, sustainable supplier to work with" rather than
// "how likely is disruption/loss". Two suppliers can have an identical risk
// score (same news sentiment, same contract timing) and a very different
// health score if one has strong ESG/logistics data and the other has
// none - that's the whole point of building this as a distinct metric
// rather than reusing riskScore's formula under a new name (the one thing
// the Phase 4 audit explicitly warned against).
//
// Weighted formula, same "always answerable from factors alone" philosophy
// as riskScore. As of Phase 5 the weights below are per-org configurable
// defaults (RiskConfig / riskConfigService.js) - the factor buckets
// themselves (what a 0-100 sub-score means) stay fixed in code:
//   - 25% ESG composite: average of environmental/social/governance scores
//     if ESG has been refreshed; 50 (neutral - unassessed, not unhealthy) if not.
//   - 20% logistics performance: onTimeDeliveryRate directly if known;
//     50 (neutral) if logistics has never been refreshed or came back null
//     (which is the common case - see enrichmentService.js).
//   - 15% document completeness: 0 docs -> 0, 1-2 -> 50, 3+ -> 100 (more
//     documentation on file is healthier - the inverse framing of riskScore's
//     docScore, which penalizes missing docs rather than rewarding complete ones).
//   - 15% contract health: no expiry on file -> 50 (neutral/unknown), >90
//     days remaining -> 100, 31-90 days -> 60 (fine, but renew soon),
//     <=30 days or already expired -> 20 (needs attention).
//   - 25% inverted risk score (100 - riskScore): risk IS one real input into
//     "is this supplier healthy", but deliberately not the dominant one -
//     capped at a quarter of the weight so ESG/logistics (45% combined) carry
//     more real influence than a straight risk-score inversion would.
const computeHealthFactors = async (supplier) => {
  const esgScore = (() => {
    const { environmentalScore, socialScore, governanceScore } = supplier.esg || {};
    const components = [environmentalScore, socialScore, governanceScore].filter(
      (value) => typeof value === 'number'
    );
    if (components.length === 0) return 50; // not yet refreshed - neutral, not unhealthy
    return Math.round(components.reduce((sum, value) => sum + value, 0) / components.length);
  })();

  const logisticsScore = typeof supplier.logistics?.onTimeDeliveryRate === 'number'
    ? supplier.logistics.onTimeDeliveryRate
    : 50; // not yet refreshed, or Gemini didn't have a real figure - neutral

  const docCount = await Document.countDocuments({ supplierId: supplier._id });
  const docCompletenessScore = docCount >= 3 ? 100 : (docCount >= 1 ? 50 : 0);

  let contractHealthScore = 50;
  if (supplier.contractExpiry) {
    const daysToExpiry = (new Date(supplier.contractExpiry) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysToExpiry <= 30) contractHealthScore = 20;
    else if (daysToExpiry <= 90) contractHealthScore = 60;
    else contractHealthScore = 100;
  }

  const riskComponent = 100 - supplier.riskScore;

  return { esgScore, logisticsScore, docCompletenessScore, contractHealthScore, riskComponent };
};

exports.computeHealthFactors = computeHealthFactors;

// Recomputes a supplier's health score and, if it actually changes,
// persists both the new score and a HealthHistory record - same
// cap/rate-limit guardrails as computeRiskScore, via the shared
// scoringEngine, but its own history model and rate-limit bucket (a risk
// update and a health update for the same underlying trigger, e.g.
// 'esg_update', don't block each other).
exports.computeHealthScore = async (supplier, reason = 'unspecified') => {
  if (await isRateLimited(HealthHistory, 'supplierId', supplier._id, reason, RATE_LIMIT_MS)) {
    return { updated: false, skippedReason: 'rate_limited' };
  }

  const factors = await computeHealthFactors(supplier);
  const { health: weights } = await getOrgWeights(supplier.orgId);
  const rawScore = Math.round(
    (factors.esgScore * weights.esgScore)
    + (factors.logisticsScore * weights.logisticsScore)
    + (factors.docCompletenessScore * weights.docCompletenessScore)
    + (factors.contractHealthScore * weights.contractHealthScore)
    + (factors.riskComponent * weights.riskComponent)
  );

  const previousScore = supplier.healthScore;
  const { newScore } = applyCappedDelta(previousScore, rawScore, MAX_SCORE_DELTA);

  if (newScore === previousScore) {
    return { updated: false, skippedReason: 'no_change' };
  }

  supplier.healthScore = newScore;
  await supplier.save();

  await HealthHistory.create({
    supplierId: supplier._id,
    orgId: supplier.orgId,
    previousScore,
    newScore,
    delta: newScore - previousScore,
    reason,
    factors,
  });

  return { updated: true, previousScore, newScore, delta: newScore - previousScore, reason };
};
