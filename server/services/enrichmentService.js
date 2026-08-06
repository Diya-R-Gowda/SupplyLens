const { generateAnswer } = require('./embedService');
const { clampToRange, toNumberOrNull } = require('../utils/numberCoercion');

// Shared confidence instruction/extraction for all three AI-generated
// sub-documents below (Phase 5 - Confidence Scores). Reuses sentimentService's
// proven prompted-JSON pattern rather than a separate confidence-scoring
// pass or Gemini's raw logprobs (impractical here - see TODO.md for why).
// 0-1 scale (not low/medium/high) so it composes with the rest of the app's
// numeric conventions and can be shown as a percentage.
const CONFIDENCE_FIELD_SPEC = '"confidence": <0-1 number - how confident you are in this specific data, where 1.0 is a well-documented public fact and 0.0 is a pure guess. If every field above is null because you don\'t have reliable information, confidence should be close to 0, not omitted.>';
const extractConfidence = (parsed) => clampToRange(parsed.confidence, 0, 1);

// AI-generated company enrichment via Gemini - no new API key/signup needed,
// unlike a real company-data provider (Clearbit/OpenCorporates), so this is
// the default per the Phase 3 spec's own fallback guidance. Quality varies
// and is NOT a verified data source - the UI must label it as such. Throws
// on failure/unexpected shape; the caller (the route) decides how to
// surface that, matching the pattern used by sentimentService.js.
exports.enrichSupplierData = async (supplierName) => {
  const prompt = `You are researching the company "${supplierName}" for a supplier-risk assessment tool.
Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"industry": "<short industry/sector, e.g. 'Automotive manufacturing'>", "companySize": "<short size description, e.g. '10,000+ employees' or 'Small/startup'>", "foundedYear": <4-digit year as a number, or null if unknown>, "summary": "<one or two sentence factual summary of what the company does>", ${CONFIDENCE_FIELD_SPEC}}

If you don't have reliable information about this specific company, respond with:
{"industry": null, "companySize": null, "foundedYear": null, "summary": null, "confidence": 0}

Company: ${supplierName}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  return {
    industry: parsed.industry || null,
    companySize: parsed.companySize || null,
    foundedYear: Number.isInteger(parsed.foundedYear) ? parsed.foundedYear : null,
    summary: parsed.summary || null,
    confidence: extractConfidence(parsed),
    source: 'gemini',
    enrichedAt: new Date(),
  };
};

// Same approach as enrichSupplierData, for a company's ESG profile. Scores
// are 0-100 to match the app's existing score conventions. Companies with
// published ESG ratings (larger/public ones) tend to give a plausible
// answer; smaller/private ones will mostly come back null - that's a
// legitimate "don't know" per the prompt's own instruction, not a bug.
exports.enrichEsgData = async (supplierName) => {
  const prompt = `You are researching the company "${supplierName}" for a supplier-risk assessment tool.
Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"environmentalScore": <0-100 number or null>, "socialScore": <0-100 number or null>, "governanceScore": <0-100 number or null>, "summary": "<one or two sentence factual summary of the company's ESG (environmental, social, governance) standing>", ${CONFIDENCE_FIELD_SPEC}}

Base scores on real, known ESG ratings/reporting/controversies if you have them. If you don't have reliable ESG information about this specific company, respond with:
{"environmentalScore": null, "socialScore": null, "governanceScore": null, "summary": null, "confidence": 0}

Company: ${supplierName}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  return {
    environmentalScore: clampToRange(parsed.environmentalScore, 0, 100),
    socialScore: clampToRange(parsed.socialScore, 0, 100),
    governanceScore: clampToRange(parsed.governanceScore, 0, 100),
    summary: parsed.summary || null,
    confidence: extractConfidence(parsed),
    source: 'gemini',
    refreshedAt: new Date(),
  };
};

// Same approach again, for logistics/operational estimates. Unlike ESG,
// on-time-delivery-rate and lead-time figures are almost never public
// information for any company - expect this to come back null far more
// often than enrichment or ESG do. That's an honest "don't know", not a
// failure of the prompt.
exports.enrichLogisticsData = async (supplierName) => {
  const prompt = `You are researching the company "${supplierName}" for a supplier-risk assessment tool.
Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"onTimeDeliveryRate": <0-100 number representing an estimated percentage, or null>, "averageLeadTimeDays": <number of days, or null>, "logisticsNotes": "<one or two sentence factual note on the company's known logistics/supply-chain operations, e.g. manufacturing footprint, shipping model, notable disruptions>", ${CONFIDENCE_FIELD_SPEC}}

Most companies don't publicly report on-time-delivery-rate or lead-time figures - if you don't have reliable, specific information about this company's logistics performance, respond with:
{"onTimeDeliveryRate": null, "averageLeadTimeDays": null, "logisticsNotes": null, "confidence": 0}

Company: ${supplierName}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  return {
    onTimeDeliveryRate: clampToRange(parsed.onTimeDeliveryRate, 0, 100),
    averageLeadTimeDays: toNumberOrNull(parsed.averageLeadTimeDays),
    logisticsNotes: parsed.logisticsNotes || null,
    confidence: extractConfidence(parsed),
    source: 'gemini',
    refreshedAt: new Date(),
  };
};
