const SupplierSnapshot = require('../models/SupplierSnapshot');
const { buildSupplierTwin } = require('./twinService');

// Fixed cap rather than a time-based thinning policy (e.g. "keep all for 90
// days, then thin to weekly") - simpler to reason about and to test
// deterministically, and "last 100" already covers ~3+ months at the
// scheduled daily cadence below. Revisit if a time-based policy turns out
// to matter more in practice (see TODO.md).
const RETENTION_CAP = 100;

// Builds the current twin state and persists it as a point-in-time
// snapshot, then enforces retention. `reason` is the trigger type
// ('scheduled', 'manual', 'significant_change').
exports.takeSnapshot = async (supplier, reason) => {
  const state = await buildSupplierTwin(supplier);
  const snapshot = await SupplierSnapshot.create({
    supplierId: supplier._id,
    orgId: supplier.orgId,
    reason,
    state,
  });
  await enforceRetention(supplier._id);
  return snapshot;
};

// Keeps only the most recent RETENTION_CAP snapshots per supplier - without
// this, scheduled snapshots grow the collection unbounded forever.
const enforceRetention = async (supplierId) => {
  const count = await SupplierSnapshot.countDocuments({ supplierId });
  const excess = count - RETENTION_CAP;
  if (excess <= 0) return;

  const oldestExcess = await SupplierSnapshot.find({ supplierId })
    .sort({ createdAt: 1 })
    .limit(excess)
    .select('_id');

  await SupplierSnapshot.deleteMany({ _id: { $in: oldestExcess.map((doc) => doc._id) } });
};

exports.RETENTION_CAP = RETENTION_CAP;
