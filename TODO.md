# TODO.md

Things genuinely blocked on a human decision or action — API keys/signups,
product calls with real tradeoffs, infrastructure/billing, and known
limitations carried forward. Everything else that came up during Phase 3/4/5
was either implemented or fixed outright; this file only holds what's left.

Last updated: 2026-08-06 (end of Phase 5 — Explainable Risk Scoring).

## 1. API keys / signups only you can do

**None required right now.** Phase 5 (configurable weights, risk/health
trend charts, narrative explanations, confidence scores, alert thresholds)
used only the Gemini key already in `.env` — no new signup. Both existing
keys are confirmed live:
- `CURRENTS_API_KEY` — live, confirmed against `api.currentsapi.services`.
- `GEMINI_API_KEY` — live, pinned to `gemini-3.5-flash-lite`.

Phase 5 adds no new Gemini call sites (confidence is a field added to the
*existing* enrichment/ESG/logistics/sentiment prompts, not a separate call)
— quota draw is essentially unchanged from Phase 4.

## 2. Product / business decisions (implemented my recommended default — revisable)

**Carried from Phase 3/4 (still open):**
- **Enrichment data doesn't feed either scoring formula.** No non-speculative signal for how industry/company-size/founding-year should move a score without real product input.
- **Gemini over a paid company-data API for enrichment/ESG/logistics.** No new signup, but accuracy is unverified (see section 4).
- **A keyless GDELT/RSS fallback was not built** for news — only needed if Currents' key/quota becomes a blocker.
- **Health Score's weight table** (25% ESG / 20% logistics / 15% doc completeness / 15% contract health / 25% inverted risk) — now genuinely *editable* per-org as of Phase 5 (`server/models/RiskConfig.js`), but the *defaults* are still the same first-pass, un-tuned values from Phase 4.
- **Manual `riskScore` edits skip the auto-recompute only when `riskScore` is explicitly present in that request.** Unchanged by Phase 5.
- **Digital Twin is compute-on-read, not persisted.** Unchanged — Phase 5's `alerts` field and narrative text are computed the same way, for the same reason.
- **Snapshot retention (100/org, fixed cap) and daily cadence.** Unchanged.

**New this phase:**
- **Weight validation is hard-rejected, not auto-normalized.** `PATCH /org/risk-config` returns 400 if a weight object doesn't sum to 1 (±0.005 float tolerance), rather than silently rescaling whatever was submitted to fit. Chosen because a silent rescale is exactly the "misconfigured org silently produces nonsense scores" failure mode a configurable-weights feature should avoid — a loud rejection with the actual sum in the error is more honest than guessing what the admin meant. Revisit if this proves too strict in practice (e.g. if auto-normalizing with a visible "we adjusted your inputs to X" confirmation turns out to be less friction).
- **RiskConfig is lazily created on first PATCH, not on first GET.** Reading a never-configured org's weights just returns the hardcoded defaults (`isDefault: true`) without writing anything — avoids a placeholder document for every org that never opens the settings panel. First-ever edit is what creates the row.
- **Confidence scale is 0-1 numeric, not low/medium/high.** Composes with the rest of the app's existing 0-100/0-1 scoring conventions and renders as a percentage; a categorical scale would need its own separate display convention. Live-tested and confirmed to genuinely discriminate (Tesla/Siemens: 0.85-1.0 on enrichment/ESG, 0-0.4 on logistics where public data is scarce; a fabricated company name: 0 across the board) — it's not just always maxed out.
- **Confidence values are Gemini's own self-report**, requested via the same prompted-JSON pattern as `sentimentService.js`'s label/score, not derived from token-level logprobs. The Gemini Node SDK's logprobs support is model/tier-limited and measures token likelihood, not semantic confidence in the answer — a self-reported number, imperfect as it is, was judged more useful and more consistent with the sentiment precedent already in the codebase.
- **Default alert thresholds (riskThreshold: 70, healthThreshold: 30) chosen to match RiskBadge/HealthBadge's own existing "red zone" cutoffs** (risk >66, health <34 render red) rather than picking new arbitrary numbers — a breach roughly lines up with what a user would already read as "red" on the badge. Revisable per-org via `PATCH /org/risk-config`.
- **No separate scheduled cron job checks for threshold breaches.** The alert state (`twinService.js`'s `alerts` field, `GET /dashboard/stats`'s `activeAlerts`) is computed fresh from the supplier's *current* persisted score on every read — there's no caching/staleness window a periodic re-check would need to close. A cron job would only add value if there were a push notification channel to fire from at the moment of breach (email/SMS/etc.), which doesn't exist yet — see section 3.
- **A snapshot is taken on a fresh threshold crossing** (`'threshold_breach'` reason), reusing Step 3's existing large-delta snapshot mechanism (`twinSyncService.js`) rather than adding a second cron. When a change is *both* a large swing and a fresh crossing at once (common for a supplier's first-ever score change), the snapshot reason prioritizes `'threshold_breach'` as the more decision-relevant label — found and fixed via live testing, see commit `ca313fb`.
- **Alert thresholds are per-org, not per-supplier or per-category.** A single risk/health cutoff applies to every supplier in an org. Reasonable default for a first pass; per-category thresholds (e.g. logistics suppliers tolerate a different risk band than SaaS vendors) would be a natural but real extension if that granularity turns out to matter.
- **Narrative explanations never claim a factor's own direction caused the overall reported delta's sign** (Explainable AI, `narrativeService.js`) — deliberate, after live testing surfaced that a factor's ranked contribution can point a different direction than the actual capped score movement whenever an earlier change was itself capped, or when several weights are edited at once. The sentence states the observed score movement and the dominant factor's own movement as separate, both-true facts rather than a causal claim that could be technically wrong. See section 4 for the fuller detail.

