const mongoose = require('mongoose');

// One document per actual score change (not per recompute attempt - a
// recompute that lands on the same score, or one skipped by the rate limit,
// never creates a row here). This is the audit trail for "why did this
// supplier's risk score change" and also feeds the timeline endpoint's
// risk_changed events.
const riskHistorySchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  previousScore: { type: Number, required: true },
  newScore: { type: Number, required: true },
  delta: { type: Number, required: true }, // newScore - previousScore, after capping
  reason: { type: String, required: true }, // trigger type, e.g. 'scheduled_news_update', 'manual_news_refresh'
  factors: {
    newsScore: Number,
    expiryScore: Number,
    docScore: Number,
    countryScore: Number,
  },
  // The org's risk weight config actually used to compute this row's raw
  // score (Phase 5 - RiskConfig). Needed for narrativeService.js: weights
  // are now editable over time, so explaining a change accurately requires
  // knowing which weights were in effect at each of the two measurements
  // being compared, not just today's config. Absent on rows written before
  // this field existed - narrativeService falls back to the org's current
  // weights for those.
  weightsUsed: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

riskHistorySchema.index({ supplierId: 1, createdAt: -1 });

module.exports = mongoose.model('RiskHistory', riskHistorySchema);
