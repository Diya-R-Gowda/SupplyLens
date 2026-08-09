const Supplier = require('../models/Supplier');
const Document = require('../models/Document');
const NewsCache = require('../models/NewsCache');
const RiskHistory = require('../models/RiskHistory');
const HealthHistory = require('../models/HealthHistory');
const { getOrgWeights } = require('./riskConfigService');
const { buildNarrativesForHistory } = require('./narrativeService');

// Phase 9 Step 1 - Portfolio-Wide Timeline. Reuses the exact event shape and
// gathering logic already proven by the per-supplier timeline endpoint
// (routes/suppliers.js `:id/timeline`), pooled across every supplier in the
// org - same "pool across suppliers for a real portfolio view" precedent as
// Phase 6's portfolio forecast (predictiveAnalyticsService.js). The genuinely
// new part isn't a new data source, it's merging what already exists into
// one chronological, supplier-tagged feed - nothing like this exists
// anywhere else in the app (the Dashboard's `recentActivity` is a flat
// "recently updated" list, not a merged multi-type event timeline).
const groupBySupplierId = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const key = String(row.supplierId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
};

// IMPORTANT correctness note: narratives must be built PER SUPPLIER, each
// against its own chronological sequence - buildNarrativesForHistory diffs
// each row against the one immediately before it in the array it's given.
// Merging every supplier's RiskHistory/HealthHistory rows into one shared
// array before calling it would incorrectly compare one supplier's score
// change against a DIFFERENT supplier's prior row whenever their timestamps
// happened to interleave. Grouped first, narrative-built per group, merged
// back into the single sorted feed only afterward.
const buildNarrativesPerSupplier = (changes, weights, formulaKey) => {
  const narrativesBySupplier = new Map();
  for (const [supplierId, rows] of groupBySupplierId(changes)) {
    narrativesBySupplier.set(supplierId, buildNarrativesForHistory(rows, weights, formulaKey));
  }
  return (change) => narrativesBySupplier.get(String(change.supplierId))?.get(String(change._id));
};

exports.getPortfolioTimeline = async (orgId, { supplierId, days, limit } = {}) => {
  const supplierFilter = { orgId };
  if (supplierId) supplierFilter._id = supplierId;

  const suppliers = await Supplier.find(supplierFilter).select('name category country createdAt updatedAt').lean();
  const supplierIds = suppliers.map((s) => s._id);
  const supplierMeta = new Map(suppliers.map((s) => [String(s._id), s]));

  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
  const dateFilter = (field) => (since ? { [field]: { $gte: since } } : {});

  const [documents, news, riskChanges, healthChanges, weights] = await Promise.all([
    Document.find({ supplierId: { $in: supplierIds }, ...dateFilter('uploadedAt') }).lean(),
    NewsCache.find({ orgId, supplierId: { $in: supplierIds }, ...dateFilter('publishedAt') }).lean(),
    RiskHistory.find({ orgId, supplierId: { $in: supplierIds }, ...dateFilter('createdAt') }).lean(),
    HealthHistory.find({ orgId, supplierId: { $in: supplierIds }, ...dateFilter('createdAt') }).lean(),
    getOrgWeights(orgId),
  ]);

  const riskNarrativeFor = buildNarrativesPerSupplier(riskChanges, weights.risk, 'risk');
  const healthNarrativeFor = buildNarrativesPerSupplier(healthChanges, weights.health, 'health');

  const tag = (rawSupplierId) => {
    const meta = supplierMeta.get(String(rawSupplierId));
    return { supplierId: rawSupplierId, supplierName: meta?.name || 'Unknown supplier' };
  };

  const events = [];

  for (const s of suppliers) {
    if (!since || s.createdAt >= since) {
      events.push({ type: 'supplier_created', timestamp: s.createdAt, ...tag(s._id) });
    }
    // Same "only real if it actually differs from creation" guard as the
    // per-supplier timeline endpoint.
    if (s.updatedAt > s.createdAt && (!since || s.updatedAt >= since)) {
      events.push({ type: 'supplier_updated', timestamp: s.updatedAt, ...tag(s._id) });
    }
  }
  for (const doc of documents) {
    events.push({
      type: 'document_uploaded', timestamp: doc.uploadedAt, fileName: doc.fileName, ...tag(doc.supplierId),
    });
  }
  for (const item of news) {
    events.push({
      type: 'news_mentioned', timestamp: item.publishedAt, headline: item.headline, sentiment: item.sentiment, ...tag(item.supplierId),
    });
  }
  for (const change of riskChanges) {
    events.push({
      type: 'risk_changed',
      timestamp: change.createdAt,
      previousScore: change.previousScore,
      newScore: change.newScore,
      delta: change.delta,
      reason: change.reason,
      factors: change.factors,
      narrative: riskNarrativeFor(change),
      ...tag(change.supplierId),
    });
  }
  for (const change of healthChanges) {
    events.push({
      type: 'health_changed',
      timestamp: change.createdAt,
      previousScore: change.previousScore,
      newScore: change.newScore,
      delta: change.delta,
      reason: change.reason,
      factors: change.factors,
      narrative: healthNarrativeFor(change),
      ...tag(change.supplierId),
    });
  }

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // No true DB-level pagination across 4 heterogeneous collections merged
  // in memory - a hard post-merge cap plus the optional `days` filter above
  // (which bounds the query itself, not just the response) is the "date-
  // range-limit sensibly" approach. `truncated` tells the caller honestly
  // whether more real events exist beyond what's returned, so narrowing
  // `days` or raising `limit` is a real, informed choice, not a guess.
  const totalEvents = events.length;
  const truncatedEvents = events.slice(0, limit);

  return {
    events: truncatedEvents,
    totalEvents,
    suppliersIncluded: suppliers.length,
    truncated: totalEvents > truncatedEvents.length,
  };
};
