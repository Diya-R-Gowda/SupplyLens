const Supplier = require('../models/Supplier');
const Document = require('../models/Document');
const NewsCache = require('../models/NewsCache');
const RiskHistory = require('../models/RiskHistory');
const HealthHistory = require('../models/HealthHistory');
const { computeFactors } = require('./riskScoreService');
const { computeHealthFactors } = require('./healthScoreService');

// Phase 7 Step 1 - "what would we actually lose if this supplier failed,"
// computed ONLY from real data already on file: current risk/health scores
// and their live factors, contract status, document/news presence, and how
// replaceable this supplier is within the org's own current supplier base
// (concentration risk). Deliberately produces no speculative dollar figure
// or time estimate here - that's Steps 2/4/5's job, each with its own
// explicit real-vs-AI-estimated labeling. This engine only ever reports what
// is verifiably true right now.

// A supplier missing a category can't be concentration-compared on it -
// reported as null (unknown), not folded into either "sole source" or
// "many alternatives" since neither would be true.
const computeConcentrationRisk = async (supplier) => {
  const peers = await Supplier.find({ orgId: supplier.orgId, _id: { $ne: supplier._id } })
    .select('category country')
    .lean();

  const categoryPeerCount = supplier.category
    ? peers.filter((p) => p.category === supplier.category).length
    : null;
  const countryPeerCount = peers.filter((p) => p.country === supplier.country).length;

  return {
    totalOrgSuppliers: peers.length + 1,
    categoryPeerCount, // other suppliers sharing this category, excluding self; null if this supplier has no category
    countryPeerCount, // other suppliers sharing this country, excluding self
    isSoleCategorySource: supplier.category ? categoryPeerCount === 0 : null,
    isSoleCountrySource: countryPeerCount === 0,
  };
};

// A supplier with 0 documents and never-refreshed enrichment/ESG/logistics
// genuinely has less known impact surface than one with rich data on file -
// that's real signal about the limits of what this simulation can see, not
// an apology for missing data. Reported as an explicit completeness note
// rather than silently producing a thinner-looking but unlabeled result.
const computeDataCompleteness = async (supplier) => {
  const documentCount = await Document.countDocuments({ supplierId: supplier._id });
  const hasEnrichment = !!supplier.enrichment?.enrichedAt;
  const hasEsg = !!supplier.esg?.refreshedAt;
  const hasLogistics = !!supplier.logistics?.refreshedAt;

  const populatedCount = [documentCount > 0, hasEnrichment, hasEsg, hasLogistics].filter(Boolean).length;
  const level = populatedCount >= 3 ? 'high' : (populatedCount >= 1 ? 'partial' : 'low');

  const note = level === 'low'
    ? 'Limited data on file for this supplier (no documents, and enrichment/ESG/logistics have never been refreshed) - the real impact of losing this supplier is likely larger than what this simulation can currently see.'
    : (level === 'partial'
      ? 'Some data on file for this supplier, but not all available sources have been populated - this simulation reflects only what is currently known.'
      : 'Rich data on file for this supplier (documents plus enrichment/ESG/logistics) - this simulation reflects a relatively complete picture of what is currently known.');

  return {
    documentCount, hasEnrichment, hasEsg, hasLogistics, level, note,
  };
};

const summarizeRecentNews = async (supplier) => {
  const articles = await NewsCache.find({ supplierId: supplier._id, orgId: supplier.orgId }).lean();
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0, unclassified: 0 };
  for (const article of articles) {
    if (article.sentiment === 'positive') sentimentCounts.positive += 1;
    else if (article.sentiment === 'neutral') sentimentCounts.neutral += 1;
    else if (article.sentiment === 'negative') sentimentCounts.negative += 1;
    else sentimentCounts.unclassified += 1;
  }
  return { articleCount: articles.length, sentimentCounts };
};

