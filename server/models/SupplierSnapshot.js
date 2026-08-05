const mongoose = require('mongoose');

// Broader sibling of RiskHistory - captures the FULL twin-shaped state at a
// point in time (not just the risk formula's 4 factors), for historical
// comparison and auditing. `state` reuses the exact shape twinService.js
// produces so "what a snapshot looks like" and "what the live twin looks
// like right now" never drift apart - one function builds both.
const supplierSnapshotSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  // Trigger type: 'scheduled' (daily cron), 'manual' (POST /snapshot), or
  // 'significant_change' (Phase 4 Step 5 - large risk/health swing, etc.)
  reason: { type: String, required: true },
  state: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

// createdAt IS the snapshot timestamp - this index covers both the list
// endpoint's default sort and the retention policy's oldest-first cleanup.
supplierSnapshotSchema.index({ supplierId: 1, createdAt: -1 });

module.exports = mongoose.model('SupplierSnapshot', supplierSnapshotSchema);
