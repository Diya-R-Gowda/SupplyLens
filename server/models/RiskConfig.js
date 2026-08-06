const mongoose = require('mongoose');

// Today's hardcoded weights (riskScoreService.js / healthScoreService.js prior
// to Phase 5) - the single source of truth both the model defaults and the
// compute services read from, so a fresh org's behavior is byte-identical to
// pre-Phase-5 behavior until they explicitly edit their config.
const RISK_DEFAULT_WEIGHTS = Object.freeze({
  newsScore: 0.4,
  expiryScore: 0.3,
  docScore: 0.2,
  countryScore: 0.1,
});

const HEALTH_DEFAULT_WEIGHTS = Object.freeze({
  esgScore: 0.25,
  logisticsScore: 0.20,
  docCompletenessScore: 0.15,
  contractHealthScore: 0.15,
  riskComponent: 0.25,
});

// One document per org (lazy-created on first PATCH, not on GET - see
// riskConfigService.js - so orgs that never touch settings never get a row).
// Weight fields are hard-validated to sum to ~1 at the route layer rather
// than silently auto-normalized (see TODO.md) - a rejected write is loud,
// a silently-rescaled one is exactly the "misconfigured org silently
// produces nonsense scores" failure mode this model exists to prevent.
const riskConfigSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, unique: true },
  riskWeights: {
    newsScore: { type: Number, min: 0, max: 1, default: RISK_DEFAULT_WEIGHTS.newsScore },
    expiryScore: { type: Number, min: 0, max: 1, default: RISK_DEFAULT_WEIGHTS.expiryScore },
    docScore: { type: Number, min: 0, max: 1, default: RISK_DEFAULT_WEIGHTS.docScore },
    countryScore: { type: Number, min: 0, max: 1, default: RISK_DEFAULT_WEIGHTS.countryScore },
  },
  healthWeights: {
    esgScore: { type: Number, min: 0, max: 1, default: HEALTH_DEFAULT_WEIGHTS.esgScore },
    logisticsScore: { type: Number, min: 0, max: 1, default: HEALTH_DEFAULT_WEIGHTS.logisticsScore },
    docCompletenessScore: { type: Number, min: 0, max: 1, default: HEALTH_DEFAULT_WEIGHTS.docCompletenessScore },
    contractHealthScore: { type: Number, min: 0, max: 1, default: HEALTH_DEFAULT_WEIGHTS.contractHealthScore },
    riskComponent: { type: Number, min: 0, max: 1, default: HEALTH_DEFAULT_WEIGHTS.riskComponent },
  },
}, { timestamps: true });

module.exports = mongoose.model('RiskConfig', riskConfigSchema);
module.exports.RISK_DEFAULT_WEIGHTS = RISK_DEFAULT_WEIGHTS;
module.exports.HEALTH_DEFAULT_WEIGHTS = HEALTH_DEFAULT_WEIGHTS;
