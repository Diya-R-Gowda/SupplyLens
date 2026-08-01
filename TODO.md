# TODO.md

Things genuinely blocked on a human decision or action — API keys/signups,
product calls with real tradeoffs, infrastructure/billing, and known
limitations carried forward. Everything else that came up during Phase 3
was either implemented or fixed outright; this file only holds what's left.

Last updated: 2026-08-02 (end of Phase 3 — Supplier Intelligence).

## 1. API keys / signups only you can do

**None required right now.** Both external services Phase 3 needed already
had working keys in `.env`:
- `NEWS_API_KEY` — confirmed live against `newsapi.org/v2/everything`, real articles returned.
- `GEMINI_API_KEY` — confirmed live (embeddings, generation, sentiment classification all worked when quota allowed).

See the infrastructure section below, though — both are currently on
**free tiers with limits that were hit repeatedly during this phase's own
testing**, which will matter for real usage.

## 2. Product / business decisions (implemented my recommended default — revisable)

- **Enrichment data doesn't feed the risk-scoring formula.** Recomputing risk after enrichment currently only refreshes the *existing* news/expiry/document/country formula — it doesn't use industry, company size, or founding year as inputs. I didn't see a non-speculative way to decide "how much riskier is a startup than an enterprise" or "how much riskier is industry X than Y" without real product/business input. Recommendation: if this matters, a starting point would be a small per-industry risk weight table (like `countryRisk.json`), but that needs someone to actually decide the weights.
- **Gemini over a paid company-data API (Clearbit/OpenCorporates) for enrichment.** Ships now with no new signup, but accuracy is unverified and it can hallucinate (labeled "AI-generated — verify independently" in the UI). If enrichment accuracy becomes important, a real company-data provider would be more reliable — but needs a signup/key (see below) and probably a paid tier for meaningful coverage.
- **Risk score cap (±15/update) and rate limit (1 change per supplier+reason per 24h) are first-pass defaults**, not tuned against real usage data. If risk scores feel too sluggish or too jumpy in practice, these two constants (`MAX_SCORE_DELTA`, `RATE_LIMIT_MS` in `server/services/riskScoreService.js`) are the knobs to turn.
- **NewsAPI's real, keyless GDELT/RSS fallback was not built.** The spec asked for one only if the provided key was broken — it isn't, so I didn't build a fallback path to keep scope contained. If NewsAPI's cost or quota becomes a problem later, GDELT (`https://api.gdeltproject.org/api/v2/doc/doc`, free/keyless) is the natural addition.
- **News search uses exact-phrase matching on the supplier name** (`"Company Name"` quoted in the NewsAPI query). Reduces false-positive matches against unrelated same-word companies, but could miss articles that refer to the company differently (abbreviations, former names). Not tuned against real supplier names beyond the well-known test companies used this session.

## 3. Infrastructure / paid tier (needs your account, billing, or both)

- **Gemini API free-tier quota (20 `generateContent` requests/day) was exhausted multiple times during this single session's testing** — it's shared across RAG answers, sentiment classification, and enrichment. This is the single biggest practical limiter right now: real usage beyond a handful of requests/day needs a paid Gemini plan. (Embeddings are a separate quota and weren't affected.)
- **NewsAPI's free "Developer" plan caps at 100 requests/day and its own ToS restricts it to non-production use.** Fine for continued development, but a paid plan would be needed before any real deployment.
- **A real company-data API** (if you want more reliable enrichment than Gemini's best-effort research) would need its own signup and likely a paid tier for useful coverage — see the product-decision note above.

## 4. Known limitations / deferred work

- **Sentiment classification is Gemini-prompted, not a dedicated sentiment model.** Quality is reasonable on the examples seen live this session (see handoff summary) but hasn't been benchmarked at scale. Structured-JSON parsing failures degrade gracefully (article still stored, sentiment left `null`) rather than crashing, but a genuinely malformed Gemini response is possible in principle.
- **Enrichment's real output quality wasn't fully re-verified this session** — the Gemini daily quota was exhausted partway through Step 3 testing, so only the error-handling path (a real 429 correctly surfacing as a real error, not a fake success) got live-confirmed for enrichment specifically, on top of the earlier-in-session confirmation that the same JSON-parsing approach works correctly (via sentiment classification, which succeeded before quota ran out). Worth a quick live check with a fresh quota day.
- **`countryRisk.json` only covers 7 countries** (US/GB/IN/CN/BR/FR/DE); everything else defaults to a neutral 50. Fine as a v1, but a real dataset would improve country-risk accuracy.
- **`NewsCache` entries expire after 7 days** (a pre-existing TTL index from Phase 1/2, not changed in Phase 3). This means `news_mentioned` timeline events and their sentiment naturally disappear after a week — the timeline isn't a permanent historical record for that event type, only `RiskHistory`/`Document`/supplier-metadata events persist indefinitely.
- **Enrichment, timeline, and risk-history have no demo-mode data.** All three are real-DB-only (enrichment throws `DEMO_MODE_UNSUPPORTED`; timeline and risk history just return empty), matching the precedent set by document file-retrieval in Phase 2 for features that require real external calls or real accumulated data.
- **No "create supplier" UI still** (carried over from the Phase 2 backlog — unrelated to Phase 3, not touched).
