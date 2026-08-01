const { generateAnswer } = require('./embedService');

// AI-generated company enrichment via Gemini - no new API key/signup needed,
// unlike a real company-data provider (Clearbit/OpenCorporates), so this is
// the default per the Phase 3 spec's own fallback guidance. Quality varies
// and is NOT a verified data source - the UI must label it as such. Throws
// on failure/unexpected shape; the caller (the route) decides how to
// surface that, matching the pattern used by sentimentService.js.
exports.enrichSupplierData = async (supplierName) => {
  const prompt = `You are researching the company "${supplierName}" for a supplier-risk assessment tool.
Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"industry": "<short industry/sector, e.g. 'Automotive manufacturing'>", "companySize": "<short size description, e.g. '10,000+ employees' or 'Small/startup'>", "foundedYear": <4-digit year as a number, or null if unknown>, "summary": "<one or two sentence factual summary of what the company does>"}

If you don't have reliable information about this specific company, respond with:
{"industry": null, "companySize": null, "foundedYear": null, "summary": null}

Company: ${supplierName}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  return {
    industry: parsed.industry || null,
    companySize: parsed.companySize || null,
    foundedYear: Number.isInteger(parsed.foundedYear) ? parsed.foundedYear : null,
    summary: parsed.summary || null,
    source: 'gemini',
    enrichedAt: new Date(),
  };
};
