const Document = require('../models/Document');
const NewsCache = require('../models/NewsCache');
const RiskHistory = require('../models/RiskHistory');

// Shared org-scoped multi-collection gather, extracted from the timeline
// endpoint so the same query shape isn't duplicated (and left to drift)
// between the timeline (chronological event view) and the digital twin
// (current-state view) endpoints - both need the same underlying data,
// just shaped differently on top.
//
// Caller must pass an already org-verified `supplier` (e.g. via
// findOrgSupplier) - this trusts supplier._id/supplier.orgId, it does not
// re-check ownership itself.
exports.gatherSupplierData = async (supplier) => {
  const [documents, news, riskChanges] = await Promise.all([
    Document.find({ supplierId: supplier._id }).lean(),
    NewsCache.find({ supplierId: supplier._id, orgId: supplier.orgId }).lean(),
    RiskHistory.find({ supplierId: supplier._id, orgId: supplier.orgId }).lean(),
  ]);

  return { documents, news, riskChanges };
};
