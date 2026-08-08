const Supplier = require('../models/Supplier');
const { hasAssessedRisk, hasAssessedHealth } = require('./simulationService');

// Phase 7 Step 3 - Alternative Supplier Recommendations. Hand-rolled scoring
// (no ML/embedding similarity), consistent with this app's established
// "explainable, not a black box" philosophy (riskScoreService.js,
// forecastService.js). Category is a hard filter - a raw_material supplier
// is never a sensible "alternative" to a saas one - everything else is a
// SOFT, honestly-gated scoring dimension that only counts when it's actually
// real data on both suppliers being compared, never assumed populated.
const CATEGORY_MATCH_POINTS = 0; // implicit - candidate pool is already filtered to this
const COUNTRY_MATCH_POINTS = 25;
const SCORE_PROXIMITY_MAX_POINTS = 20; // per dimension (risk, health)
const INDUSTRY_MATCH_POINTS = 15;
const ESG_PROXIMITY_MAX_POINTS = 10;
const LOGISTICS_PROXIMITY_MAX_POINTS = 10;
const PERFORMANCE_BONUS_SCALE = 0.1; // small nudge toward lower-risk/higher-health candidates

const proximityScore = (a, b, maxPoints, maxDiff = 100) => Math.max(0, maxPoints * (1 - Math.abs(a - b) / maxDiff));

// A never-computed riskScore/healthScore still sitting at the schema default
// (0 / 50) isn't real signal - same reasoning healthScore's own default
// already documents. Only compared when BOTH suppliers have at least one
// real history row, i.e. an actual computed assessment has happened.
const buildAssessmentFlags = async (supplier) => ({
  risk: await hasAssessedRisk(supplier._id),
  health: await hasAssessedHealth(supplier._id),
});

const scoreCandidate = (target, targetFlags, candidate, candidateFlags) => {
  let score = 0;
  const comparedOn = ['category'];

  if (candidate.country === target.country) {
    score += COUNTRY_MATCH_POINTS;
  }
  comparedOn.push('country');

  if (targetFlags.risk && candidateFlags.risk) {
    score += proximityScore(target.riskScore, candidate.riskScore, SCORE_PROXIMITY_MAX_POINTS);
    score += (100 - candidate.riskScore) * PERFORMANCE_BONUS_SCALE; // performance nudge: prefer lower risk
    comparedOn.push('riskScore');
  }
  if (targetFlags.health && candidateFlags.health) {
    score += proximityScore(target.healthScore, candidate.healthScore, SCORE_PROXIMITY_MAX_POINTS);
    score += candidate.healthScore * PERFORMANCE_BONUS_SCALE; // performance nudge: prefer higher health
    comparedOn.push('healthScore');
  }

  const targetHasEnrichment = !!target.enrichment?.enrichedAt;
  const candidateHasEnrichment = !!candidate.enrichment?.enrichedAt;
  if (targetHasEnrichment && candidateHasEnrichment) {
    comparedOn.push('enrichment.industry');
    if (target.enrichment.industry && candidate.enrichment.industry
      && target.enrichment.industry.toLowerCase() === candidate.enrichment.industry.toLowerCase()) {
      score += INDUSTRY_MATCH_POINTS;
    }
  }

  const targetHasEsg = !!target.esg?.refreshedAt;
  const candidateHasEsg = !!candidate.esg?.refreshedAt;
  if (targetHasEsg && candidateHasEsg
    && typeof target.esg.environmentalScore === 'number' && typeof candidate.esg.environmentalScore === 'number') {
    comparedOn.push('esg');
    score += proximityScore(target.esg.environmentalScore, candidate.esg.environmentalScore, ESG_PROXIMITY_MAX_POINTS);
  }

  const targetHasLogistics = !!target.logistics?.refreshedAt;
  const candidateHasLogistics = !!candidate.logistics?.refreshedAt;
  if (targetHasLogistics && candidateHasLogistics
    && typeof target.logistics.onTimeDeliveryRate === 'number' && typeof candidate.logistics.onTimeDeliveryRate === 'number') {
    comparedOn.push('logistics.onTimeDeliveryRate');
    score += proximityScore(target.logistics.onTimeDeliveryRate, candidate.logistics.onTimeDeliveryRate, LOGISTICS_PROXIMITY_MAX_POINTS);
  }

  return { score: Math.round(score * 10) / 10, comparedOn };
};

exports.findAlternativeSuppliers = async (supplier) => {
  if (!supplier.category) {
    return {
      status: 'no_alternatives_found',
      reason: 'no_category_set',
      candidatePoolSize: 0,
      message: `${supplier.name} has no category set, so no comparable-category alternatives can be identified.`,
    };
  }

  const candidates = await Supplier.find({
    orgId: supplier.orgId, category: supplier.category, _id: { $ne: supplier._id },
  }).lean();

  if (candidates.length === 0) {
    return {
      status: 'no_alternatives_found',
      reason: 'no_other_suppliers_in_category',
      candidatePoolSize: 0,
      message: `No other suppliers found in the "${supplier.category}" category to compare against - this is the honest current answer, not a bug, given how sparse the current supplier set is.`,
    };
  }

  const targetFlags = await buildAssessmentFlags(supplier);
  const scored = [];
  let riskHealthAvailableFor = 0;
  let enrichmentAvailableFor = 0;
  let esgAvailableFor = 0;
  let logisticsAvailableFor = 0;

  for (const candidate of candidates) {
    const candidateFlags = await buildAssessmentFlags(candidate);
    const { score, comparedOn } = scoreCandidate(supplier, targetFlags, candidate, candidateFlags);

    if (comparedOn.includes('riskScore') || comparedOn.includes('healthScore')) riskHealthAvailableFor += 1;
    if (comparedOn.includes('enrichment.industry')) enrichmentAvailableFor += 1;
    if (comparedOn.includes('esg')) esgAvailableFor += 1;
    if (comparedOn.includes('logistics.onTimeDeliveryRate')) logisticsAvailableFor += 1;

    scored.push({
      supplierId: candidate._id,
      name: candidate.name,
      category: candidate.category,
      country: candidate.country,
      riskScore: candidate.riskScore,
      healthScore: candidate.healthScore,
      similarityScore: score,
      comparedOn,
    });
  }

  scored.sort((a, b) => b.similarityScore - a.similarityScore);

  const candidatePoolSize = candidates.length;
  const message = `${candidatePoolSize} supplier(s) found in the "${supplier.category}" category. `
    + `Category and country were compared for all ${candidatePoolSize}. `
    + `Risk/health score comparison required both suppliers to have an actual assessed score history (not just the untouched default), and was available for ${riskHealthAvailableFor} of ${candidatePoolSize}. `
    + `Enrichment comparison was available for ${enrichmentAvailableFor} of ${candidatePoolSize}; ESG for ${esgAvailableFor} of ${candidatePoolSize}; logistics for ${logisticsAvailableFor} of ${candidatePoolSize}.`;

  return {
    status: 'ok',
    candidatePoolSize,
    comparisonBasis: {
      always: ['category', 'country'],
      riskHealthAvailableFor,
      enrichmentAvailableFor,
      esgAvailableFor,
      logisticsAvailableFor,
    },
    alternatives: scored,
    message,
  };
};
