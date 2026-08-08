const { generateAnswer } = require('./embedService');
const { clampToRange } = require('../utils/numberCoercion');

// Phase 7 Step 2 - AI Decision Support. Follows the EXACT established
// pattern from enrichmentService.js/sentimentService.js: one generateAnswer
// call, a strict JSON response shape, throw-on-unexpected-shape (the caller/
// route decides how to surface that, same as every other Gemini-backed
// service in this app), self-reported 0-1 confidence. No new architecture.
const MIN_STRATEGIES = 2;
const MAX_STRATEGIES = 4;

// Takes Step 1's simulateSupplierFailure() output as context, so the
// suggestions are grounded in this specific supplier's real, already-computed
// profile rather than generic advice - deliberately re-derived server-side
// from a fresh simulation rather than trusting a client-supplied one, same
// "never trust client-provided context for a computed result" precedent as
// every other service in this app.
exports.generateMitigationStrategies = async (simulation) => {
  const {
    supplier, currentRiskHealth, contractStatus, concentrationRisk, dataCompleteness, recentNews,
  } = simulation;

  const concentrationSummary = concentrationRisk.isSoleCategorySource
    ? `the organisation's only supplier in the "${supplier.category}" category`
    : (supplier.category
      ? `1 of ${concentrationRisk.categoryPeerCount + 1} suppliers in the "${supplier.category}" category`
      : 'a supplier with no category set');

  const prompt = `You are a supply-chain risk advisor. A company is assessing mitigation options if the following supplier became unavailable (failed, shut down, or was otherwise lost).

Supplier: ${supplier.name} (category: ${supplier.category || 'unspecified'}, country: ${supplier.country})
Concentration: ${concentrationSummary}, ${concentrationRisk.isSoleCountrySource ? `the only supplier based in ${supplier.country}` : 'not the only supplier based in its country'}.
Current risk score: ${currentRiskHealth.riskScore}/100, health score: ${currentRiskHealth.healthScore}/100.
Contract status: ${contractStatus.status}${contractStatus.daysRemaining !== null ? ` (${contractStatus.daysRemaining} days remaining)` : ''}.
Data on file: ${dataCompleteness.documentCount} document(s), enrichment ${dataCompleteness.hasEnrichment ? 'available' : 'not available'}, ESG ${dataCompleteness.hasEsg ? 'available' : 'not available'}, logistics ${dataCompleteness.hasLogistics ? 'available' : 'not available'}.
Recent news: ${recentNews.articleCount} article(s) on file (${recentNews.sentimentCounts.negative} negative, ${recentNews.sentimentCounts.neutral} neutral, ${recentNews.sentimentCounts.positive} positive).

Suggest 2 to 4 concrete, actionable mitigation strategies a supply-chain manager could take, specific to the context above (e.g. "identify backup suppliers in this category," "expedite contract renewal," "request updated compliance documentation") - not generic advice that would apply to any supplier regardless of context.

Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"strategies": [{"strategy": "<short action title, under 12 words>", "rationale": "<1-2 sentence explanation referencing the specific context above>", "confidence": <0-1 number - how confident you are this is a genuinely useful, relevant recommendation for this specific situation, not generic advice>}]}

Include between 2 and 4 strategies in the array.`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed.strategies) || parsed.strategies.length < MIN_STRATEGIES) {
    throw new Error(`Unexpected mitigation-strategy response shape: ${raw}`);
  }

  const strategies = parsed.strategies.slice(0, MAX_STRATEGIES).map((item) => {
    if (typeof item.strategy !== 'string' || !item.strategy.trim()) {
      throw new Error(`Unexpected mitigation-strategy item shape: ${JSON.stringify(item)}`);
    }
    return {
      strategy: item.strategy.trim(),
      rationale: typeof item.rationale === 'string' ? item.rationale.trim() : '',
      confidence: clampToRange(item.confidence, 0, 1),
    };
  });

  return { strategies, source: 'gemini', generatedAt: new Date() };
};
