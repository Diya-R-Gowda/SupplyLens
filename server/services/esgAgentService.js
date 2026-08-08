const { enrichEsgData } = require('./enrichmentService');

// Phase 8 Step 4 - ESG Agent. Per the audit, this is explicitly NOT
// independent analysis - it's a thin, honestly-labeled wrapper. Reuses
// enrichEsgData() as-is (Phase 4) rather than duplicating a near-identical
// Gemini prompt under a new persona label, which is exactly the failure
// mode the audit flagged. If ESG data has never been fetched for this
// supplier, this calls enrichEsgData() once to ensure real data exists (the
// same call the existing /esg-refresh endpoint makes) - it does not add a
// SECOND Gemini call on top of that. The one real, modest addition is
// deliberately deterministic (no extra Gemini call, no extra quota cost):
// naming which of environmental/social/governance is the weakest score,
// since the raw fields alone don't say which dimension is the more
// actionable risk lever - that's the entire "focused lens" this agent adds.
exports.analyzeEsg = async (supplier) => {
  const esg = supplier.esg?.refreshedAt ? supplier.esg : await enrichEsgData(supplier.name);
  const freshlyFetched = !supplier.esg?.refreshedAt;

  const scores = {
    environmental: esg.environmentalScore,
    social: esg.socialScore,
    governance: esg.governanceScore,
  };
  const known = Object.entries(scores).filter(([, v]) => typeof v === 'number');

  const focusedSummary = known.length === 0
    ? 'No ESG data available for this supplier (no reliable public ESG information was found).'
    : (() => {
      const [weakestLabel, weakestValue] = known.reduce((min, cur) => (cur[1] < min[1] ? cur : min));
      return `Of the known ESG dimensions, ${weakestLabel} is the weakest (${weakestValue}/100) and the most actionable risk lever here.`;
    })();

  return {
    label: 'Based on Phase 4 enrichment data - not independent analysis',
    scope: 'This is a focused-lens view of the existing ESG enrichment data, not a separately-sourced assessment.',
    esg: {
      environmentalScore: esg.environmentalScore ?? null,
      socialScore: esg.socialScore ?? null,
      governanceScore: esg.governanceScore ?? null,
      summary: esg.summary || null,
      confidence: esg.confidence ?? null,
    },
    focusedSummary,
    freshlyFetched,
    source: esg.source || 'gemini',
    generatedAt: new Date(),
  };
};
