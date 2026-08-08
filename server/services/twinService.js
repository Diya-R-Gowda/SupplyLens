const { gatherSupplierData } = require('./supplierAggregationService');
const { computeFactors } = require('./riskScoreService');
const { computeHealthFactors } = require('./healthScoreService');
const { getOrgWeights, getOrgAlertThresholds } = require('./riskConfigService');
const { buildNarrativesForHistory } = require('./narrativeService');
const { evaluateAlerts, evaluateProjectedBreach } = require('./alertService');
const { getSupplierForecast } = require('./predictiveAnalyticsService');
const { detectAnomalies } = require('./anomalyService');

// Synthesizes a "what is true about this supplier right now" profile -
// the Digital Twin - from the same underlying collections the timeline
// endpoint reads, but shaped as current-state rather than a chronological
// event list. Compute-on-read (not persisted) - matches the timeline
// endpoint's existing precedent and avoids a sync burden; SupplierSnapshot
// (Phase 4 Step 3) is what persists a point-in-time copy of this shape.
exports.buildSupplierTwin = async (supplier) => {
  const { documents, news, riskChanges, healthChanges } = await gatherSupplierData(supplier);
  const { risk: riskWeights, health: healthWeights } = await getOrgWeights(supplier.orgId);
  const alertThresholds = await getOrgAlertThresholds(supplier.orgId);
  const alerts = evaluateAlerts(supplier, alertThresholds);
  // Early Warning (Phase 6 Step 3) - reuses this same forecast the
  // /forecast endpoint would compute; not persisted or cached, so it's
  // always evaluated against the supplier's current history like every
  // other twin field.
  const forecast = await getSupplierForecast(supplier);
  const projectedAlerts = evaluateProjectedBreach(supplier, forecast, alertThresholds);
  // Anomaly Detection (Phase 6 Step 4) - compounding drift + sentiment
  // pattern-shift, same compute-on-read precedent as everything else here.
  const anomalies = await detectAnomalies(supplier);

  const factors = await computeFactors(supplier);
  const healthFactors = await computeHealthFactors(supplier);

  const lastRiskChange = riskChanges
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  const lastHealthChange = healthChanges
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  // Same batch narrative builder the timeline endpoint uses, on the same
  // riskChanges/healthChanges data - only the latest entry's narrative is
  // actually used below, but building it via the shared helper guarantees
  // this and the timeline never explain the same change differently.
  const lastRiskNarrative = lastRiskChange
    ? buildNarrativesForHistory(riskChanges, riskWeights, 'risk').get(String(lastRiskChange._id))
    : null;
  const lastHealthNarrative = lastHealthChange
    ? buildNarrativesForHistory(healthChanges, healthWeights, 'health').get(String(lastHealthChange._id))
    : null;

  const sortedDocuments = documents
    .slice()
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  const sortedNews = news
    .slice()
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0, unclassified: 0 };
  for (const item of news) {
    if (item.sentiment === 'positive') sentimentCounts.positive += 1;
    else if (item.sentiment === 'neutral') sentimentCounts.neutral += 1;
    else if (item.sentiment === 'negative') sentimentCounts.negative += 1;
    else sentimentCounts.unclassified += 1;
  }

  let contractStatus = 'unknown';
  let daysRemaining = null;
  if (supplier.contractExpiry) {
    daysRemaining = Math.ceil((new Date(supplier.contractExpiry) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) contractStatus = 'expired';
    else if (daysRemaining <= 30) contractStatus = 'expiring_soon';
    else contractStatus = 'active';
  }

  return {
    supplier: {
      id: supplier._id,
      name: supplier.name,
      category: supplier.category,
      country: supplier.country,
    },
    risk: {
      score: supplier.riskScore,
      currentFactors: factors,
      lastChange: lastRiskChange && {
        previousScore: lastRiskChange.previousScore,
        newScore: lastRiskChange.newScore,
        delta: lastRiskChange.delta,
        reason: lastRiskChange.reason,
        timestamp: lastRiskChange.createdAt,
        narrative: lastRiskNarrative,
      },
    },
    health: {
      score: supplier.healthScore,
      currentFactors: healthFactors,
      lastChange: lastHealthChange && {
        previousScore: lastHealthChange.previousScore,
        newScore: lastHealthChange.newScore,
        delta: lastHealthChange.delta,
        reason: lastHealthChange.reason,
        timestamp: lastHealthChange.createdAt,
        narrative: lastHealthNarrative,
      },
    },
    enrichment: supplier.enrichment?.enrichedAt ? supplier.enrichment : null,
    esg: supplier.esg?.refreshedAt ? supplier.esg : null,
    logistics: supplier.logistics?.refreshedAt ? supplier.logistics : null,
    documents: {
      count: documents.length,
      mostRecent: sortedDocuments[0]
        ? { fileName: sortedDocuments[0].fileName, uploadedAt: sortedDocuments[0].uploadedAt }
        : null,
    },
    news: {
      articleCount: news.length,
      sentimentSummary: sentimentCounts,
      mostRecent: sortedNews[0]
        ? {
          headline: sortedNews[0].headline,
          sentiment: sortedNews[0].sentiment,
          publishedAt: sortedNews[0].publishedAt,
          url: sortedNews[0].url,
        }
        : null,
    },
    contract: {
      expiry: supplier.contractExpiry || null,
      daysRemaining,
      status: contractStatus,
    },
    alerts,
    projectedAlerts,
    anomalies,
    generatedAt: new Date(),
  };
};
