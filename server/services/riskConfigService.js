const RiskConfig = require('../models/RiskConfig');
const { RISK_DEFAULT_WEIGHTS, HEALTH_DEFAULT_WEIGHTS } = RiskConfig;

// Tolerance for floating-point sums (0.4+0.3+0.2+0.1 isn't always exactly
// 1.0 in IEEE754) - not a leniency toward genuinely mis-entered weights.
const SUM_TOLERANCE = 0.005;

const sumWeights = (weights) => Object.values(weights).reduce((sum, v) => sum + v, 0);

// Hard-validates (not auto-normalizes) - see RiskConfig.js's comment and
// TODO.md for the reasoning. Returns an array of human-readable problems;
// empty array means valid.
const validateWeights = (weights, expectedKeys) => {
  const problems = [];
  const keys = Object.keys(weights || {});
  const missing = expectedKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !expectedKeys.includes(k));
  if (missing.length) problems.push(`Missing weight fields: ${missing.join(', ')}`);
  if (extra.length) problems.push(`Unknown weight fields: ${extra.join(', ')}`);
  if (problems.length) return problems; // don't attempt a sum check on a malformed shape

  for (const k of expectedKeys) {
    if (typeof weights[k] !== 'number' || Number.isNaN(weights[k]) || weights[k] < 0 || weights[k] > 1) {
      problems.push(`${k} must be a number between 0 and 1`);
    }
  }
  if (problems.length) return problems;

  const sum = sumWeights(weights);
  if (Math.abs(sum - 1) > SUM_TOLERANCE) {
    problems.push(`Weights must sum to 1 (got ${sum.toFixed(4)})`);
  }
  return problems;
};

exports.validateRiskWeights = (weights) => validateWeights(weights, Object.keys(RISK_DEFAULT_WEIGHTS));
exports.validateHealthWeights = (weights) => validateWeights(weights, Object.keys(HEALTH_DEFAULT_WEIGHTS));

// Read-only lookup used by the scoring services - deliberately does NOT
// create a document if one doesn't exist yet (that only happens on the
// first PATCH, in upsertOrgConfig below), so an org that never opens
// settings never accumulates a placeholder row.
exports.getOrgWeights = async (orgId) => {
  const config = await RiskConfig.findOne({ orgId }).lean();
  return {
    risk: config?.riskWeights || RISK_DEFAULT_WEIGHTS,
    health: config?.healthWeights || HEALTH_DEFAULT_WEIGHTS,
  };
};

exports.getOrgConfig = async (orgId) => {
  const config = await RiskConfig.findOne({ orgId }).lean();
  return {
    riskWeights: config?.riskWeights || RISK_DEFAULT_WEIGHTS,
    healthWeights: config?.healthWeights || HEALTH_DEFAULT_WEIGHTS,
    isDefault: !config,
  };
};

exports.upsertOrgConfig = async (orgId, { riskWeights, healthWeights }) => {
  const update = {};
  if (riskWeights) update.riskWeights = riskWeights;
  if (healthWeights) update.healthWeights = healthWeights;

  const config = await RiskConfig.findOneAndUpdate(
    { orgId },
    { $set: update, $setOnInsert: { orgId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return { riskWeights: config.riskWeights, healthWeights: config.healthWeights, isDefault: false };
};
