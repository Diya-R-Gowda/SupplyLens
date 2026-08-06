const NewsCache = require('../models/NewsCache');
const Document = require('../models/Document');
const RiskHistory = require('../models/RiskHistory');
const countryRiskMap = require('../data/countryRisk.json');
const { isRateLimited, applyCappedDelta } = require('./scoringEngine');
const { getOrgWeights } = require('./riskConfigService');

// Caps how much a single call can move the score, so a burst of negative
// news (or a batch cron run touching many articles at once) can't produce a
// nonsensical single-step jump - the score still moves toward the "correct"
// weighted value, just gradually across multiple triggered updates.
const MAX_SCORE_DELTA = 15;

// Guards against the same trigger type re-scoring a supplier repeatedly in a
// short window (e.g. several manual refreshes in a row) - at most one actual
// score change per reason per supplier per day. Different reasons (news vs.
// enrichment) are tracked independently, so one doesn't block the other.
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

// Weighted, explainable v1 formula - deliberately not a black-box model, so
// "why did this score change" is always answerable from `factors` alone. The
// factor *buckets* below are fixed in code (what a 0-100 sub-score means for
// each signal); the *weights* combining them are per-org configurable via
// RiskConfig (Phase 5 - riskConfigService.js), defaulting to these values:
//   - 40% news sentiment: 2+ negative articles in the cache -> 100, 1 -> 50, 0 -> 0
//   - 30% contract expiry: <=30 days -> 100, <=90 days -> 50, unknown -> 75 (treated as risky), else 0
//   - 20% missing documents: 0 docs -> 100, 1-2 -> 50, 3+ -> 0
//   - 10% country risk: static lookup table (server/data/countryRisk.json), default 50 if not listed
// Exported (not just used internally by computeRiskScore) so the Digital
// Twin endpoint can show the *current* factor breakdown on every read,
// independent of whether an actual score update has fired recently - the
// last RiskHistory row reflects the factors at the time of the last
// *change*, which can be stale if nothing has moved the score in a while.
const computeFactors = async (supplier) => {
  const news = await NewsCache.find({ supplierId: supplier._id });
  const negativeArticles = news.filter((n) => n.sentiment === 'negative').length;
  const newsScore = negativeArticles >= 2 ? 100 : (negativeArticles === 1 ? 50 : 0);

  let expiryScore = 0;
  if (supplier.contractExpiry) {
    const daysToExpiry = (new Date(supplier.contractExpiry) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysToExpiry <= 30) expiryScore = 100;
    else if (daysToExpiry <= 90) expiryScore = 50;
  } else {
    expiryScore = 75;
  }

  const docCount = await Document.countDocuments({ supplierId: supplier._id });
  const docScore = docCount >= 3 ? 0 : (docCount >= 1 ? 50 : 100);

  const countryScore = countryRiskMap[supplier.country] || 50;

  return { newsScore, expiryScore, docScore, countryScore };
};

exports.computeFactors = computeFactors;

// Recomputes a supplier's risk score and, if it actually changes, persists
// both the new score and a RiskHistory record explaining why. `reason` is
// the trigger type (e.g. 'scheduled_news_update', 'manual_news_refresh',
// 'enrichment_update') and doubles as the rate-limit bucket.
exports.computeRiskScore = async (supplier, reason = 'unspecified') => {
  if (await isRateLimited(RiskHistory, 'supplierId', supplier._id, reason, RATE_LIMIT_MS)) {
    return { updated: false, skippedReason: 'rate_limited' };
  }

  const factors = await computeFactors(supplier);
  const { risk: weights } = await getOrgWeights(supplier.orgId);
  const rawScore = Math.round(
    (factors.newsScore * weights.newsScore)
    + (factors.expiryScore * weights.expiryScore)
    + (factors.docScore * weights.docScore)
    + (factors.countryScore * weights.countryScore)
  );

  const previousScore = supplier.riskScore;
  const { newScore } = applyCappedDelta(previousScore, rawScore, MAX_SCORE_DELTA);

  if (newScore === previousScore) {
    return { updated: false, skippedReason: 'no_change' };
  }

  supplier.riskScore = newScore;
  await supplier.save();

  await RiskHistory.create({
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
