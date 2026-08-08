const { generateAnswer } = require('./embedService');
const { clampToRange } = require('../utils/numberCoercion');
const { analyzeRisk } = require('./riskAnalystAgentService');
const { analyzeLegalDocuments } = require('./legalAgentService');
const { analyzeFinance } = require('./financeAgentService');
const { analyzeEsg } = require('./esgAgentService');
const { analyzeLogistics } = require('./logisticsAgentService');

// Phase 8 Step 5 - Manager Agent + Agent Collaboration. "Collaboration" here
// means context-passing, not new orchestration infrastructure: each of the
// 4 prior agents' REAL output is gathered fresh (never cached - same
// "never trust/reuse a stale computed result" precedent as Phase 7's
// mitigationService.js/recoveryPlanningService.js re-deriving Step 1's
// simulation server-side on every call) and passed as real input context
// into one final Gemini prompt that writes an executive summary. This is
// the exact same prompted-JSON + context-passing pattern already proven
// twice in Phase 7 - no new package, no new framework.
//
// Recompute-fresh (not cache-and-reuse across agents) is a deliberate
// choice, not an oversight: a manager summary built on stale sub-agent
// output from an earlier call in the session would risk contradicting
// what a user sees if they re-run an individual agent in between - the
// same staleness problem Phase 7 avoided by never trusting a
// client-supplied or previously-computed simulation.
//
// The single most important honesty requirement in this phase (per the
// build instructions): the executive summary must not imply more
// independent analytical depth than actually exists across the 5 inputs.
// This is enforced two ways, not left to Gemini's judgment alone - the
// prompt explicitly states each input's real nature, AND the `inputs`
// block below is built entirely in code from fixed, hardcoded `type` tags,
// so even if Gemini's prose ever slipped, the response's structured data
// still honestly labels what each agent actually is.
exports.generateManagerSummary = async (supplier) => {
  const [risk, legal, finance, esg, logistics] = await Promise.all([
    analyzeRisk(supplier),
    analyzeLegalDocuments(supplier),
    analyzeFinance(supplier),
    analyzeEsg(supplier),
    analyzeLogistics(supplier),
  ]);

  const legalSection = legal.status === 'ok'
    ? `${legal.summary}\n${legal.findings.map((f) => `- [${f.topic}] ${f.finding}`).join('\n')}`
    : legal.summary;

  const prompt = `You are writing a brief executive summary for a supply-chain risk manager about the supplier "${supplier.name}", based on outputs from five internal analysis functions. Some of these are genuine independent analysis; others are explicitly narrower restatements of existing data, and one dimension is deliberately not answered at all. Your summary MUST preserve this distinction honestly - do not present the narrower or unanswered dimensions as if they were full independent analyses, and do not invent any fact not present below.

1. RISK ANALYSIS (genuine synthesis of real risk/health scoring, history, forecast, and anomaly data):
${risk.assessment}
Key concerns: ${risk.keyConcerns.join('; ') || 'none noted'}

2. LEGAL REVIEW (genuine extraction from actual uploaded document text; status: ${legal.status}):
${legalSection}

3. FINANCE (real calculation where business fields are populated, otherwise a labeled AI estimate - mode: ${finance.businessImpact.mode}):
${finance.businessImpact.summary || finance.businessImpact.reasoning || '(no business impact summary available)'}
Payment history: ${finance.paymentHistory.message}
Invoices: ${finance.invoices.message}

4. ESG (NOT independent analysis - a focused-lens restatement of existing Phase 4 enrichment data only):
${esg.focusedSummary}

5. LOGISTICS (NOT independent analysis - a focused-lens restatement of existing Phase 4 enrichment data only):
${logistics.focusedSummary}

Write a 3-5 sentence executive summary synthesizing the above for a decision-maker. Explicitly note anywhere real data was missing or a claim was intentionally not answered (e.g. payment history). List 1-3 top priorities.

Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"executiveSummary": "<3-5 sentence synthesis>", "topPriorities": ["<short actionable item, under 15 words>"], "confidence": <0-1 number - your confidence this summary accurately and honestly reflects the inputs above, not confidence in the supplier itself>}`;

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  if (typeof parsed.executiveSummary !== 'string' || !parsed.executiveSummary.trim()) {
    throw new Error(`Unexpected manager-agent response shape: ${raw}`);
  }

  return {
    executiveSummary: parsed.executiveSummary.trim(),
    topPriorities: Array.isArray(parsed.topPriorities) ? parsed.topPriorities.filter((s) => typeof s === 'string') : [],
    confidence: clampToRange(parsed.confidence, 0, 1),
    // Code-enforced honesty labels - independent of anything Gemini's prose
    // says above, so a client can always render an accurate depth
    // indicator per input without parsing free text.
    inputs: {
      riskAnalyst: { type: 'genuine_synthesis', confidence: risk.confidence },
      legal: { type: 'genuine_extraction', status: legal.status, confidence: legal.confidence ?? null },
      finance: {
        type: 'real_math_or_estimate_plus_hardcoded_abstention',
        mode: finance.businessImpact.mode,
        paymentHistoryStatus: finance.paymentHistory.status,
        invoicesStatus: finance.invoices.status,
      },
      esg: { type: 'focused_lens_restatement' },
      logistics: { type: 'focused_lens_restatement' },
    },
    source: 'gemini',
    generatedAt: new Date(),
  };
};
