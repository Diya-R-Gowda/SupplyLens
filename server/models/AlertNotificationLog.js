const mongoose = require('mongoose');

// Dedup memory for jobs/alertCron.js. alertService.evaluateAlerts is
// deliberately compute-on-read with no persisted breach state (see
// alertService.js's own comment on why) - without something to remember
// "we already notified for this still-active breach," the cron would
// re-send an email every 15 minutes for the same unresolved problem. One
// row per (supplierId, alertType) means "a notification was successfully
// sent and this breach hasn't cleared since." The row is deleted (not just
// left stale) the moment the cron observes the breach has cleared, so a
// future re-breach notifies again rather than being silently suppressed
// forever by a leftover row.
const alertNotificationLogSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  alertType: { type: String, enum: ['risk', 'health'], required: true },
  lastNotifiedAt: { type: Date, required: true },
}, { timestamps: true });

alertNotificationLogSchema.index({ supplierId: 1, alertType: 1 }, { unique: true });

module.exports = mongoose.model('AlertNotificationLog', alertNotificationLogSchema);
