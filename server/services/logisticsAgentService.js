const { enrichLogisticsData } = require('./enrichmentService');
const { computeHealthScore } = require('./healthScoreService');

// Phase 8 Step 4 - Logistics Agent. Same design as esgAgentService.js and
// the same honesty rationale: explicitly NOT independent analysis, reuses
// enrichLogisticsData() as-is (Phase 4) rather than a duplicate Gemini
// prompt, only calls it fresh if logistics data has genuinely never been
// fetched - and, per the same bug found and fixed in the ESG agent, PERSISTS
// that fetch exactly like /logistics-refresh does (save + recompute Health
// Score), so a second call reuses the real persisted data instead of
// re-fetching from Gemini every time. The focused-lens addition is a
// deterministic (no extra Gemini call) threshold read on on-time-delivery-
// rate, since a raw percentage alone doesn't say whether it's actually a
// risk signal.
const RELIABLE_DELIVERY_THRESHOLD = 80;

exports.analyzeLogistics = async (supplier) => {
  const freshlyFetched = !supplier.logistics?.refreshedAt;
  let logistics = supplier.logistics;

  if (freshlyFetched) {
    logistics = await enrichLogisticsData(supplier.name);
    supplier.logistics = logistics;
    await supplier.save();
    await computeHealthScore(supplier, 'logistics_update');
  }

  const { onTimeDeliveryRate, averageLeadTimeDays } = logistics;

  let focusedSummary;
  if (onTimeDeliveryRate == null && averageLeadTimeDays == null) {
    focusedSummary = 'No logistics data available for this supplier (on-time-delivery and lead-time figures are rarely public information).';
  } else {
    const deliveryNote = onTimeDeliveryRate != null
      ? (onTimeDeliveryRate < RELIABLE_DELIVERY_THRESHOLD
        ? `On-time delivery is ${onTimeDeliveryRate}%, below the ${RELIABLE_DELIVERY_THRESHOLD}% level generally considered reliable - the more actionable risk signal here.`
        : `On-time delivery is ${onTimeDeliveryRate}%, at or above the ${RELIABLE_DELIVERY_THRESHOLD}% level generally considered reliable.`)
      : 'On-time delivery rate is unknown.';
    const leadTimeNote = averageLeadTimeDays != null ? ` Average lead time is ${averageLeadTimeDays} day(s).` : '';
    focusedSummary = `${deliveryNote}${leadTimeNote}`;
  }

  return {
    label: 'Based on Phase 4 enrichment data - not independent analysis',
    scope: 'This is a focused-lens view of the existing logistics enrichment data, not a separately-sourced assessment.',
    logistics: {
      onTimeDeliveryRate: onTimeDeliveryRate ?? null,
      averageLeadTimeDays: averageLeadTimeDays ?? null,
      logisticsNotes: logistics.logisticsNotes || null,
      confidence: logistics.confidence ?? null,
    },
    focusedSummary,
    freshlyFetched,
    source: logistics.source || 'gemini',
    generatedAt: new Date(),
  };
};
