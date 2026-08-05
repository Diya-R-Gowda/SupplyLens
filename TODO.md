# TODO.md

Things genuinely blocked on a human decision or action — API keys/signups,
product calls with real tradeoffs, infrastructure/billing, and known
limitations carried forward. Everything else that came up during Phase 3/4
was either implemented or fixed outright; this file only holds what's left.

Last updated: 2026-08-05 (end of Phase 4 — Supplier Digital Twin).

## 1. API keys / signups only you can do

**None required right now.** Phase 4 (ESG/logistics estimates, Digital
Twin, Health Score, Snapshots) used only the Gemini key already in `.env`
— no new signup. Both existing keys are confirmed live:
- `CURRENTS_API_KEY` — live, confirmed against `api.currentsapi.services`.
- `GEMINI_API_KEY` — live, pinned to `gemini-3.5-flash-lite`.

One real scale consideration for later: Phase 4 adds two more Gemini calls
per supplier (`esg-refresh`, `logistics-refresh`) on top of Phase 3's
enrichment + sentiment calls, so a supplier refreshed across all AI-backed
features in one session now makes up to ~4-8 Gemini requests (sentiment is
per-article) instead of ~2. Same quota as before, just more draws on it —
see section 3.

## 2. Product / business decisions (implemented my recommended default — revisable)

**Carried from Phase 3 (still open):**
- **Enrichment data doesn't feed either scoring formula.** No non-speculative signal for how industry/company-size/founding-year should move a score without real product input.
- **Gemini over a paid company-data API for enrichment/ESG/logistics.** No new signup, but accuracy is unverified (see section 4). A real provider would need a signup/key — see section 3.
- **A keyless GDELT/RSS fallback was not built** for news — only needed if Currents' key/quota becomes a blocker.

**New this phase:**
- **ESG field selection** (`environmentalScore`/`socialScore`/`governanceScore` 0-100 + a summary) — a minimal, proportionate set rather than a full ESG framework (e.g. no separate carbon/water/diversity sub-metrics). If deeper ESG detail matters later, this is the field set to expand.
- **Logistics field selection** (`onTimeDeliveryRate`, `averageLeadTimeDays`, `logisticsNotes`) — same reasoning; a real logistics/supply-chain data provider would have far more granular metrics (per-lane performance, carrier data, etc.) if this becomes important.
- **Health Score's weight table** (25% ESG composite / 20% logistics / 15% document completeness / 15% contract health / 25% inverted risk score) is a first-pass, reasoned default, not tuned against real outcomes. The 25% cap on the risk-score component is deliberate — it's one real input, but keeping it a minority weight is what makes ESG+logistics (45% combined) the metric's actual differentiator. If Health Score ever feels like it's just tracking Risk Score inversely, that cap is the first knob to check. Constants live in `server/services/healthScoreService.js`.
- **Health Score reuses Risk Score's exact cap/rate-limit defaults** (±15/update, 24h per reason) rather than independently-tuned values, for consistency at launch. These can be tuned separately per metric later (`MAX_SCORE_DELTA`/`RATE_LIMIT_MS` in each service file).
- **Manual `riskScore` edits (`PUT`/`PATCH /suppliers/:id`) skip the auto-recompute, but only when `riskScore` is explicitly present in that request.** Otherwise the newly-added sync trigger would immediately overwrite an admin's deliberate manual entry with the computed value. Health Score has no equivalent override field, so it always recomputes on a manual edit. This is a real judgment call, not an obvious default — worth revisiting if manual risk-score overrides turn out to be rare/unwanted in practice (in which case always recomputing would be simpler and more consistent).
- **Digital Twin is compute-on-read, not persisted** — matches the timeline endpoint's existing precedent, avoids a sync burden. Revisit if this becomes a real performance concern (see section 4) or if Historical Snapshots' needs evolve to want a persisted "current" twin document.
- **Snapshot retention is a fixed cap (last 100 per supplier)**, not a time-based thinning policy (e.g. "keep daily for 90 days, then thin to weekly"). Simpler to reason about and test; revisit if a time-based policy turns out to matter more once real usage accumulates.
- **Scheduled snapshot cadence is daily** (`server/jobs/snapshotCron.js`), coarser than news's 6-hourly cadence — a full-state snapshot is for historical comparison/auditing, not freshness. Easy to change if daily turns out to be too sparse or too frequent.
- **"Significant change" snapshot trigger reuses the same ±15 cap threshold** that already defines "capped" for both scores (`server/services/twinSyncService.js`) — a delta at or above that threshold means the real underlying change was even larger than what got applied. Simple and already-computed, but arbitrary; could be tuned to a different threshold or a different signal entirely.