const buildContractStatus = (supplier) => {
  if (!supplier.contractExpiry) {
    return { expiry: null, daysRemaining: null, status: 'unknown' };
  }
  const daysRemaining = Math.ceil((new Date(supplier.contractExpiry) - new Date()) / (1000 * 60 * 60 * 24));
  const status = daysRemaining < 0 ? 'expired' : (daysRemaining <= 30 ? 'expiring_soon' : 'active');
  return { expiry: supplier.contractExpiry, daysRemaining, status };
};

// Plain-language summary combining the real signals above - deliberately
// contains no number that wasn't already computed elsewhere in this same
// result, and no speculative language ("could cost", "estimated impact").
const buildSummary = ({ supplier, concentrationRisk, contractStatus, dataCompleteness, newsSummary }) => {
  const parts = [];

  if (concentrationRisk.isSoleCategorySource && supplier.category) {
    parts.push(`${supplier.name} is your organisation's only supplier in the "${supplier.category}" category`);
  } else if (supplier.category && concentrationRisk.categoryPeerCount !== null) {
    parts.push(`${supplier.name} is 1 of ${concentrationRisk.categoryPeerCount + 1} suppliers in the "${supplier.category}" category`);
  }

  if (concentrationRisk.isSoleCountrySource) {
    parts.push(`the only supplier based in ${supplier.country}`);
  } else {
    parts.push(`1 of ${concentrationRisk.countryPeerCount + 1} suppliers based in ${supplier.country}`);
  }

  const concentrationSentence = parts.length ? `${parts.join(' and ')}.` : `${supplier.name} has no category set, so category concentration cannot be assessed.`;

  const contractSentence = contractStatus.status === 'unknown'
    ? 'No contract expiry is on file.'
    : `Contract is ${contractStatus.status.replace('_', ' ')}${contractStatus.daysRemaining !== null ? ` (${contractStatus.daysRemaining} days remaining)` : ''}.`;

  const newsSentence = newsSummary.articleCount === 0
    ? 'No recent news on file.'
    : `${newsSummary.articleCount} recent news article(s) on file (${newsSummary.sentimentCounts.negative} negative, ${newsSummary.sentimentCounts.neutral} neutral, ${newsSummary.sentimentCounts.positive} positive).`;

  return `${concentrationSentence} Current risk score ${supplier.riskScore}/100, health score ${supplier.healthScore}/100. ${contractSentence} ${newsSentence} ${dataCompleteness.note}`;
};

exports.simulateSupplierFailure = async (supplier) => {
  const [riskFactors, healthFactors, concentrationRisk, dataCompleteness, newsSummary] = await Promise.all([
    computeFactors(supplier),
    computeHealthFactors(supplier),
    computeConcentrationRisk(supplier),
    computeDataCompleteness(supplier),
    summarizeRecentNews(supplier),
  ]);

  const contractStatus = buildContractStatus(supplier);

  const result = {
    supplier: {
      id: supplier._id, name: supplier.name, category: supplier.category, country: supplier.country,
    },
    currentRiskHealth: {
      riskScore: supplier.riskScore, healthScore: supplier.healthScore, riskFactors, healthFactors,
    },
    contractStatus,
    concentrationRisk,
    dataCompleteness,
    recentNews: newsSummary,
    generatedAt: new Date(),
  };

  result.summary = buildSummary({
    supplier, concentrationRisk, contractStatus, dataCompleteness, newsSummary,
  });

  return result;
};

// Exposed for Step 3 (Alternative Supplier Recommendations), which needs to
// know whether a supplier's risk/health score reflects at least one real
// computed assessment (vs. still sitting at the untouched schema default) -
// same "a never-touched default isn't real signal" reasoning healthScore's
// own 50-default already documents.
exports.hasAssessedRisk = (supplierId) => RiskHistory.exists({ supplierId }).then(Boolean);
exports.hasAssessedHealth = (supplierId) => HealthHistory.exists({ supplierId }).then(Boolean);
