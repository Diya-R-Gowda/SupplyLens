const Document = require('../models/Document');
const { retrieveRelevantChunks } = require('./ragService');
const { generateAnswer } = require('./embedService');
const { clampToRange } = require('../utils/numberCoercion');

// Phase 8 Step 2 - Legal Agent. Per the audit, this is the second-strongest
// candidate for genuine new capability: ragService.js already does real
// retrieval (vector search over actually-uploaded document text, with
// source attribution) - what doesn't exist yet is a STRUCTURED extraction
// pass over that real text, as opposed to ragService's free-form Q&A. This
// reuses retrieveRelevantChunks() (the real retrieval logic, extracted from
// ragService.js) rather than duplicating $vectorSearch, and runs it once per
// topic below so the extraction prompt gets real, targeted context per
// dimension instead of one generic top-5 retrieval.
const EXTRACTION_TOPICS = [
  { key: 'termination', query: 'termination clause and conditions for ending the contract' },
  { key: 'renewal', query: 'renewal terms and contract duration' },
  { key: 'compliance', query: 'compliance obligations and regulatory requirements' },
  { key: 'liability', query: 'liability, indemnification, and penalty clauses' },
  { key: 'payment', query: 'payment terms and pricing conditions' },
];

// Zero documents is a real, expected state (same honesty convention as
// Phase 7's dataCompleteness) - not an error, and not something Gemini
// should ever be asked to fill in with speculation about a contract that
// was never uploaded.
exports.analyzeLegalDocuments = async (supplier) => {
  const documentCount = await Document.countDocuments({ supplierId: supplier._id });
  if (documentCount === 0) {
    return {
      status: 'no_documents',
      summary: 'No documents on file to review for this supplier - upload a contract or related document to enable legal analysis.',
      findings: [],
      missingStandardTerms: [],
      documentsReviewed: [],
      confidence: null,
      source: null,
      generatedAt: new Date(),
    };
  }

  const retrievals = await Promise.all(EXTRACTION_TOPICS.map(async (topic) => ({
    ...topic,
    ...(await retrieveRelevantChunks(supplier._id, topic.query)),
  })));

  const withResults = retrievals.filter((r) => r.chunks.length > 0);
  const allSources = [...new Set(retrievals.flatMap((r) => r.sources))];

  if (withResults.length === 0) {
    return {
      status: 'no_relevant_content',
      summary: `${documentCount} document(s) on file, but no relevant contract text was found for any of the topics this agent reviews (termination, renewal, compliance, liability, payment).`,
      findings: [],
      missingStandardTerms: [],
      documentsReviewed: allSources,
      confidence: null,
      source: null,
      generatedAt: new Date(),
    };
  }

  // Every excerpt in the prompt is real retrieved text - the topic label is
  // the only thing added, so a finding can always be traced back to what
  // was actually retrieved for that topic (documentsReviewed/topicsCovered
  // below, independent of anything Gemini claims).
  const contextBlock = withResults
    .map((r) => `## Topic: ${r.key}\n${r.chunks.map((c) => c.text).join('\n\n')}`)
    .join('\n\n');

  const prompt = `You are a contract analyst reviewing a supplier's uploaded documents. Using ONLY the excerpts below (grouped by topic), identify concrete findings about termination clauses, renewal terms, compliance/regulatory obligations, liability/penalty clauses, and payment terms. Do not invent anything not present in the text - if a topic below has no clear relevant content, omit it from findings rather than guessing.

${contextBlock}

Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"findings": [{"topic": "<termination|renewal|compliance|liability|payment>", "finding": "<what the text actually says, 1-3 sentences>", "excerpt": "<short supporting quote copied from the text above, under 30 words>"}], "missingStandardTerms": ["<a standard contract term that appears to be genuinely absent from what was reviewed, if any - do not list something just because it wasn't the focus of a retrieved excerpt>"], "confidence": <0-1 number - how confident you are these findings accurately reflect the source text, not confidence in the contract's quality>}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed.findings)) {
    throw new Error(`Unexpected legal-agent response shape: ${raw}`);
  }

  const validTopics = new Set(EXTRACTION_TOPICS.map((t) => t.key));
  const findings = parsed.findings
    .filter((f) => f && typeof f.finding === 'string' && f.finding.trim())
    .map((f) => ({
      topic: validTopics.has(f.topic) ? f.topic : 'unspecified',
      finding: f.finding.trim(),
      excerpt: typeof f.excerpt === 'string' ? f.excerpt.trim() : null,
    }));

  return {
    status: 'ok',
    summary: `Reviewed ${documentCount} document(s) (${allSources.join(', ')}) - relevant text was found for ${withResults.length}/${EXTRACTION_TOPICS.length} topics.`,
    findings,
    missingStandardTerms: Array.isArray(parsed.missingStandardTerms)
      ? parsed.missingStandardTerms.filter((s) => typeof s === 'string')
      : [],
    documentsReviewed: allSources,
    topicsCovered: withResults.map((r) => r.key),
    topicsNotFound: retrievals.filter((r) => r.chunks.length === 0).map((r) => r.key),
    confidence: clampToRange(parsed.confidence, 0, 1),
    source: 'gemini',
    generatedAt: new Date(),
  };
};
