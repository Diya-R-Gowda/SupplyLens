// Deterministic (no Gemini call) plain-language explanation for a risk/health
// score change - Phase 5's "Explainable AI" step. Inputs are always numbers
// already computed elsewhere (factors, weight snapshots, previous/new score),
// so this is pure formatting logic, not another AI round-trip.

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
// score this time - not just by raw weight, and not just by whether the raw
// factor value itself changed. Weights are per-org configurable and can be
// edited between two measurements (Phase 5 Step 1), so a factor's
// contribution can shift even when its own value didn't - e.g. its weight
// being edited to zero removes its entire prior contribution. Each
// measurement uses its OWN weight snapshot (RiskHistory/HealthHistory's
// weightsUsed field): contribution = (value_now * weight_now) -
// (value_prev * weight_prev). Without a prior snapshot (a supplier's
// first-ever score change), falls back to value_now * weight_now - the
// factor's share of the current score.
const rankContributions = (factors, currentWeights, previousFactors, previousWeights) => Object.keys(currentWeights)
  .map((key) => {
    const value = typeof factors?.[key] === 'number' ? factors[key] : null;
    const prevValue = typeof previousFactors?.[key] === 'number' ? previousFactors[key] : null;
    const weight = currentWeights[key] || 0;
    const prevWeight = typeof previousWeights?.[key] === 'number' ? previousWeights[key] : weight;
    let contribution = 0;
    if (value !== null && prevValue !== null) {
      contribution = (value * weight) - (prevValue * prevWeight);
    } else if (value !== null) {
      contribution = value * weight;
    }
    return { key, weight, value, contribution };
  })
  .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

// factors/currentWeights/previousFactors/previousWeights use the same key
// sets as riskScoreService.computeFactors / healthScoreService.computeHealthFactors
// and their matching RiskConfig weight objects.
//
// IMPORTANT: the reported delta is the actual (possibly capped, see
// scoringEngine.applyCappedDelta) score movement. A factor's own ranked
// contribution can still point in a different direction than the overall
// delta's sign - e.g. when an earlier capped jump is still working itself
// out, or when several factors' weights were edited at once and partially
// offset each other. To stay honest about this, the sentence never claims a
// factor's direction *caused* the overall rise/fall - it states the
// observed score movement and the dominant factor's own movement as
// separate facts. See TODO.md for this as a documented, accepted limitation
// of a deterministic v1 explanation.
exports.describeChange = ({ formulaKey, factors, previousFactors, currentWeights, previousWeights, delta }) => {
  const title = FORMULA_TITLE[formulaKey] || formulaKey;
  const labels = LABELS_BY_FORMULA[formulaKey] || {};

  if (!delta) {
    return `${title} was recomputed with no net change.`;
  }

  const direction = delta > 0 ? 'rose' : 'fell';
  const magnitude = `${delta > 0 ? '+' : ''}${delta}`;
  const headline = `${title} ${direction} by ${magnitude}`;

  const hasPrevious = !!previousFactors;
  const ranked = rankContributions(factors, currentWeights, previousFactors, previousWeights)
    .filter((r) => Math.abs(r.contribution) > 0.01);

  if (ranked.length === 0) {
    return `${headline}.`;
  }

  const possessive = (label) => (label.endsWith('s') ? `${label}'` : `${label}'s`);

  const describeFactor = (r) => {
    const label = labels[r.key] || r.key;
    const pct = Math.round(r.weight * 100);
    if (hasPrevious) {
      const factorDirection = r.contribution > 0 ? 'increased' : 'decreased';
      return `${possessive(label)} contribution ${factorDirection} (now ${pct}% of the formula)`;
    }
    return `${label} (${pct}% of the formula)`;
  };

  const top = ranked[0];
  const second = ranked[1];
  const hasSecond = second && Math.abs(second.contribution) >= Math.abs(top.contribution) * 0.15;

  const lead = hasPrevious ? 'mainly because' : 'primarily driven by';
  let sentence = `${headline}, ${lead} ${describeFactor(top)}`;
  if (hasSecond) {
    sentence += hasPrevious ? `, and ${describeFactor(second)}` : `, with ${describeFactor(second)} also contributing`;
  }

  return `${sentence}.`;
};

// Batch helper for a supplier's full RiskHistory/HealthHistory list (as
// already gathered by supplierAggregationService.gatherSupplierData) -
// walks the list oldest-first so each change is compared against the one
// immediately before it, and returns a Map of history row id -> narrative
// string. `currentOrgWeights` is used as the weight snapshot for any row
// that predates the weightsUsed field (written before this migration).
// Used by both the timeline endpoint (every risk_changed/health_changed
// event) and the digital twin endpoint (just the latest change) so the two
// surfaces never explain the same change differently.
exports.buildNarrativesForHistory = (changes, currentOrgWeights, formulaKey) => {
  const sorted = [...changes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const narrativeById = new Map();
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    narrativeById.set(String(current._id), exports.describeChange({
      formulaKey,
      factors: current.factors,
      previousFactors: previous?.factors,
      currentWeights: current.weightsUsed || currentOrgWeights,
      previousWeights: previous ? (previous.weightsUsed || currentOrgWeights) : undefined,
      delta: current.delta,
    }));
  }
  return narrativeById;
};
