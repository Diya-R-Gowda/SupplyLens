const { generateAnswer } = require('./embedService');
const { clampToRange } = require('../utils/numberCoercion');

// Phase 7 Step 5 - Recovery Planning. Lowest real grounding of the five
// Phase 7 items (per the audit): no document-processing-duration field, no
// historical time-to-replace-a-supplier data exists anywhere in this app.
// This is an AI-estimated RANGE, explicitly labeled as an estimate and never
// presented as a calculated figure, from the start - same prompted-JSON +
// self-reported-confidence pattern as every other Gemini-backed service
// here. Takes Step 1's simulateSupplierFailure() output as context (the same
// re-derive-server-side precedent as mitigationService.js).
exports.estimateRecoveryTime = async (simulation) => {
  const { supplier, contractStatus, dataCompleteness, concentrationRisk } = simulation;

  const concentrationSummary = concentrationRisk.isSoleCategorySource
    ? `the organisation's only supplier in the "${supplier.category}" category`
    : (supplier.category
      ? `1 of ${concentrationRisk.categoryPeerCount + 1} suppliers in the "${supplier.category}" category`
      : 'a supplier with no category set');

  const prompt = `You are estimating how long it might take a company to recover if the following supplier became unavailable (failed, shut down, or was otherwise lost) - "recover" means finding, vetting, and fully onboarding a replacement, or otherwise restoring normal operations.

Supplier: ${supplier.name} (category: ${supplier.category || 'unspecified'}, country: ${supplier.country})
Concentration: ${concentrationSummary}.
Contract status: ${contractStatus.status}${contractStatus.daysRemaining !== null ? ` (${contractStatus.daysRemaining} days remaining)` : ''}.
Documentation on file: ${dataCompleteness.documentCount} document(s), overall data completeness: ${dataCompleteness.level}.

Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"estimatedRangeLow": "<short lower-bound estimate, e.g. '2 weeks'>", "estimatedRangeHigh": "<short upper-bound estimate, e.g. '6 weeks'>", "reasoning": "<1-2 sentence explanation referencing the specific context above - never claim precision this estimate doesn't have>", "confidence": <0-1 number - how confident you are in this range, where 1.0 is well-documented and 0.0 is a pure guess>}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  if (typeof parsed.estimatedRangeLow !== 'string' || typeof parsed.estimatedRangeHigh !== 'string') {
    throw new Error(`Unexpected recovery-estimate response shape: ${raw}`);
  }

  return {
    estimatedRange: `${parsed.estimatedRangeLow} - ${parsed.estimatedRangeHigh}`,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : null,
    confidence: clampToRange(parsed.confidence, 0, 1),
    label: 'AI-estimated range - not a calculation',
    source: 'gemini',
    generatedAt: new Date(),
  };
};
