const { generateAnswer } = require('./embedService');
const { clampToRange, toNumberOrNull } = require('../utils/numberCoercion');

// Phase 7 Step 4 - Business Impact Analysis. The product decision (see
// TODO.md): real, user-populated fields drive real math when present;
// otherwise Gemini provides a clearly-labeled starting estimate, following
// the exact same pattern already established for enrichment/ESG/logistics
// (AI default, real input overrides and improves over time). The response
// always states which mode produced it - `mode: 'real' | 'ai_estimate'` -
// never blends a real number and an AI guess into one figure without saying
// which is which.

const DAYS_PER_YEAR = 365;

const buildRealImpact = (businessImpact) => {
  const contractValue = businessImpact.contractValue?.amount != null
    ? { amount: businessImpact.contractValue.amount, currency: businessImpact.contractValue.currency || 'USD' }
    : null;
  const annualSpend = toNumberOrNull(businessImpact.estimatedAnnualSpend);
  const dailySpendRate = annualSpend !== null ? Math.round((annualSpend / DAYS_PER_YEAR) * 100) / 100 : null;

  // Explicit 'en-US' locale - toLocaleString() with no locale argument uses
  // the server process's own locale (found live: this server defaults to
  // Indian digit grouping, e.g. "5,00,000" instead of "500,000"), which has
  // nothing to do with the caller's actual locale and would silently
  // misrender every currency figure this service produces.
  const fmt = (n) => n.toLocaleString('en-US');
  const parts = [];
  if (contractValue) parts.push(`${fmt(contractValue.amount)} ${contractValue.currency} total contract value on file`);
  if (annualSpend !== null) parts.push(`${fmt(annualSpend)} estimated annual spend (~${fmt(dailySpendRate)}/day)`);
  const summary = `Calculated directly from real figures you entered: ${parts.join('; ')}.`;

  return {
    mode: 'real',
    contractValue,
    estimatedAnnualSpend: annualSpend,
    dailySpendRate,
    summary,
  };
};

const estimateImpactWithAI = async (supplier) => {
  const prompt = `You are estimating the likely business impact of losing the following supplier, since no real financial data has been provided for them yet.

Supplier: ${supplier.name} (category: ${supplier.category || 'unspecified'}, country: ${supplier.country})
Current risk score: ${supplier.riskScore}/100, health score: ${supplier.healthScore}/100

Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"estimatedAnnualSpendLow": <number or null>, "estimatedAnnualSpendHigh": <number or null>, "currency": "<3-letter currency code, e.g. USD>", "criticalityRating": <1-5 integer estimate, or null - 1 is low criticality, 5 is mission-critical>, "reasoning": "<1-2 sentence explanation>", "confidence": <0-1 number - how confident you are in this estimate, where 1.0 is well-documented public information and 0.0 is a pure guess>}

If you have no reasonable basis to estimate this company's spend at all, respond with:
{"estimatedAnnualSpendLow": null, "estimatedAnnualSpendHigh": null, "currency": null, "criticalityRating": null, "reasoning": null, "confidence": 0}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  const low = toNumberOrNull(parsed.estimatedAnnualSpendLow);
  const high = toNumberOrNull(parsed.estimatedAnnualSpendHigh);

  return {
    mode: 'ai_estimate',
    estimatedAnnualSpendRange: (low !== null && high !== null) ? { low, high, currency: parsed.currency || 'USD' } : null,
    criticalityRating: Number.isInteger(parsed.criticalityRating) ? clampToRange(parsed.criticalityRating, 1, 5) : null,
    reasoning: parsed.reasoning || null,
    confidence: clampToRange(parsed.confidence, 0, 1),
    label: 'AI-estimated - populate with real data for accuracy',
    source: 'gemini',
  };
};

exports.computeBusinessImpact = async (supplier) => {
  const businessImpact = supplier.businessImpact || {};
  const hasRealMoney = businessImpact.contractValue?.amount != null || businessImpact.estimatedAnnualSpend != null;

  const userProvided = {
    contractValue: businessImpact.contractValue?.amount != null
      ? { amount: businessImpact.contractValue.amount, currency: businessImpact.contractValue.currency || 'USD' }
      : null,
    estimatedAnnualSpend: toNumberOrNull(businessImpact.estimatedAnnualSpend),
    criticalityRating: Number.isInteger(businessImpact.criticalityRating) ? businessImpact.criticalityRating : null,
    dependencyNotes: businessImpact.dependencyNotes || null,
    fieldsUpdatedAt: businessImpact.updatedAt || null,
  };

  const impact = hasRealMoney
    ? buildRealImpact(businessImpact)
    : await estimateImpactWithAI(supplier);

  return { ...impact, userProvided, computedAt: new Date() };
};
