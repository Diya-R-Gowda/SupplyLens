const mongoose = require('mongoose');

// Sibling of RiskHistory - same audit-trail shape (one row per actual
// score change, doubles as the rate-limit lookup table), but for Health
// Score's distinct formula and factor set.
const healthHistorySchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  previousScore: { type: Number, required: true },
  newScore: { type: Number, required: true },
  delta: { type: Number, required: true },
  reason: { type: String, required: true },
  factors: {
    esgScore: Number,
    logisticsScore: Number,
    docCompletenessScore: Number,
    contractHealthScore: Number,
    riskComponent: Number,
  },
  // The org's health weight config actually used to compute this row's raw
  // score (Phase 5 - RiskConfig). Needed for narrativeService.js: weights
  // are now editable over time, so explaining a change accurately requires
  // knowing which weights were in effect at each of the two measurements
  // being compared, not just today's config. Absent on rows written before
  // this field existed - narrativeService falls back to the org's current
  // weights for those.
  weightsUsed: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

healthHistorySchema.index({ supplierId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthHistory', healthHistorySchema);
