const User = require('../models/User');
const Supplier = require('../models/Supplier');
const RiskConfig = require('../models/RiskConfig');
const { deleteSupplierCascade } = require('./supplierCascadeService');

// Deleting an organisation is permanent and cascades to everything scoped to
// it - same reasoning as deleteSupplierCascade (hard delete, not soft/
// archive: nothing reads an orphaned org's data, no recycle-bin UI exists).
// No route in the app deletes a User or Organisation today - register is the
// only place either gets created - so this gap had never been exercised by
// real app usage. It surfaced because the Phase 7 audit found 60 orphaned
// organisations (some still holding a supplier) left behind by earlier
// phases' own test-cleanup scripts, which deleted the User directly via raw
// DB writes without also removing the Organisation/Supplier. Reuses
// deleteSupplierCascade per-supplier (the same logic already proven for
// Document/DocChunk/NewsCache/Conversation/RiskHistory/HealthHistory/
// SupplierSnapshot + GridFS) rather than re-implementing that cascade a
// second time scoped by orgId instead of supplierId.
exports.deleteOrgCascade = async (org) => {
  const suppliers = await Supplier.find({ orgId: org._id });
  await Promise.all(suppliers.map((supplier) => deleteSupplierCascade(supplier)));

  await Promise.all([
    User.deleteMany({ orgId: org._id }),
    RiskConfig.deleteMany({ orgId: org._id }),
  ]);

  await org.deleteOne();
};
