// Deterministic (no Gemini call) plain-language explanation for a risk/health
// score change - Phase 5's "Explainable AI" step. Inputs are always numbers
// already computed elsewhere (factors, org weights, previous/new score), so
// this is pure formatting logic, not another AI round-trip.

const RISK_FACTOR_LABELS = {
  newsScore: 'negative news sentiment',
  expiryScore: 'contract expiry timing',
  docScore: 'missing documents',
  countryScore: 'country risk',
};

const HEALTH_FACTOR_LABELS = {
  esgScore: 'ESG rating',
  logisticsScore: 'logistics performance',
  docCompletenessScore: 'document completeness',
  contractHealthScore: 'contract health',
  riskComponent: 'the underlying risk score',
};

const LABELS_BY_FORMULA = { risk: RISK_FACTOR_LABELS, health: HEALTH_FACTOR_LABELS };
const FORMULA_TITLE = { risk: 'Risk score', health: 'Health score' };

// Ranks each factor by its weighted contribution to what actually moved the
// score this time - not just by raw weight. When a previous factor snapshot
// is available (the prior history row for the same supplier), contribution
// is (currentValue - previousValue) * weight - literally how many points of
// the weighted raw score that factor's own change accounts for. Without a
// prior snapshot (a supplier's first-ever score change), falls back to
// value * weight - the factor's share of the current score, the best
// available signal for "what's driving this".
const rankContributions = (factors, weights, previousFactors) => Object.keys(weights)
  .map((key) => {
    const value = typeof factors?.[key] === 'number' ? factors[key] : null;
    const prevValue = typeof previousFactors?.[key] === 'number' ? previousFactors[key] : null;
    const weight = weights[key] || 0;
    let contribution = 0;
    if (value !== null && prevValue !== null) {
      contribution = (value - prevValue) * weight;
    } else if (value !== null) {
      contribution = value * weight;
    }
    return { key, weight, value, contribution };
  })
  .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

// factors/weights/previousFactors use the same key sets as
// riskScoreService.computeFactors / healthScoreService.computeHealthFactors
// and their matching RiskConfig weight objects.
exports.describeChange = ({ formulaKey, factors, previousFactors, weights, delta }) => {
  const title = FORMULA_TITLE[formulaKey] || formulaKey;
  const labels = LABELS_BY_FORMULA[formulaKey] || {};

  if (!delta) {
    return `${title} was recomputed with no net change.`;
  }

  const ranked = rankContributions(factors, weights, previousFactors)
    .filter((r) => Math.abs(r.contribution) > 0.01);

  const direction = delta > 0 ? 'rose' : 'fell';
  const magnitude = `${delta > 0 ? '+' : ''}${delta}`;

  if (ranked.length === 0) {
    return `${title} ${direction} by ${magnitude} points.`;
  }

  const top = ranked[0];
  const topLabel = labels[top.key] || top.key;
  let sentence = `${title} ${direction} by ${magnitude}, mainly because of ${topLabel} (${Math.round(top.weight * 100)}% of the formula)`;

  const second = ranked[1];
  if (second && Math.abs(second.contribution) >= Math.abs(top.contribution) * 0.15) {
    const secondLabel = labels[second.key] || second.key;
    sentence += `, with a smaller contribution from ${secondLabel} (${Math.round(second.weight * 100)}%)`;
  }

  return `${sentence}.`;
};

// Batch helper for a supplier's full RiskHistory/HealthHistory list (as
// already gathered by supplierAggregationService.gatherSupplierData) -
// walks the list oldest-first so each change is compared against the one
// immediately before it, and returns a Map of history row id -> narrative
// string. Used by both the timeline endpoint (every risk_changed/
// health_changed event) and the digital twin endpoint (just the latest
// change) so the two surfaces never compute this differently.
exports.buildNarrativesForHistory = (changes, weights, formulaKey) => {
  const sorted = [...changes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const narrativeById = new Map();
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    narrativeById.set(String(current._id), exports.describeChange({
      formulaKey,
      factors: current.factors,
      previousFactors: previous?.factors,
      weights,
      delta: current.delta,
    }));
  }
  return narrativeById;
};