## 3. Infrastructure / paid tier (needs your account, billing, or both)

- **Gemini API free-tier quota** — still the main constraint if real usage scales up. Pinned to `gemini-3.5-flash-lite`, confirmed with real headroom during all of Phase 3/4/5's testing.
- **A real ESG/logistics/company-data provider** (if Gemini's best-effort estimates aren't reliable enough — see section 4) would need its own signup and likely a paid tier for useful coverage.
- **Real push notification infrastructure (email, SMS, or websocket/SSE for live in-app push) for alert thresholds.** Phase 5's alert surfacing is deliberately an in-app banner/badge only — nothing pushes to a user who isn't currently looking at the app. If threshold breaches need to reach someone outside the app (e.g. an email the moment a key supplier's risk crosses the line), that needs a new dependency (`nodemailer` or similar) and likely a transactional-email provider signup (SendGrid, Postmark, etc.), or a websocket/SSE layer for live in-app push without a page reload. Worth adding once there's a real "someone needs to know about this within minutes, not the next time they open the dashboard" use case — not needed for the current in-app-only design.

## 4. Known limitations / deferred work

**Carried from Phase 3/4 (still open):**
- Sentiment classification is Gemini-prompted, not a dedicated sentiment model - reasonable but unbenchmarked at scale.
- `countryRisk.json` only covers 7 countries; everything else defaults to a neutral 50.
- No "create supplier" UI still.
- ESG/logistics/enrichment data quality can't be verified against ground truth - no "correct answer" to check an AI-generated estimate against. Labeled "AI-generated - verify independently" in the UI (now with a confidence badge alongside, see below), but that's a UI disclaimer, not a quality guarantee.
- Digital Twin's compute-on-read approach re-sorts/re-scans a supplier's full news/document/history arrays on every request - fine at current volumes, unbenchmarked at real scale.
- No demo-mode data for ESG/logistics/twin/snapshots/health - all real-DB-only.

**New this phase:**
- **Confidence scores are self-reported by Gemini, with no ground truth to verify the confidence value itself against** - same category of problem as the underlying ESG/logistics data, one level up: there's no way to check whether Gemini's "I'm 85% confident" is actually well-calibrated, only whether it's *plausible* (varies sensibly by company, isn't uniformly maxed out) - which is what was tested live. Treat it as a useful relative signal ("the model is more sure about this field than that one"), not an absolute probability.
- **RAG chat answers (`ragService.js`) do not have confidence scores**, deferred per the build plan's own explicit lower-priority ordering. Converting the chat prompt to structured JSON output (needed to extract a confidence field via the same pattern used elsewhere) risks degrading the free-text conversational answer itself - Gemini's JSON mode is more prone to truncating or reformatting longer prose answers than a free-text completion is, and the chat UI currently renders the answer as natural prose, not a parsed object. If this is wanted later, the safer approach is likely a *second*, short Gemini call after the main answer asking it to self-rate its own just-given answer, rather than folding confidence into the same structured call as the answer.
- **A factor's individually-ranked "increased/decreased" direction in a narrative sentence is not guaranteed to match the overall reported delta's sign.** Real, found via live testing (not hypothetical): when an earlier score change was itself capped (`MAX_SCORE_DELTA`), the stored `previousScore` isn't the true raw weighted sum of that row's factors, so diffing against it can rank a factor whose own value/weight moved one direction on a change where the actual score moved the other way. Fixed to never phrase this as causal ("X caused the score to rise") - the sentence states the real delta and the dominant factor's own movement as two separate, both-true facts - but the *reader* still has to understand these are separate claims. A fully rigorous fix (explaining the uncapped raw formula's movement instead of the actual displayed score) was judged more confusing for a v1 explainability feature, not less, and was not built.
- **Health Score's real independence from Risk Score is smaller than the nominal weights suggest for a never-ESG/logistics-refreshed supplier** (carried forward from the previous verification pass, still accurate as of Phase 5 — see `healthScoreService.js`/`riskScoreService.js`; unaffected by Phase 5's changes since the weights are now editable but the *structural* overlap between doc-completeness/contract-health and Risk Score's own docScore/expiryScore inputs is unchanged).
- **Snapshot comparison UI remains a basic side-by-side raw-state view**, unchanged by Phase 5.
