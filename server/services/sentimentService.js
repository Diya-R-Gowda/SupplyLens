const { generateAnswer } = require('./embedService');
const { clampToRange } = require('../utils/numberCoercion');

// Classifies a news headline's sentiment regarding a specific company. Kept
// as its own service (not folded into newsService.js) so it can be reused
// and tested independently of news fetching. Throws on any failure - the
// caller decides how to degrade (news ingestion stores the article with
// null sentiment rather than losing the article over a classification miss).
exports.classifyHeadlineSentiment = async (companyName, headline) => {
  const prompt = `Classify the sentiment of this news headline regarding the company "${companyName}".
Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"label": "positive" | "neutral" | "negative", "score": <number between -1 and 1, where -1 is most negative, 0 is neutral, 1 is most positive>, "confidence": <0-1 number - how confident you are in this classification, e.g. a headline with clear, unambiguous language should score near 1, an ambiguous or sarcastic one should score lower>}

Headline: ${headline}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  const label = String(parsed.label || '').toLowerCase().trim();
  const score = Number(parsed.score);

  if (!['positive', 'neutral', 'negative'].includes(label) || Number.isNaN(score)) {
    throw new Error(`Unexpected sentiment response shape: ${raw}`);
  }

  return { label, score: Math.max(-1, Math.min(1, score)), confidence: clampToRange(parsed.confidence, 0, 1) };
};
