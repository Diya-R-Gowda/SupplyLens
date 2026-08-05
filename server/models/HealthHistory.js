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
}, { timestamps: true });

healthHistorySchema.index({ supplierId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthHistory', healthHistorySchema);
