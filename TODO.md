# TODO.md

Things genuinely blocked on a human decision or action — API keys/signups,
product calls with real tradeoffs, infrastructure/billing, and known
limitations carried forward. Everything else that came up during Phase 3
was either implemented or fixed outright; this file only holds what's left.

Last updated: 2026-08-02 (news/AI provider swap — Currents API + Gemini 2.5 Flash-Lite).

## 1. API keys / signups only you can do

- **`CURRENTS_API_KEY` — you need to sign up for this.** News fetching was
  switched from NewsAPI to [Currents API](https://currentsapi.services/)
  (free tier: ~600-1,000 requests/day and explicitly allows commercial use,
  vs. NewsAPI's 100/day + non-production ToS). `server/services/newsService.js`
  now calls `https://api.currentsapi.services/v1/search` and reads the key
  from `process.env.CURRENTS_API_KEY`, which is currently **blank** in `.env`
  — news fetching (cron + manual refresh) will no-op with a console warning
  until you add a real key. Sign up at currentsapi.services, then set
  `CURRENTS_API_KEY=...` in `.env`.
- `GEMINI_API_KEY` — still fine, no action needed. Generation calls are now
  pinned to `gemini-3.5-flash-lite` instead of the `gemini-flash-latest`
  alias, which should raise the effective free-tier daily quota well above
  the ~20 requests/day the alias resolved to. (Tried `gemini-2.5-flash-lite`
  first per the general 2026 guidance on lite-model quotas, but it 404s as
  deprecated for this account — `gemini-3.5-flash-lite` is the current
  working lite model, confirmed live for both plain generation and
  structured-JSON sentiment classification.) Not yet re-verified against a
  full day of real usage.
- The old `NEWS_API_KEY` entry has been removed from `.env` — safe to delete
  the underlying NewsAPI key/account whenever convenient, nothing in the
  code references it anymore.

## 2. Product / business decisions (implemented my recommended default — revisable)

- **Enrichment data doesn't feed the risk-scoring formula.** Recomputing risk after enrichment currently only refreshes the *existing* news/expiry/document/country formula — it doesn't use industry, company size, or founding year as inputs. I didn't see a non-speculative way to decide "how much riskier is a startup than an enterprise" or "how much riskier is industry X than Y" without real product/business input. Recommendation: if this matters, a starting point would be a small per-industry risk weight table (like `countryRisk.json`), but that needs someone to actually decide the weights.
- **Gemini over a paid company-data API (Clearbit/OpenCorporates) for enrichment.** Ships now with no new signup, but accuracy is unverified and it can hallucinate (labeled "AI-generated — verify independently" in the UI). If enrichment accuracy becomes important, a real company-data provider would be more reliable — but needs a signup/key (see below) and probably a paid tier for meaningful coverage.
- **Risk score cap (±15/update) and rate limit (1 change per supplier+reason per 24h) are first-pass defaults**, not tuned against real usage data. If risk scores feel too sluggish or too jumpy in practice, these two constants (`MAX_SCORE_DELTA`, `RATE_LIMIT_MS` in `server/services/riskScoreService.js`) are the knobs to turn.
- **A keyless GDELT/RSS fallback was not built.** Only needed if Currents' key/quota becomes a blocker — GDELT (`https://api.gdeltproject.org/api/v2/doc/doc`, free/keyless) is the natural addition if so.
- **News search now uses Currents' `keywords` param with the plain supplier name** (switched from NewsAPI's quoted exact-phrase `q` param, since Currents' search endpoint doesn't document phrase-exact matching the same way). This may be looser than the old exact-phrase match — worth watching for false-positive matches against unrelated same-word companies once a real key is in place and this can be tested against real supplier names.

## 3. Infrastructure / paid tier (needs your account, billing, or both)

- **Gemini API free-tier quota was hit repeatedly during Phase 3 testing** (~20 `generateContent` requests/day on the `gemini-flash-latest` alias) — shared across RAG answers, sentiment classification, and enrichment. Now pinned to `gemini-2.5-flash-lite` instead, which should raise this to ~1,000/day for free. If that's still not enough for real usage, a paid Gemini plan is the next step. (Embeddings are a separate quota and weren't affected either way.)
- **NewsAPI's free tier (100/day, non-production ToS) was replaced with Currents API** (~600-1,000/day, commercial use allowed) — see section 1, needs a key. If Currents' limits are ever hit in practice, their paid tiers are the next step.
- **A real company-data API** (if you want more reliable enrichment than Gemini's best-effort research) would need its own signup and likely a paid tier for useful coverage — see the product-decision note above.

## 4. Known limitations / deferred work

- **Sentiment classification is Gemini-prompted, not a dedicated sentiment model.** Quality is reasonable on the examples seen live this session (see handoff summary) but hasn't been benchmarked at scale. Structured-JSON parsing failures degrade gracefully (article still stored, sentiment left `null`) rather than crashing, but a genuinely malformed Gemini response is possible in principle.
- **Enrichment's real output quality wasn't fully re-verified this session** — the Gemini daily quota was exhausted partway through Step 3 testing, so only the error-handling path (a real 429 correctly surfacing as a real error, not a fake success) got live-confirmed for enrichment specifically, on top of the earlier-in-session confirmation that the same JSON-parsing approach works correctly (via sentiment classification, which succeeded before quota ran out). Worth a quick live check with a fresh quota day.
- **`countryRisk.json` only covers 7 countries** (US/GB/IN/CN/BR/FR/DE); everything else defaults to a neutral 50. Fine as a v1, but a real dataset would improve country-risk accuracy.
- **`NewsCache` entries expire after 7 days** (a pre-existing TTL index from Phase 1/2, not changed in Phase 3). This means `news_mentioned` timeline events and their sentiment naturally disappear after a week — the timeline isn't a permanent historical record for that event type, only `RiskHistory`/`Document`/supplier-metadata events persist indefinitely.
- **Enrichment, timeline, and risk-history have no demo-mode data.** All three are real-DB-only (enrichment throws `DEMO_MODE_UNSUPPORTED`; timeline and risk history just return empty), matching the precedent set by document file-retrieval in Phase 2 for features that require real external calls or real accumulated data.
- **No "create supplier" UI still** (carried over from the Phase 2 backlog — unrelated to Phase 3, not touched).
