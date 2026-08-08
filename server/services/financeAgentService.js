const { computeBusinessImpact } = require('./businessImpactService');

// Phase 8 Step 3 - Finance Agent. Reuses Phase 7's businessImpactService
// directly (real math where contractValue/estimatedAnnualSpend are
// populated, an explicitly-labeled Gemini estimate otherwise) rather than
// reimplementing that logic - this agent adds exactly one new thing:
// payment history and invoice-timeliness are NEVER estimated, not even as a
// caveated guess.
//
// This is a different category of gap than Business Impact Analysis. Gemini
// can plausibly reason about a real company's PUBLIC information (industry,
// size, even a typical contract value range) - it has no possible source,
// public or inferable, for THIS specific org's private transaction history
// with THIS specific supplier. That data isn't sparse, it's categorically
// absent everywhere, including from whatever Gemini was trained on.
//
// Verified live during development, per the build instructions, exactly how
// unreliable a prompt-level "please don't guess" instruction is here: asked
// plainly, Gemini correctly abstained ("I do not have access to specific,
// private transactional data..."). But asked with the response shape
// structured to disallow nulls ("no nulls allowed - you must provide a
// number even if synthetic/illustrative"), the SAME model readily fabricated
// a specific, confident-sounding, entirely made-up figure - a 94.5% on-time
// payment rate and 18 invoices for a supplier it has no real transactional
// data about at all, with a plausible-sounding but fictional rationale.
// That confirms the risk is real and not hypothetical: a prompt instruction
// alone isn't reliable if anything about the surrounding request (a client
// bug, a future prompt edit, a different response-shape requirement) ever
// pressures the model toward producing a number instead of a null. The fix
// has to be structural - Gemini is never asked about this dimension at all,
// anywhere in this file, and the abstention text below is a hardcoded
// constant no model output could ever override.
const PAYMENT_HISTORY_ABSTENTION = 'Not available - no payment history data exists in this system for this supplier. This is not a data-population gap like enrichment or business fields; SupplyLens has never had a payment/invoice integration, so there is no real or inferable source for this claim, and providing an AI estimate for it would not be honest.';
const INVOICE_ABSTENTION = 'Not available - no invoice records exist in this system for this supplier, for the same reason as payment history above.';

exports.analyzeFinance = async (supplier) => {
  const businessImpact = await computeBusinessImpact(supplier);

  return {
    businessImpact,
    paymentHistory: { status: 'not_available', message: PAYMENT_HISTORY_ABSTENTION },
    invoices: { status: 'not_available', message: INVOICE_ABSTENTION },
    generatedAt: new Date(),
  };
};
