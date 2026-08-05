const { gatherSupplierData } = require('./supplierAggregationService');
const { computeFactors } = require('./riskScoreService');

// Synthesizes a "what is true about this supplier right now" profile -
// the Digital Twin - from the same underlying collections the timeline
// endpoint reads, but shaped as current-state rather than a chronological
// event list. Compute-on-read (not persisted) - matches the timeline
// endpoint's existing precedent and avoids a sync burden; SupplierSnapshot
// (Phase 4 Step 3) is what persists a point-in-time copy of this shape.
exports.buildSupplierTwin = async (supplier) => {
  const { documents, news, riskChanges } = await gatherSupplierData(supplier);

  const factors = await computeFactors(supplier);

  const lastRiskChange = riskChanges
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

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
    generatedAt: new Date(),
  };
};
