const mongoose = require('mongoose');

// Distinct from RiskHistory/HealthHistory (which log SCORE changes computed
// by the app itself, not user actions) and from Conversation (which logs AI
// chat, not administrative actions). This is the only place "user X did
// action Y to Z at time T" is recorded anywhere in this app - the Phase 10
// audit specifically flagged that gap and this closes it.
const auditLogSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // e.g. 'supplier.created', 'supplier.deleted', 'riskConfig.updated' -
  // dot-namespaced by target type so a growing action list stays scannable.
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  // Small, action-specific context (e.g. { name: 'Acme Corp' } for a
  // delete, where the target no longer exists to look up afterward) -
  // deliberately not a full before/after diff, which would risk capturing
  // more than a lightweight action log needs to.
  detail: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

auditLogSchema.index({ orgId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