## 3. Infrastructure / paid tier (needs your account, billing, or both)

- **Gemini API free-tier quota** — still the main constraint if real usage scales up; see section 1 for Phase 4's added draw on it. Pinned to `gemini-3.5-flash-lite`, confirmed with real headroom during all of Phase 3/4's testing.
- **NewsAPI replaced with Currents API** — see section 1, already resolved.
- **A real ESG/logistics/company-data provider** (if Gemini's best-effort estimates aren't reliable enough - see section 4) would need its own signup and likely a paid tier for useful coverage.

## 4. Known limitations / deferred work

**Carried from Phase 3 (still open):**
- Sentiment classification is Gemini-prompted, not a dedicated sentiment model - reasonable but unbenchmarked at scale.
- `countryRisk.json` only covers 7 countries; everything else defaults to a neutral 50.
- `NewsCache` entries expire after 7 days, so `news_mentioned` timeline events naturally disappear after a week (Snapshots now provide a longer-lived record of the *sentiment rollup* at least, since they capture the twin's `news.sentimentSummary` at each point).
- No "create supplier" UI still.

**New this phase:**
- **ESG and logistics data quality can't be verified against ground truth** - same category as Phase 3's Toyota company-size caveat, now doubled: there's no "correct answer" to check an environmental/social/governance score or an on-time-delivery-rate estimate against, unlike ingestion/RAG which could be tested against a real PDF's actual content. Labeled "AI-generated - verify independently" in the UI, same as enrichment, but that's a UI disclaimer, not a quality guarantee.
- **Logistics data (`onTimeDeliveryRate`/`averageLeadTimeDays`) will return `null` far more often than ESG or enrichment do**, by design and by the nature of the data - most companies simply don't publish these figures anywhere Gemini could have learned them. Confirmed live across every real company tested this phase (Tesla, Siemens, Patagonia, ExxonMobil) - none returned a non-null on-time-delivery figure. This is expected behavior, not a bug, but means Health Score's logistics factor will sit at its neutral default (50) for most real suppliers until/unless a real logistics data provider is integrated.
- **Health Score's formula hasn't been validated against real supplier outcomes** - it's internally consistent and demonstrably differentiated from Risk Score (verified live: two suppliers with identical risk score scored 65 vs. 44 based purely on ESG/logistics/contract differences), but "does a higher Health Score actually correlate with being a better supplier to work with" is an open question no amount of code-level testing can answer - only real usage over time can.
- **Digital Twin's compute-on-read approach re-sorts/re-scans a supplier's full news/document/risk-history/health-history arrays on every request.** Fine at current data volumes (verified live, no perceptible latency), but unbenchmarked at scale - a supplier with years of accumulated news/history could see this get slower over time, at which point persisting a twin document (updated incrementally rather than recomputed from scratch) would be the fix.
- **Snapshot comparison UI is a basic side-by-side raw-state view, not a highlighted field-by-field diff** - deliberate, per the phase spec's explicit "don't over-invest here" guidance. A real diff view is a reasonable future enhancement, not a gap.
- **No demo-mode data for ESG/logistics/twin/snapshots/health**, matching the precedent already set for enrichment/timeline/risk-history in Phase 3 - all real-DB-only.
