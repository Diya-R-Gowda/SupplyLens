# Contributing to SupplyLens

First off, thank you for considering contributing to **SupplyLens**! 🎉

SupplyLens is an AI-powered Supplier Risk Intelligence Platform designed to help small and medium-sized businesses (SMBs) proactively identify, analyze, and mitigate supplier risks through intelligent automation, explainable AI, and predictive analytics.

Whether you're fixing bugs, improving documentation, adding features, or optimizing performance, every contribution is appreciated.

---

# Table of Contents

- Project Vision
- Development Roadmap
- Version Roadmap
- Getting Started
- Development Setup
- Project Structure
- Branch Naming Convention
- Commit Guidelines
- Coding Standards
- Pull Requests
- Reporting Bugs
- Feature Requests
- Documentation
- Code of Conduct
- License

---

# Project Vision

SupplyLens aims to become more than a supplier management application.

The long-term vision is to build an **AI-powered Digital Twin Platform** for supplier intelligence.

Instead of simply storing supplier information, SupplyLens continuously learns from:

- Supplier documents
- Contracts
- News articles
- ESG reports
- Delivery history
- Financial information
- Geopolitical events
- Logistics disruptions

and combines these signals into a continuously evolving Digital Twin capable of:

- Risk prediction
- Explainable AI
- Supplier recommendations
- Scenario simulation
- Intelligent decision support

---

# Development Roadmap

| Phase | Goal | Key Features | Deliverables |
|------|------|--------------|--------------|
| **Phase 1 – Foundation** | Build the core supplier management platform | Authentication, Supplier CRUD, Dashboard, MongoDB integration | Functional MERN application |
| **Phase 2 – Intelligent Data Layer** | Make uploaded documents searchable | PDF parsing, chunking, embeddings, MongoDB Atlas Search, RAG chatbot | AI-powered supplier knowledge retrieval |
| **Phase 3 – Supplier Intelligence** | Gather external supplier intelligence | News aggregation, sentiment analysis, company enrichment | Live supplier news feed with sentiment trends |
| **Phase 4 – Digital Twin Engine** ⭐ | Create a dynamic supplier representation | Merge documents, contracts, ESG, logistics, news, and historical data | Live supplier Digital Twin |
| **Phase 5 – Explainable Risk Scoring** | Improve transparency | Weighted risk model, confidence scores, factor attribution | Explainable supplier risk dashboard |
| **Phase 6 – Predictive Analytics** | Forecast supplier performance | Time-series forecasting, anomaly detection, early warnings | Predictive risk insights |
| **Phase 7 – Scenario Simulator** | Support business decisions | "What-if" analysis, supplier failure simulation, alternate supplier recommendations | AI-powered decision support |
| **Phase 8 – Multi-Agent Intelligence** | Specialized AI assistants | Risk, Finance, ESG, Legal, Logistics, and Manager agents | Coordinated AI analysis |
| **Phase 9 – Supply Chain Visualization** | Visualize supplier relationships | Interactive graph, dependency mapping, global supplier map | Digital Twin visualization |
| **Phase 10 – Enterprise Readiness** | Prepare for production | CI/CD, Docker, testing, monitoring, RBAC, documentation | Production-ready SaaS platform |

---
# 🚀 Project Roadmap



# Remaining Work — Phase 1 (Foundation) — ✅ COMPLETE (2026-08-01)

| Status | Item | Notes |
|---------|------|-------|
| 🟢 | Authentication | JWT authentication, bcrypt password hashing, refresh tokens (rotation-on-use), protected routes, and role-based access control (`admin`/`viewer`) implemented and smoke-tested. |
| 🟢 | Supplier CRUD | Supplier creation, editing, deletion, searching, filtering, pagination, and validation complete. Update/delete are admin-only; viewers are read-only. |
| 🟢 | Dashboard | Responsive dashboard with KPIs, category/growth charts, and a recent-activity feed, backed by a real MongoDB aggregation endpoint. |
| 🟢 | Database Design | Schemas finalized with indexes (incl. compound org+name uniqueness), timestamps, and field-level validation. |
| 🟢 | REST API | RESTful endpoints for auth, suppliers, and dashboard stats, all on a consistent response envelope and status-code convention. |
| 🟢 | Error Handling | Centralized error middleware, 404 handler, and standardized `{ success, data/error }` responses across every route. |
| 🟢 | UI Components | Tailwind installed/configured; shared Button/Input/Modal/Card/Badge component library in place; dead files removed. |
| 🟢 | API Documentation | Full Swagger/OpenAPI docs at `/api-docs`, covering every endpoint across auth, suppliers, dashboard, documents, news, and RAG. |

See [Phase 1 Complete — End-to-End Smoke Test](#-phase-1-complete--end-to-end-smoke-test-2026-08-01) below for the full verification results.

## Phase 1 — Technical Summary

**Stack additions this phase:** Tailwind CSS v4 (PostCSS + config file, not just the v4 Vite plugin), recharts, swagger-jsdoc + swagger-ui-express, express-validator. A demo-mode fallback (in-memory, activates automatically whenever MongoDB isn't connected) is mirrored alongside every real-DB code path across all routes.

- **Auth** — JWT access tokens (15min) + opaque refresh tokens (7d, rotation-on-use, sha256-hashed at rest), bcrypt password hashing, `Authorization: Bearer` header standard, distinct error codes for missing/expired/invalid tokens (`TOKEN_MISSING`/`TOKEN_EXPIRED`/`TOKEN_INVALID`). Split `register`/`login`/`refresh`/`logout` endpoints.
- **RBAC** — two roles, `admin` and `viewer`. `admin` can create/update/delete suppliers; `viewer` is read-only everywhere (list/get/dashboard). Enforced via a shared `requireRole('admin')` middleware on create, update, and delete alike.
- **Multi-tenancy** — every supplier query scoped by `orgId`. A supplier belonging to a different org returns **404, never 403** — existence can't be inferred cross-org. A malformed id (not a valid ObjectId shape) gets a distinct **400**, so 400-vs-404 consistently means "bad input" vs. "not found/not yours," across `GET`/`PUT`/`PATCH`/`DELETE` alike.
- **Supplier CRUD** — full create/read/update/delete, case-insensitive substring name search, category + country filters, pagination (`page`/`limit`, clamped to 100 max), express-validator on every mutable field including `contractExpiry` (added last, deliberately allows past dates).
- **Dashboard** — a single MongoDB `$facet` aggregation (`GET /dashboard/stats`) computing total count, category breakdown, average risk score, 7/30-day new-supplier counts, a 30-day zero-filled growth series, and a 5-item recent-activity feed — no client-side aggregation. Frontend: KPI cards, a donut (category) + bar (growth) chart via recharts, activity feed, loading skeleton, empty state, responsive at 375/768/1440px breakpoints.
- **Error handling** — centralized middleware, one envelope everywhere: success `{ success: true, data, message?, meta? }`, error `{ success: false, error: { message, code, details? } }`. Mongoose `CastError`→400, duplicate key→409 (all compound-index fields listed in the message, not just the first), `ValidationError`→400 with field-level details.
- **UI component library** — `Button` (primary/secondary/danger variants + loading state), `Input` (label + inline error), `Modal`, `Card`, `Badge` — extracted from the pages that already used ad hoc versions of each, so styling is now DRY rather than duplicated per page.
- **API docs** — Swagger UI at `/api-docs`, every endpoint documented with real request/response examples, reusable `User`/`Supplier`/`SuccessEnvelope`/`ErrorEnvelope` component schemas, Bearer security scheme, known-limitation notes inline on the documents/news/RAG endpoints (see Backlog below).

Full pass/fail verification of all of the above is in [Phase 1 Complete — End-to-End Smoke Test](#-phase-1-complete--end-to-end-smoke-test-2026-08-01); the reasoning behind the RBAC/date/riskScore calls specifically is in [Key Decisions & Rationale](#key-decisions--rationale).

---

# Remaining Work — Phase 2 (Intelligent Data Layer) — ✅ COMPLETE (2026-08-02)

| Status | Item | Notes |
|---------|------|-------|
| 🟢 | PDF Upload Pipeline | Original PDF binary stored in GridFS on upload, before parsing runs; failed ingestion cleans up the GridFS file so nothing is orphaned. Org-scoped upload/list/delete/retrieve endpoints. |
| 🟢 | PDF Parsing | Rewritten to use `pdf-parse` v2's actual `PDFParse` class API (the installed version isn't a callable function like v1) — extracts text and page count from a real buffer. |
| 🟢 | Document Chunking | Fixed-size chunking (~2000 chars, 200-char overlap) in `ingestService.js`; each chunk records its parent `docId` so a single document's chunks can be deleted independently. |
| 🟢 | Embedding Generation | `gemini-embedding-001`, called with `outputDimensionality: 768` to match the existing Atlas index dimension (native output is 3072). |
| 🟢 | MongoDB Atlas Vector Search | `default` index (768-dim, cosine, `supplierId` filter) recreated on `docchunks` — the collection Mongoose actually writes to (a same-named index existed on an orphaned `doc_chunks` collection and was dropped). |
| 🟢 | RAG Chatbot | Real `$vectorSearch` + `gemini-flash-latest` generation, grounded answers with source-filename attribution, retries on a true zero-result response to ride out Atlas Search's indexing lag. |
| 🟢 | Conversation Memory | `Conversation` model (supplierId/orgId/userId/messages), multi-turn context via an 8-message history window, private per-user, list/resume/new-conversation wired into the real UI. |

See [Phase 2 Complete — End-to-End Smoke Test](#-phase-2-complete--end-to-end-smoke-test-2026-08-02) below for the full verification results.

## Phase 2 — Technical Summary

**Stack additions this phase:** GridFS (`mongoose.mongo.GridFSBucket`) for PDF binary storage, no new npm packages — `pdf-parse` v2 and `@google/generative-ai` were already installed but unused/broken.

- **Gemini models** — both call sites in `embedService.js` were pointed at models that no longer exist for this API key (`text-embedding-004`, `gemini-1.5-flash`). Fixed to `gemini-embedding-001` (embedding) and `gemini-flash-latest` (generation). Note: `gemini-2.5-flash` was tried first for generation and failed live ("no longer available to new users") despite being listed in `ListModels` — the `-latest` alias proved more reliable for this key.
- **Vector search index** — audited and found the real, `READY` Atlas index was sitting on `doc_chunks` (an empty, orphaned collection) while the Mongoose model actually writes to `docchunks`. Recreated the identical index definition on `docchunks` and dropped the orphaned one, verified via `listSearchIndexes()`.
- **Ingestion pipeline** — `ingestService.js` was calling `pdf-parse` v1-style (`pdf(buffer)`), but the installed v2 exports a `PDFParse` class; every real upload 500'd. Rewritten to instantiate `PDFParse`, call `getText()`, and `destroy()` the parser when done. Restructured so the `Document` record is created *before* its chunks, so each `DocChunk.docId` is populated (needed later for per-document deletion).
- **GridFS storage** — original PDF binaries are streamed into a `pdfDocuments` bucket on upload (before the parse/chunk/embed pipeline runs), with the file id stored on the `Document` record. A new org-scoped `GET /suppliers/:id/documents/:docId/file` streams it back; `DELETE /documents/:supplierId/:docId` (new — no delete endpoint existed for documents before) removes the Document, its DocChunks, and its GridFS file together, so nothing is ever orphaned either direction.
- **RAG pipeline** — `ragService.js` embeds the question, runs `$vectorSearch` filtered by `supplierId`, retries specifically on a **true zero-result** response (3 attempts, 1s/2s/3s delays, ~6s cumulative) to cover Atlas Search's asynchronous indexing lag — live-measured at ~6–10s for a just-uploaded chunk. A non-empty but low-relevance result is never retried; it returns immediately and Gemini itself is instructed to say "I don't know" rather than hallucinate. Each answer records the distinct source filenames it was grounded in.
- **Conversation memory** — a `Conversation` document per chat thread (`supplierId`, `orgId`, `userId`, `messages[]`). The RAG endpoint accepts an optional `conversationId` (omit to start a new one), passes the last 8 messages (4 exchanges) as history so follow-ups like "why is it that high?" resolve correctly, and appends both turns after generating. Conversations are **private per-user** — scoped by `supplierId + orgId + userId`, not shared org-wide, since nothing anywhere suggested org-wide shared chat history was intended. `GET /suppliers/:id/conversations` lists a user's own past conversations for a supplier; `RagChatDrawer.jsx` was rewired to send/receive real history instead of keeping it purely local, with a "New" button and a resume dropdown.
- **Org-scoping security fixes** — audited every route taking a `supplierId`/`id` param after finding `rag.js` missed the org-scoped lookup pattern used everywhere else; live-exploited (with two real orgs) and fixed three more identical gaps: `GET /news/:supplierId`, `GET /documents/:supplierId` (list), and `POST /documents/upload/:supplierId`. All four now use the same `Supplier.findOne({_id, orgId})` → 404 pattern as `suppliers.js`. Four independent misses of an established pattern is flagged in the Backlog as a signal the pattern itself needs to be structural, not just conventional.

Full pass/fail verification of all of the above is in [Phase 2 Complete — End-to-End Smoke Test](#-phase-2-complete--end-to-end-smoke-test-2026-08-02); the reasoning behind the conversation-privacy, history-window, and retry-delay calls specifically is in [Key Decisions & Rationale](#key-decisions--rationale-1).

---

# Remaining Work — Phase 3 (Supplier Intelligence) — ✅ COMPLETE (2026-08-02)

| Status | Item | Notes |
|---------|------|-------|
| 🟢 | News Aggregation | NewsAPI (real, working key) queried per-supplier by exact-phrase name match; found substantial unwired logic already built (`newsService.js`, `jobs/newsCron.js`) - fixed the schema gap that silently dropped fields, org-scoped it, added dedup and per-article failure isolation, and wired the cron into `index.js` (every 6h) plus a manual `POST /news/:supplierId/refresh` endpoint. |
| 🟢 | Sentiment Analysis | Gemini-prompted structured classification (label + -1..1 score), extracted into its own `sentimentService.js`. A failing classification stores the article with `null` sentiment rather than losing it or the rest of the batch. |
| 🟢 | Company Enrichment | Gemini-prompted industry/company-size/founded-year/summary via `POST /suppliers/:id/enrich`, stored on `Supplier.enrichment` with a re-runnable `enrichedAt` timestamp. UI clearly labels it "AI-generated - verify independently." |
| 🟢 | Supplier Timeline | `GET /suppliers/:id/timeline` - aggregated on read from Supplier/Document/NewsCache/RiskHistory (no new event-log model, avoids a sync burden), merging 5 event types sorted most recent first. |
| 🟢 | Live Risk Updates | Found a complete, reasonable weighted formula already built (`riskScoreService.js`) but only ever called from the dead cron. Rewired with a `RiskHistory` audit trail, a +/-15 per-update cap, and a 24h per-(supplier,reason) rate limit; triggered from both news ingestion and enrichment. |

See [Phase 3 Complete — End-to-End Smoke Test](#-phase-3-complete--end-to-end-smoke-test-2026-08-02) below for the full verification results.

## Phase 3 — Technical Summary

**Major finding at the start of this phase:** a significant amount of News + Risk logic already existed but was completely unwired - `newsService.js` had a real NewsAPI + Gemini-sentiment integration, and `riskScoreService.js` had a complete weighted risk formula, but neither was ever called except by `jobs/newsCron.js`, which itself was never required anywhere (confirmed via a repo-wide grep). Verified everything live before building on top of it, per the same discipline established in Phase 2.

- **News pipeline** - `NewsCache` was missing `url`/`source`/`orgId` fields the ingestion code was already trying to save (Mongoose silently dropped them); added them plus a numeric `sentimentScore`. Ingestion now dedupes by `supplierId`+`url` and isolates per-article failures (confirmed live against a real Gemini 429: the first article got real sentiment, the rest were stored with `null` sentiment instead of being lost). `jobs/newsCron.js` now actually runs, every 6 hours, guarded to no-op in demo mode.
- **Sentiment** - moved out of `newsService.js` into its own `sentimentService.js`, upgraded from a bare word to structured JSON (label + numeric score) so the risk formula and UI both have something to work with.
- **Enrichment** - Gemini directly, not a paid company-data API (Clearbit/OpenCorporates) - no new signup needed, matching the spec's own guidance to default to the no-key-required path. Explicitly does **not** feed the risk-scoring formula yet (no non-speculative signal for how industry/size should move a score without product input - see `TODO.md`).
- **Timeline** - deliberately aggregation-based, not a dedicated event-log model, since every event type (`supplier_created`/`updated`, `document_uploaded`, `news_mentioned`, `risk_changed`) already has a source of truth elsewhere.
- **Risk scoring** - same 40/30/20/10 weighted formula as the original unwired code (news sentiment / contract expiry / missing documents / country risk), now with a `RiskHistory` audit trail (previous/new score, delta, reason, and the four underlying factors - so "why did this change" is always answerable), a +/-15 cap per update, and a 24h rate limit per (supplier, reason) pair.
- **Org-scoping** - checked explicitly on every new/touched route (`news.js` GET+POST, `suppliers.js` enrich+timeline), per the standing lesson from Phase 2's four-gap audit; none of the new Phase 3 endpoints repeated that mistake, all live-verified with a second org.

Full pass/fail verification of all of the above is in [Phase 3 Complete — End-to-End Smoke Test](#-phase-3-complete--end-to-end-smoke-test-2026-08-02); open items (API keys/quotas, product decisions, known limitations) are tracked in `TODO.md`, not here.

---

# Remaining Work — Phase 4 (Supplier Digital Twin) — ✅ COMPLETE (2026-08-05)

| Status | Item | Notes |
|---------|------|-------|
| 🟢 | Unified Supplier Model | ESG and logistics sub-documents added to `Supplier` (same self-contained, re-runnable shape as Phase 3's `enrichment`), Gemini-prompted like enrichment. Timeline's `Promise.all` data-gathering extracted into a shared `supplierAggregationService.js` helper, reused by both timeline and the new twin endpoint. |
| 🟢 | Digital Twin Engine | `GET /suppliers/:id/twin` - current-state synthesis (live risk/health factors, enrichment/ESG/logistics, document count, news sentiment rollup, contract status), compute-on-read like timeline, not persisted. |
| 🟢 | Supplier Health Score | Distinct metric from Risk Score (audit's explicit warning: must not be Risk Score renamed) - own weighted formula incorporating ESG/logistics/document-completeness/contract-health plus a minority-weighted inverted risk component. Shares Risk Score's cap/rate-limit mechanics via an extracted `scoringEngine.js`, not its formula. |
| 🟢 | Historical Snapshots | `SupplierSnapshot` model persists the full twin-shaped state at a point in time. Scheduled daily + on-demand manual + automatic on a significant (capped) score swing. Fixed 100-per-supplier retention cap. Basic side-by-side comparison UI. |
| 🟢 | Twin Synchronization | Closed a real pre-existing gap the audit found: document upload/delete and manual supplier edits never triggered any score recompute at all. Now wired via a shared `twinSyncService.js`, along with extending every existing risk-only trigger to also refresh Health Score. |

See [Phase 4 Complete — End-to-End Smoke Test](#-phase-4-complete--end-to-end-smoke-test-2026-08-05) below for the full verification results.

## Phase 4 — Technical Summary

**Starting point: a completed read-only audit** (not a build-blind start) that confirmed live: the timeline endpoint's aggregation pattern was the closest existing analog to a "unified view" but shaped wrong for a twin (event list vs. current state); ESG/logistics data was completely absent from the schema; `riskScoreService.js`'s mechanics (factors → weighted score → capped/rate-limited update → audit history) were reusable for Health Score but its formula/output were not; no broader snapshot mechanism existed beyond `RiskHistory`'s narrow risk-only factors; and `computeRiskScore()` was only called from 3 places, with document upload/delete and manual supplier edits confirmed via grep to never trigger any recompute at all.

- **Unified Supplier Model** - ESG (`environmentalScore`/`socialScore`/`governanceScore`/summary) and logistics (`onTimeDeliveryRate`/`averageLeadTimeDays`/notes) added as `Supplier` sub-documents, Gemini-prompted via new `enrichEsgData`/`enrichLogisticsData` functions in `enrichmentService.js`. Found and fixed a real bug during testing: `Number(null)` evaluates to `0` in JS, so the initial coercion logic silently turned Gemini's correct "I don't know" `null` responses into a misleading literal `0` (read as "0% on-time delivery" instead of "unknown") - both functions now explicitly check for `null`/`undefined` before coercing.
- **Digital Twin** - `buildSupplierTwin()` synthesizes current risk/health scores with *live* factor breakdowns (exported `computeFactors`/`computeHealthFactors` so the twin always reflects current data, not just the factors recorded at the time of the last actual score change), enrichment/ESG/logistics, document count + most recent upload, a news sentiment rollup, and contract status. Compute-on-read, matching timeline's own precedent.
- **Health Score** - a genuinely distinct metric from Risk Score, per the audit's explicit warning. 25% ESG composite / 20% logistics / 15% document completeness / 15% contract health / 25% inverted risk score (deliberately capped at a minority weight so ESG+logistics, 45% combined, are the metric's real differentiator). Verified live: two suppliers with identical risk score (0, never computed) scored 65 vs. 44 based entirely on ESG/logistics/contract differences - real proof it isn't Risk Score under a new name.
- **Historical Snapshots** - `SupplierSnapshot` reuses the twin's exact output shape, so "what a snapshot looks like" and "what the live twin looks like" never drift apart. Scheduled daily (coarser than news's 6-hourly cadence - snapshots are for historical comparison, not freshness), on-demand via a manual endpoint, and automatically when either score moves by a significant (capped, ≥15-point) amount. Fixed 100-per-supplier retention cap, verified with a temporarily-lowered test cap.
- **Twin Synchronization** - closed the audit's confirmed gap: document upload/delete and manual supplier edits (`PUT`/`PATCH`) now trigger a shared `syncScoresAfterChange()` that recomputes risk then health (health's inverted-risk factor depends on risk's *current*, post-recompute value, so ordering matters). ESG/logistics refreshes call `computeHealthScore` directly instead, since neither factors into the risk formula at all. One real product judgment call: a manual edit that explicitly sets `riskScore` skips the risk auto-recompute (treated as an intentional override) but still recomputes Health Score, which has no equivalent override field.

Full pass/fail verification of all of the above is in [Phase 4 Complete — End-to-End Smoke Test](#-phase-4-complete--end-to-end-smoke-test-2026-08-05); open items (weight-table tuning, retention/cadence defaults, known limitations) are tracked in `TODO.md`.

---

# Remaining Work — Phase 5 (Explainable Risk Scoring) — ✅ COMPLETE (2026-08-06)

| Status | Item | Notes |
|---------|------|-------|
| 🟢 | Risk Scoring Engine | Per-org configurable weight table (`RiskConfig` model) for both Risk and Health Score formulas. Hard-rejected, not auto-normalized, if a submitted weight set doesn't sum to 1 (±0.005 tolerance). Admin-only `PATCH /org/risk-config`; lazily created on first edit, `GET` never writes a row. |
| 🟢 | Explainable AI | Deterministic narrative sentences (`narrativeService.js`, no extra Gemini call) explaining each risk/health score change - names the dominant contributing factor, weight-aware. Wired into Timeline and a "Why did this change?" toggle on the Digital Twin panel. |
| 🟢 | Confidence Scores | Self-reported 0-1 confidence added to the existing enrichment/ESG/logistics/sentiment Gemini prompts (no new call sites), rendered via a color-coded `ConfidenceBadge` everywhere that data is shown. |
| 🟢 | Risk History | New `GET /suppliers/:id/risk-health-history` endpoint plus a dual-line recharts trend chart on the supplier page; dashboard gained an average-health-score stat and a "Trending down" worsening-health panel. |
| 🟢 | Alert Thresholds | Per-org configurable risk/health thresholds (defaults matched to `RiskBadge`/`HealthBadge`'s existing red-zone cutoffs), compute-on-read breach state (no scheduled cron needed), an in-app per-supplier alert banner, a dashboard-wide active-alerts panel, and an automatic snapshot on a fresh threshold crossing. |

See [Phase 5 Complete — End-to-End Smoke Test](#-phase-5-complete--end-to-end-smoke-test-2026-08-06) below for the full verification results.

## Phase 5 — Technical Summary

**Starting point: a completed read-only audit** against the Explainable Risk Scoring spec (Risk Scoring Engine, Explainable AI, Confidence Scores, Risk History, Alert Thresholds), confirming live that scoring weights were hardcoded literals inside `riskScoreService.js`/`healthScoreService.js`, no factor-attribution narrative existed anywhere, enrichment/ESG/logistics/sentiment returned no confidence signal, `RiskHistory`/`HealthHistory` existed but had no dedicated trend endpoint or chart, and there was no threshold/alerting concept at all.

- **Configurable weights** - `RiskConfig` (per-`orgId`, unique) holds `riskWeights`/`healthWeights`/`alertThresholds` sub-documents with defaults matching the original Phase 3/4 formulas exactly, so an org that never opens the settings panel sees byte-identical scores to pre-Phase-5 behavior. Validation is a hard 400 rejection with the actual submitted sum in the error, not a silent rescale - deliberately, so a misconfigured org can't silently produce nonsense scores (see `TODO.md`). A percent-based (0-100) `RiskConfigPanel.jsx` editor with a live running-total check gates the Save button until both risk and health groups sum to exactly 100%.
- **Explainable narratives** - `narrativeService.js` ranks each formula's factors by contribution and turns the top one into a plain-English sentence, reusing the already-persisted `RiskHistory`/`HealthHistory` rows rather than a new Gemini call. Two real bugs were found and fixed via live testing, not code review: a factor's individually-ranked direction could contradict the actual (capped) reported delta's sign, and a weight-only edit with no underlying factor value change produced a bare "score fell by -11" narrative naming no factor at all, since the original diff model only detected value changes. Fixed by adding a `weightsUsed` snapshot field to both history models and changing the contribution formula to `(value_now * weight_now) - (value_prev * weight_prev)`, plus rephrasing sentences to state the real delta and the dominant factor's own movement as two separate, both-true facts rather than a causal claim.
- **Confidence scores** - a `0-1` numeric scale (not low/medium/high), self-reported by Gemini via the same prompted-JSON pattern already proven for sentiment, added to the *existing* enrichment/ESG/logistics/sentiment prompts rather than a separate scoring pass or token-level logprobs (model/tier-limited, and measures token likelihood rather than semantic confidence). Live-verified to genuinely discriminate: Tesla/Siemens scored 0.85-1.0 on enrichment/ESG but 0-0.4 on logistics where public data is scarce, and a fabricated company name scored 0 across the board.
- **Risk/health history** - a dedicated `GET /suppliers/:id/risk-health-history` (independent pagination per series, optional `days` filter) rather than overloading the mixed-event timeline endpoint, since a trend chart needs clean numeric series, not merged event types. Chart renders risk and health as two independent `<Line>` series (their timestamps don't align) sharing one `XAxis` with `allowDuplicatedCategory={false}`.
- **Alert thresholds** - compute-on-read against the supplier's current persisted score (`twinService.js`'s `alerts` field, `GET /dashboard/stats`'s `activeAlerts`), the same precedent as the Digital Twin itself - always accurate regardless of when the score last changed, no staleness window a cron would need to close. A snapshot is still taken on a fresh crossing (`isNewBreach()`, reusing the existing significant-change snapshot mechanism in `twinSyncService.js`), with a real precedence bug found and fixed live: when a change was simultaneously a large swing *and* a fresh crossing, the original `if/else` order always labeled the snapshot `'significant_change'`, silently losing the more decision-relevant `'threshold_breach'` reason.
- **Org-scoping** - every new endpoint (`/org/risk-config`, `/suppliers/:id/risk-health-history`) explicitly cross-org tested (404, not leaked), continuing the standing discipline from every prior phase.

Full pass/fail verification of all of the above is in [Phase 5 Complete — End-to-End Smoke Test](#-phase-5-complete--end-to-end-smoke-test-2026-08-06); open items (weight-table default tuning, RAG-chat-confidence deferral, known limitations) are tracked in `TODO.md`.

---

# Remaining Work — Phase 6 (Predictive Analytics) — ✅ COMPLETE (2026-08-08)

| Status | Item | Notes |
|---------|------|-------|
| 🟢 | Risk Forecasting | Hand-rolled linear regression (`forecastService.js`, no new dependency) over real `{timestamp, score}` history, per-supplier (`GET /suppliers/:id/forecast`) and portfolio-wide (`GET /org/forecast`, pools every supplier's raw `SupplierSnapshot` rows for the fit). Gated on ≥5 real points spanning ≥24 real hours - an explicit `insufficient_data` status otherwise, never a hidden zero. |
| 🟢 | Predictive Dashboard | New `ForecastChart`/`ForecastPanel` components: solid historical line → dashed projected line + shaded confidence band that visibly widens with less data/longer horizon. Reused identically on the dashboard (portfolio) and supplier detail (per-supplier) pages; the insufficient-data state renders as real, labeled text ("Not enough history yet... N collected, M needed"), never a blank/spinner. |
| 🟢 | Early Warning System | `evaluateProjectedBreach` (`alertService.js`) compares each forecast's projected value against the org's existing `RiskConfig.alertThresholds` - reused, not duplicated. Excludes a metric already breaching today (Phase 5's job). Surfaced as a new amber tier in the existing `AlertBanner`/`ActiveAlertsPanel`. |
| 🟢 | Anomaly Detection | `anomalyService.js`: a compounding-delta detector (rolling 14-day sum, catches several small changes Phase 5's own ±15 cap alone wouldn't) and a sentiment pattern-shift detector hard-capped at 7 days to match `NewsCache`'s actual TTL. Both exclude a window already flagged elsewhere. Surfaced as a third, violet tier on the same alert components. |
| 🟢 | Trend Analysis | A regression-line overlay added to the *existing* `RiskHealthTrendChart.jsx` (Phase 5), reconstructing the exact fitted line the forecast panel itself computed (shared `intercept`/`anchorTimestamp`) rather than a second, potentially-divergent fit. Portfolio historical trend reuses Step 1's `GET /org/forecast` `historical` field - no duplicate aggregation endpoint. |

See [Phase 6 Complete — End-to-End Smoke Test](#-phase-6-complete--end-to-end-smoke-test-2026-08-08) below for the full verification results.

## Phase 6 — Technical Summary

**Starting point: the Phase 6 audit's own finding that real per-supplier history is extremely thin** - at most a handful of `RiskHistory` rows per supplier, several clustered within milliseconds of each other from earlier test scripts, not organically calendar-spread. This shaped every design decision in the phase: honesty about data sufficiency, not forecast sophistication, was treated as the actual deliverable.

- **Forecasting** - a hand-rolled OLS linear regression over `{t: days-since-first-point, y: score}`, deliberately not a real time-series library; with this little real data, anything with more free parameters than points would be actively misleading. Two independent sufficiency gates (`MIN_POINTS = 5` **and** `MIN_SPAN_HOURS = 24`) reuse the audit's own burst-detection logic, so a cluster of same-instant rows can never pass by count alone. The confidence interval widens for sparser samples and longer projection horizons, and `confidenceLevel` is deliberately capped at `'medium'`, never `'high'`, regardless of how much data accumulates within what this phase can validate.
- **Portfolio pooling design pivot** - the first design day-bucketed every supplier's snapshots into daily averages for the regression fit; live testing showed this collapsed even a data-rich org (25 real rows) down to 2-3 points, wrongly failing sufficiency. Switched to pooling **raw, un-bucketed** points across every supplier in the org for the actual fit (an org with 20 suppliers snapshotted twice yields 40 real points, not 2), while keeping a separate day-bucketed series purely for chart display, since a scatter of raw cross-supplier points is unreadable as a trend line.
- **Predictive dashboard** - a real bug was found and fixed via a live screenshot, not just a passing text check: recharts builds a shared category `XAxis` in JSX declaration order (not by sorting label values), so declaring the future-projecting `<Area>`/dashed `<Line>` before the historical line scrambled the axis into non-chronological order. Fixed by always declaring the historical series first.
- **Early warning & anomaly detection** - both new alert types deliberately exclude anything already caught by a more specific mechanism: a projected breach never fires for a metric already breaching today, and a compounding-drift window never fires if it already contains one single change large enough to have tripped Phase 5's own significant-change cap. Both surface through the *same* `AlertBanner`/`ActiveAlertsPanel` components (new props, new color-coded sections) rather than a third notification surface - three tiers now share one place: red (confirmed), amber (projected), violet (anomaly).
- **Trend overlay** - `forecastFromPoints` now exposes `trend.intercept` and `trend.anchorTimestamp` specifically so `RiskHealthTrendChart.jsx`'s overlay can reconstruct the *exact* line the forecast panel computed via `intercept + slope * daysSince(anchorTimestamp)`, even when displaying a different subset of points - guaranteeing the two views can never silently disagree.
- **Org-scoping** - `GET /suppliers/:id/forecast` and `GET /org/forecast` both explicitly cross-org tested (404, not leaked), continuing the standing discipline from every prior phase.

Full pass/fail verification is in [Phase 6 Complete — End-to-End Smoke Test](#-phase-6-complete--end-to-end-smoke-test-2026-08-08); open items (data-sufficiency thresholds as future config, the sentiment 7-day TTL ceiling, unbenchmarked dashboard-wide scan cost) are tracked in `TODO.md`.

---

# Remaining Work — Phase 7 (Scenario Simulator) — ✅ COMPLETE (2026-08-08)

| Status | Item | Notes |
|---------|------|-------|
| 🟢 | Supplier Failure Simulation | `POST /suppliers/:id/simulate-failure` (`simulationService.js`) - computed entirely from real existing data: risk/health scores and factors, contract status, category/country concentration risk, document/news presence, no new fields required, exactly as the pre-build audit predicted. |
| 🟢 | AI Decision Support | `POST /suppliers/:id/mitigation-strategies` (`mitigationService.js`) - same prompted-JSON + self-reported-confidence pattern as `enrichmentService.js`/`sentimentService.js`, fed Step 1's real simulation context server-side. |
| 🟢 | Alternative Supplier Recommendations | `GET /suppliers/:id/alternatives` (`similarityService.js`) - hard category filter, soft-gated scoring per dimension (only scores country/risk-health/enrichment/ESG/logistics when both suppliers being compared actually have that data), honest `comparisonBasis` breakdown, `status: 'ok' \| 'no_alternatives_found'`. |
| 🟢 | Business Impact Analysis | New `Supplier.businessImpact` fields + `PATCH /suppliers/:id/business-fields` + `GET /suppliers/:id/business-impact` (`businessImpactService.js`). Product decision from the pre-build audit (`TODO.md` section 2): real user-entered fields drive real math (`mode: 'real'`) when present, otherwise a clearly-labeled Gemini estimate (`mode: 'ai_estimate'`) - never blended into one figure. |
| 🟢 | Recovery Planning | `GET /suppliers/:id/recovery-estimate` (`recoveryPlanningService.js`) - permanently AI-estimated range, never a precise figure (no real grounding exists anywhere in the app for this one, unlike the other four), labeled `"AI-estimated range - not a calculation"` unconditionally. |

See [Phase 7 Complete — End-to-End Smoke Test](#-phase-7-complete--end-to-end-smoke-test-2026-08-08) below for the full verification results.

## Phase 7 — Technical Summary

**Starting point: a completed read-only audit** against the Scenario Simulator spec, which found this phase split cleanly into two kinds of honesty problem, not one: Supplier Failure Simulation and AI Decision Support were fully groundable in real data with no new fields; Alternative Supplier Recommendations was grounded in schema but not in current live data (every supplier had 0% enrichment/ESG/logistics population and 0 documents at audit time); Business Impact Analysis and Recovery Planning had no real grounding anywhere and were blocked on a product decision. The same audit also surfaced an unrelated finding - 60 orphaned `Organisation` documents left over from Phase 1-4 testing, invisible to the Phase 6 test-data audit because that one only checked the `users` collection - fixed with a new, reusable `server/services/orgCascadeService.js` (`deleteOrgCascade`), since the app previously had no cascade-delete path at the org level at all (no route had ever deleted a `User` or `Organisation`). See `TODO.md` section 5 and commit `b2f7c7d`.

- **Failure simulation** - `simulateSupplierFailure()` computes concentration risk via real peer-count queries (how many other suppliers in this org share this one's category/country), data completeness from real document/enrichment/ESG/logistics presence, contract status, and a news-sentiment rollup, then a plain-language summary with no speculative numbers. Verified against 3 real suppliers with deliberately different profiles (bare, Gemini-enriched-with-document, sole-category-source) created through the actual running app rather than raw DB writes - outputs correctly differed, e.g. the sole-source supplier correctly said "the organisation's only supplier" where the others correctly said "1 of N."
- **AI mitigation strategies** - `generateMitigationStrategies()` reuses the exact prompted-JSON pattern already proven for enrichment/ESG/sentiment, fed Step 1's real context server-side (never trusting a client-supplied simulation object, matching the precedent already established throughout the app). Real Gemini calls produced situation-specific strategies referencing the actual context passed in (e.g. correctly citing "20 days remaining on the contract" for the one test supplier where that was true). The throw-on-unexpected-shape guard was verified against 5 synthetic malformed responses (mocked via `require.cache` substitution, since a real malformed Gemini response can't be forced on demand) plus one well-formed response.
- **Alternative suppliers** - `findAlternativeSuppliers()` hard-filters candidates to the same category, then only scores a dimension (country, risk/health proximity, enrichment/ESG/logistics proximity) when both suppliers being compared actually have real data for it - risk/health proximity specifically requires an actual `RiskHistory`/`HealthHistory` row, not just an untouched schema default. The response's `comparisonBasis` honestly states how many candidates each dimension was actually available for, rather than silently scoring on default/zero values. Verified live both states: an unenriched pair scored on category+country alone; after enriching one side, `comparisonBasis` correctly reflected the new dimension's availability. A sole-category-source supplier correctly returned `status: 'no_alternatives_found'` instead of a low-quality guess.
- **Business impact** - new optional `Supplier.businessImpact` fields (`contractValue`, `estimatedAnnualSpend`, `criticalityRating` 1-5, `dependencyNotes`), admin-gated via `PATCH .../business-fields` (`requireRole('admin')`, matching every other mutating supplier endpoint). `computeBusinessImpact()` takes a real-math path with no Gemini call at all when `contractValue.amount` or `estimatedAnnualSpend` is populated, otherwise a Gemini estimate - `userProvided` always echoes back whatever real fields actually exist regardless of which mode ran, so the client never has to guess what's real vs. estimated. **Found and fixed a real bug via live testing, not code review**: `toLocaleString()` with no locale argument uses the server process's own OS locale, not the caller's - live-measured as Indian digit grouping (`5,00,000` instead of `500,000`) for a real $500,000 contract value on this deployment. Fixed with an explicit `'en-US'` locale argument, re-verified live post-fix. (`server/services/businessImpactService.js`, commit `659ade8`)
- **Recovery planning** - `estimateRecoveryTime()` is permanently an AI-estimated range labeled `"AI-estimated range - not a calculation"` (unconditional, unlike Business Impact's conditional `mode` field), since no real grounding for time-to-recover exists anywhere in the app. Takes Step 1's simulation output as context, same re-derive-server-side precedent as mitigation strategies. Verified live to be genuinely context-sensitive, not a fixed output: a data-rich supplier and a data-thin supplier in the same test session produced different confidence levels (0.8 vs. 0.4).
- **Real-vs-AI-estimated labeling discipline, applied uniformly** - every Phase 7 output that involves any AI-generated content explicitly states its source/mode, and real and AI-estimated figures are never blended into one number without saying which is which. This mirrors the data-sufficiency honesty Phase 6 established for forecasting, applied here to a phase with an even sparser real-data foundation.
- **Test-data cleanup** - given the recent (Phase 5/6) history of cleanup claims turning out to be false, this phase's own test data (`phase7_test_*` org) was cleaned up using the same `deleteOrgCascade` service fixed earlier this phase (dogfooding it), verified with a live query both before and after, plus an explicit orphan-check across `riskhistories`/`healthhistories`/`suppliersnapshots`/`newscaches` for the deleted org's id specifically - all confirmed 0.
- **Org-scoping** - all 6 new endpoints (`simulate-failure`, `mitigation-strategies`, `alternatives`, `business-fields` PATCH, `business-impact` GET, `recovery-estimate`) go through the existing org-scoped `findOrgSupplier` lookup, continuing the standing discipline from every prior phase.

Full pass/fail verification is in [Phase 7 Complete — End-to-End Smoke Test](#-phase-7-complete--end-to-end-smoke-test-2026-08-08); open items (business-impact real-mode requiring manual field population, unvalidated similarity-scoring weights, confidence-calibration inheritance from earlier phases) are tracked in `TODO.md` sections 2 and 4.

---

# Remaining Work — Phase 8 (Multi-Agent Intelligence) — ✅ COMPLETE (2026-08-08)

| Status | Item | Notes |
|---------|------|-------|
| 🟢 | Risk Analyst Agent | `POST /suppliers/:id/agents/risk-analyst` (`riskAnalystAgentService.js`) - genuine synthesis of already-real, previously-scattered risk data (current factors, history + narrative, forecast, anomalies, alerts) into one written assessment. The strongest-grounded agent per the pre-build audit. |
| 🟢 | Legal Agent | `POST /suppliers/:id/agents/legal` (`legalAgentService.js`) - genuine structured extraction (5 topics) over real uploaded document text, reusing `ragService.js`'s real retrieval logic. Honest `no_documents`/`no_relevant_content` states, never a guess. |
| 🟢 | Finance Agent | `POST /suppliers/:id/agents/finance` (`financeAgentService.js`) - reuses Phase 7's real-math-or-AI-estimate business impact as-is, plus a permanent, code-enforced (never Gemini-generated) abstention on payment history and invoices - the one claim in this app with no real or inferable data source at all. |
| 🟢 | ESG Agent | `POST /suppliers/:id/agents/esg` (`esgAgentService.js`) - explicitly labeled "NOT independent analysis": a focused-lens restatement of Phase 4's existing ESG enrichment data, naming the weakest dimension. Shipped honestly-scoped per the audit rather than skipped. |
| 🟢 | Logistics Agent | `POST /suppliers/:id/agents/logistics` (`logisticsAgentService.js`) - same design and same honesty labeling as the ESG agent, flagging on-time-delivery below an 80% reliability threshold. |
| 🟢 | Manager Agent | `POST /suppliers/:id/agents/manager-summary` (`managerAgentService.js`) - a written executive summary synthesizing all five agents above, the first thing in this app that turns the Digital Twin's kind of structured data into prose. Its `inputs` block labels each source's real depth in code, not left to Gemini's wording. |
| 🟢 | Agent Collaboration | Implemented as context-passing (each agent's real output feeds the Manager Agent's prompt) - the same pattern already proven in Phase 7's `mitigationService.js`/`recoveryPlanningService.js`. No new framework, no new package, per the audit's explicit recommendation. |

See [Phase 8 Complete — End-to-End Smoke Test](#-phase-8-complete--end-to-end-smoke-test-2026-08-08) below for the full verification results.

## Phase 8 — Technical Summary

**Starting point: a completed read-only audit** that found no multi-step tool-calling framework or pattern anywhere in this codebase - every AI feature since Phase 3 is a single prompted-JSON Gemini call, confirmed by grepping every service for `tools`/`functionDeclarations`/`responseSchema` (zero hits). The audit's central finding: "agent" in this phase could only mean "persona-focused synthesis or extraction call," and the real risk was five thin persona-labeled wrappers around data already surfaced elsewhere, with a Manager Agent duplicating what the Digital Twin/Dashboard already do. The audit graded each proposed agent honestly before any code was written: Risk Analyst and Legal as genuinely groundable in real, currently-scattered data; ESG and Logistics as, *as literally specified*, cosmetic relabeling of `enrichmentService.js`'s existing calls; Finance as a different category of gap than Phase 7's business impact (no source exists for private payment history, not just a sparse one); Manager Agent's value as conditional on what the other four actually produced.

- **Risk Analyst** - `riskAnalystAgentService.js` gathers real data from six previously-separate services (`riskScoreService`/`healthScoreService` factors, `RiskHistory`/`HealthHistory` + `narrativeService`'s deterministic prose, `predictiveAnalyticsService`'s forecast, `anomalyService`'s findings, `alertService`'s active/projected breaches) into one prompt, explicitly instructed to synthesize only what's provided and to state plainly when a dimension (e.g. forecast) wasn't available rather than omit it. A `dataAvailability` block is computed in code, independent of Gemini's prose, so which dimensions were real for a given run is always independently verifiable. Verified live against two differently-profiled real suppliers - correctly differentiated assessments, correctly reported forecast/history as unavailable for brand-new suppliers.
- **Legal** - `legalAgentService.js` reuses a newly-extracted `retrieveRelevantChunks()` helper (pulled out of `ragService.js`, which previously inlined this logic only for its own free-form Q&A) to run 5 targeted retrievals (termination, renewal, compliance, liability, payment) and a single structured-extraction prompt over the real results - genuine new capability per the audit, since it's a different query pattern over real document text, not a new data source. Zero documents and zero-relevant-content are both handled as honest states, matching Phase 7's `dataCompleteness` convention. Verified live against a real hand-built test contract (a minimal valid PDF, hand-crafted since no PDF-generation library exists in this repo): all 5 topics correctly extracted with accurate, source-quoted findings.
- **Finance** - `financeAgentService.js` reuses Phase 7's `computeBusinessImpact()` directly (no reimplementation) and adds exactly one new thing: `paymentHistory`/`invoices` are a hardcoded constant, never a Gemini call, in either mode. This was verified empirically before being built, not assumed: asked plainly whether it knew a specific org's payment history with a specific supplier, Gemini correctly declined; asked with the response shape structured to disallow nulls ("you must provide a number even if synthetic/illustrative"), the same model readily fabricated a specific, confident-sounding, entirely made-up on-time-payment figure with a plausible fictional rationale. That confirmed a prompt-level "don't guess" instruction alone isn't reliable here, and that the fix has to be structural.
- **ESG and Logistics** - `esgAgentService.js`/`logisticsAgentService.js` reuse `enrichEsgData()`/`enrichLogisticsData()` as-is rather than a duplicate near-identical prompt, and add one deterministic (no extra Gemini call) framing each: naming the weakest ESG dimension, or flagging on-time-delivery below an 80% reliability threshold. Both are labeled "Based on Phase 4 enrichment data - not independent analysis" in the API response, Swagger docs, and UI badge alike - shipped per this project's established pattern of completing every roadmap item but framing the weaker ones honestly rather than skipping them or overselling them.
- **The Manager Agent's honesty discipline held under the hardest test** - a synthesis feature is exactly where weaker inputs get smoothed into something that sounds more authoritative than it is, and the explicit per-source depth labeling (baked into the `inputs` block in code, not left to Gemini's phrasing) is the right way to prevent that structurally rather than hoping the model stays honest on its own. Verified live against both a rich profile (real document, real business fields, real ESG/logistics) and a sparse one - both executive summaries correctly reflected the real depth difference between inputs rather than flattening it.
- **Agent Collaboration** is context-passing, not new infrastructure: the Manager Agent calls the other four fresh (never cached, same staleness-avoidance precedent as Phase 7's `mitigationService.js`/`recoveryPlanningService.js` re-deriving their context server-side) and passes each one's real output into its own final prompt.
- **Both bugs found this phase were caught the right way.** The ESG/Logistics persistence gap - the fallback fetch called Gemini but never saved the result, so every subsequent call silently re-fetched instead of reusing real data - is a real, meaningful catch: left unfixed, it would have both wasted Gemini quota and risked inconsistent answers across calls to the same supplier. Fixed to persist exactly like the existing `/esg-refresh`/`/logistics-refresh` endpoints already do. The concurrent-save issue in the Manager Agent (an intermittent 500 when ESG and Logistics both cold-start inside the same `Promise.all`) was handled with appropriate humility instead: an isolated repro attempt at the concurrent-save path itself didn't reproduce deterministically, so rather than claim a definitive root cause for an intermittent, non-reproducible issue, the two calls were simply sequenced relative to each other - removing the theoretical risk at zero real cost, without overstating what was actually confirmed.
- **Org-scoping** - all 6 new endpoints go through the existing org-scoped `findOrgSupplier` lookup, continuing the standing discipline from every prior phase.
- **Cleanup discipline held**: 16 test orgs were created across this phase's live testing (one per step's isolated test plus cross-org checks), all 16 verified gone via `deleteOrgCascade` with an explicit orphan-check across every related collection (RiskHistory, HealthHistory, SupplierSnapshot, NewsCache, Documents, DocChunks, Conversations, RiskConfig) - all confirmed 0, DB back to exactly the one real fixture org. No repeat of the Phase 5/6 cleanup-claim failures earlier in this project's history.

Full pass/fail verification is in [Phase 8 Complete — End-to-End Smoke Test](#-phase-8-complete--end-to-end-smoke-test-2026-08-08); open items (the permanence of Finance's payment-history abstention, ESG/Logistics's honest scope ceiling, Manager Agent's dependency on its inputs' honesty, Gemini-quota cost of a single Manager Agent call) are tracked in `TODO.md` sections 2 and 4.

---

# Remaining Work — Phase 9 (Supply Chain Visualization)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | Supply Network Graph | Build interactive supplier dependency graphs using React Flow or Cytoscape.js. |
| 🔴 | Geographic Map | Display supplier locations and regional risk on an interactive world map. |
| 🔴 | Relationship Explorer | Visualize supplier connections, dependencies, and critical paths. |
| 🔴 | Timeline Visualization | Show historical supplier events and risk evolution. |
| 🔴 | Risk Heatmaps | Highlight geographic regions with elevated supplier risk. |

---

# Remaining Work — Phase 10 (Enterprise Readiness)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | Docker Support | Containerize frontend and backend services. |
| 🔴 | CI/CD Pipelines | Automate builds, testing, and deployment using GitHub Actions. |
| 🔴 | Automated Testing | Implement unit, integration, and end-to-end testing. |
| 🔴 | Monitoring & Logging | Add centralized logging, health checks, and performance monitoring. |
| 🔴 | Role-Based Access Control | Implement fine-grained authorization for enterprise users. |
| 🔴 | Audit Logs | Record user actions and system events for traceability. |
| 🔴 | Security Hardening | Apply OWASP best practices, input validation, rate limiting, and secure headers. |
| 🔴 | Performance Optimization | Optimize database queries, caching, lazy loading, and API performance. |
| 🔴 | Deployment | Deploy production-ready application using Docker, cloud infrastructure, and environment management. |
| 🔴 | Technical Documentation | Complete developer guides, architecture documentation, deployment instructions, and API references. |
🟢
---

# Phase 1 Audit — SupplyLens (Branch: `main`, Post-Merge)

## Status Table

| # | Task | Status | Notes | Files |
|---|------|--------|-------|-------|
| **1** | **Authentication** | 🟡 Partial | JWT signing works, bcrypt hashing works. **Issues:** No separate `/register` endpoint — `POST /auth/login` silently creates a new user for any unrecognized email/password (`auth.js:33–53`). No refresh tokens (single 7-day access token, no rotation/revocation). `role` field exists on the `User` schema but is **never checked** anywhere (no RBAC middleware or role guards). Token is sent via custom `x-auth-token` header instead of `Authorization: Bearer`. Auth middleware does not distinguish expired vs. malformed vs. missing tokens. | `server/routes/auth.js`<br>`server/middleware/auth.js`<br>`server/models/User.js` |
| **2** | **Supplier CRUD** | 🟡 Partial | **Create** ✅, **Read (list + by-id)** ✅. **Update** ❌ (no `PUT/PATCH` route). **Delete** ❌ (no `DELETE` route). **Search/Filter** ❌ (no query parameters handled). **Pagination** ❌ (`Supplier.find({ orgId })` returns the entire collection). **Validation** ❌ (only Mongoose `required`; no `express-validator`; `POST /` doesn't validate `name` or `country` before insertion). | `server/routes/suppliers.js` *(only 69 lines, 2 routes)* |
| **3** | **Dashboard** | 🟡 Partial | Supplier list grid renders (`Dashboard.jsx`), risk badge exists (`RiskBadge.jsx`). **Missing:** KPIs, aggregate statistics, charts, recent activity feed. No chart library installed (`recharts`, `chart.js`, `victory`, etc.). Layout is not responsive—single fixed-width centered card using inline style objects with no breakpoints. | `client/src/pages/Dashboard.jsx` |
| **4** | **Database Design** | 🟡 Partial | Schemas exist for `User`, `Supplier`, `Document`, `DocChunk`, and `NewsCache`. **Issues:** `Supplier.orgId` references `Organisation`, but no `Organisation` model exists (dangling reference). No index on `Supplier.orgId` despite every query filtering by it. No compound index (e.g., `{ orgId: 1, name: 1 }`) to prevent duplicate supplier names per organization. Validation is minimal (only `required`/`enum`; no length limits, email regex, or score bounds). `User.role` enum (`admin`/`viewer`) is never used downstream. | `server/models/*.js` |
| **5** | **REST API** | 🟡 Partial | Routes are reasonably RESTful (`/api/auth`, `/api/suppliers`, `/api/documents`, `/api/news`, `/api/rag`) and mounted in `index.js`. CRUD remains incomplete (see #2). Responses have inconsistent formats (`res.status(500).send('Server Error')` vs. `res.json({ msg: ... })` vs. `res.json(data)`), with no standardized response envelope. | `server/routes/*.js` |
| **6** | **Error Handling** | 🔴 Missing | No centralized error-handling middleware (`app.use((err, req, res, next) => ...)`). No 404 handler. Each route manually implements `try/catch` with inconsistent response formats (`.send('Server Error')`, `.json({ msg })`). Some routes swallow errors and return fake success (e.g., `rag.js:21–24`, `documents.js:22–28`). No standardized `{ success, data, error }` response structure. | *None — architecturally absent* |
| **7** | **UI Components** | 🟠 Partial / Broken | Components exist (`SupplierCard`, `NewsPanel`, `RiskBadge`, `RagChatDrawer`, `SupplierDetail`, `Login`, `Dashboard`) but styling is inconsistent and partially non-functional. Most components use inline style objects, while `RiskBadge.jsx` and `RagChatDrawer.jsx` use Tailwind classes (`bg-green-100`, `flex`, `flex-col`, etc.) **without Tailwind installed or configured** (no `tailwind.config.js`, no PostCSS config, no CSS import in `main.jsx`, no dependency in `package.json`). `client/src/hooks/useSupplier.js` and `client/src/pages/DocumentVault.jsx` are unused dead code. Upload/vault logic is duplicated in `SupplierDetail.jsx`. Missing dependencies: `lucide-react` and `axios` are imported but not installed, causing runtime `module not found` errors. | `client/src/components/`<br>`client/src/pages/` |
| **8** | **API Documentation** | 🔴 Missing | No `swagger-jsdoc`, `swagger-ui-express`, OpenAPI YAML/JSON, or JSDoc `@swagger` comments. Documentation tooling is neither installed nor referenced anywhere in the backend. | *None* |


***Dependency Check***
server/package.json — has: jsonwebtoken, bcryptjs, mongoose, express, cors, multer, dotenv, node-cron, pdf-parse, @google/generative-ai, axios. Missing for Phase 1: express-validator (or joi/zod), swagger-jsdoc + swagger-ui-express, no refresh-token/rotation library needed (can be done with plain jsonwebtoken, but nothing scaffolded).

client/package.json — has only: react, react-dom, @vitejs/plugin-react, vite. Missing but imported in code (broken): axios, lucide-react. Missing for spec: tailwindcss (+ @tailwindcss/vite or postcss/autoprefixer), a chart library (recharts is the natural fit given the spec explicitly name-drops it).

***Prioritized Build Plan (dependency order)***
1. Fix broken installs first — add axios and lucide-react to client/package.json (or remove the lucide-react import if icons aren't essential yet). Nothing frontend can be verified to run until this is fixed.
2. Finalize DB schemas — add missing Organisation model (or drop the dangling ref), add orgId index on Supplier, add compound index for org+name uniqueness, tighten schema validation (string lengths, riskScore bounds, email format). This underpins everything else (CRUD, dashboard aggregates).
3. Auth hardening — split login from an explicit register endpoint, add refresh-token issuance + rotation endpoint, add an RBAC middleware (requireRole('admin')) and apply it to mutating routes, standardize on Authorization: Bearer header (or explicitly document why x-auth-token is kept).
4. Centralized error handling — add a 404 handler + Express error-handling middleware in index.js, define one standard response envelope, replace all ad-hoc res.status(500).send(...) calls across routes to funnel through it.
5. Supplier CRUD completion — add PUT/PATCH (edit), DELETE, and query-param-driven search/filter/pagination to suppliers.js, wire up express-validator (or equivalent) for input validation on create/update.
6. REST API consistency pass — once CRUD + error handling exist, normalize all existing endpoints (auth, documents, news, rag) to the same response envelope and status-code conventions.
7. UI component/styling decision — pick one styling approach: either actually install and configure Tailwind (to match the components already written against it) or convert RiskBadge/RagChatDrawer to the inline-style convention used elsewhere. Delete or implement the dead useSupplier.js / DocumentVault.jsx files.
8. Dashboard KPIs/charts — install recharts, build KPI/stat-tile components and a recent-activity feed on top of the now-complete supplier CRUD + finalized schemas (needs #2 and #5 done first to have real aggregate data to chart).
9.API documentation — add swagger-jsdoc + swagger-ui-express and annotate the now-stabilized endpoints last, once routes/response shapes aren't still changing.

No code changes made. Let me know which item you want to tackle first and I'll wait for your go-ahead before touching anything.

That background command already finished and was folded into the audit above — no new action needed here. Audit stands as delivered; waiting on your go-ahead for which Phase 1 item to start with.
---

## Legend

| Status | Meaning |
|--------|---------|
| 🟢 Complete | Fully implemented |
| 🟡 Partial | Core functionality exists but is incomplete |
| 🟠 Partial / Broken | Exists but has significant implementation or dependency issues |
| 🔴 Missing | Not implemented |
---

# ✅ Phase 1 Complete — End-to-End Smoke Test (2026-08-01)

Every item from the Phase 1 Audit above has since been implemented, hardened, and verified. This is the final full end-to-end smoke test run on `main` against **real Atlas data** (not demo mode) before moving on to Phase 2.

## Smoke Test Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Register → login → token pair | 🟢 PASS | Both register and a separate explicit login issued a real `accessToken` + `refreshToken` pair |
| 2 | Create 3 suppliers (varied category/risk/country) | 🟢 PASS | Berlin Components GmbH (raw_material, DE, risk 15), Shibuya Cloud KK (saas, JP, risk 72), Thames Freight Ltd (other, GB, risk 45) — all `201` |
| 3 | Search / filter / paginate | 🟢 PASS | Name search, category filter, and country filter each returned the correct single match; pagination meta verified correct, including a forced 2-page split via `?limit=2` |
| 4 | Edit one supplier, confirm persistence | 🟢 PASS | Edited risk score, confirmed via a **hard refetch** (page reload + re-navigate), not just optimistic client state |
| 5 | Delete one as admin, confirm 404 on refetch | 🟢 PASS | Deleted supplier via UI; follow-up `GET` on that id returned `404 SUPPLIER_NOT_FOUND` |
| 6 | Viewer-role restrictions (create/update/delete) | 🟢 PASS | `POST`/`PUT`/`DELETE` all `403 FORBIDDEN` for `viewer`; `GET`/list still `200`; UI shows no Edit/Delete controls for non-admins |
| 7 | Dashboard matches real data | 🟢 PASS | KPIs, category breakdown, growth series, and recent activity all cross-checked against the actual dataset created during the test |
| 8 | `/api-docs` fully functional | 🟢 PASS | All 15 operations across 11 paths render correctly, zero console errors |
| 9 | Zero console errors throughout (Playwright) | 🟢 PASS | Every normal user-facing flow produced zero errors; the only console lines logged were the browser's default logging of intentionally-triggered 403/404 responses from the test's own negative-path assertions (viewer-restriction and post-delete checks), not application bugs |

All test data (accounts, orgs, suppliers) created during the smoke test was cleaned from Atlas afterward.

## Key Decisions & Rationale

Non-obvious calls made during Phase 1 hardening, kept here so the reasoning isn't lost once this stops being a live conversation:

- **Supplier update (`PUT`/`PATCH /suppliers/:id`) is admin-only, matching create/delete.** It originally had no role check at all — any authenticated org member, including `viewer`, could edit a supplier. Gated it with `requireRole('admin')` since there was no evidence anywhere (schema, docs, frontend) that "viewer can edit" was intentional, and the role name itself implies read-only. The frontend's Edit button is now hidden for non-admins the same way Delete already was. (`server/routes/suppliers.js`, `client/src/pages/SupplierDetail.jsx`)

- **`contractExpiry` validation deliberately allows past dates.** It had no validator at all; when adding one, past dates were kept valid rather than rejected. An already-lapsed contract is real, important data for a supplier-risk app to hold — it's a risk signal ("needs renewal"), not bad input. The validator only checks that the value is a well-formed ISO 8601 date, not where it falls relative to today. (`server/routes/suppliers.js`)

- **`riskScore` was validated but silently dropped on create.** `POST /suppliers` ran `riskScore` through `express-validator`, but the handler's destructure of `req.body` never actually included it, so every created supplier silently fell back to the schema default (`0`) no matter what was sent. Fixed in both the real-DB and demo-mode create paths. Worth remembering as a bug *category*, not just a one-off: a field can be fully validated and still never reach persistence — the same audit (checking every validated field against what's actually saved) is worth re-running whenever a create/update handler changes. (`server/routes/suppliers.js`, `server/services/demoStore.js`)

---

# ✅ Phase 2 Complete — End-to-End Smoke Test (2026-08-02)

Every item from the Phase 2 plan above (PDF pipeline, parsing, chunking, embeddings, vector search, RAG, conversation memory) has since been implemented, hardened, and verified — including a dedicated security audit that found and fixed real cross-org data leaks. This is the final full end-to-end smoke test run on `main` against **real Atlas data** (not demo mode) before moving on to Phase 3.

## Smoke Test Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Register → create supplier → upload real PDF → full pipeline | 🟢 PASS | GridFS storage, `pdf-parse` extraction, chunking, real 768-dim embeddings, and Atlas index (`default`, `READY`/`queryable`) all confirmed end-to-end |
| 2 | Real question via the actual UI, grounded answer + source | 🟡 PASS with caveat | Correct once the just-uploaded chunk was indexed; the very first question asked immediately after upload could get a false "couldn't find" response due to Atlas Search's indexing lag — see the retry fix and its own caveat below |
| 3 | Follow-up question, context carries over | 🟢 PASS | "Why is it that high?" correctly resolved against the prior answer via conversation history |
| 4 | Irrelevant question, honest "not found" | 🟢 PASS | No hallucination — the model explicitly says it doesn't know rather than fabricating an answer |
| 5 | Cross-org access blocked on every document/rag/news route | 🟢 PASS | Re-tested all 4 previously-fixed gaps (`rag.js`, `news.js`, `documents` list, `documents` upload) plus the conversations endpoint — all correctly 404 for an outsider org, no regression |
| 6 | Conversation list/resume/new-conversation via the real UI | 🟢 PASS | "New" clears the chat and starts a genuinely separate `Conversation` document; the dropdown lists past conversations and resuming one replays full history |
| 7 | Delete document → GridFS + chunks + Document record gone | 🟢 PASS | Confirmed at the DB level (all three absent) and via UI reload |
| 8 | Zero console errors throughout (Playwright) | 🟢 PASS | Empty across every register/upload/chat/delete run |

All test data (orgs, suppliers, documents, chunks, GridFS files, conversations) created during testing was cleaned from Atlas afterward.

## Key Decisions & Rationale

Non-obvious calls made during Phase 2 hardening:

- **Conversations are private per-user, not shared across an org.** Scoped by `supplierId + orgId + userId`. There's no evidence anywhere (schema, docs, frontend) that org-wide shared chat history was intended, and it's the safer default absent a stated requirement otherwise. Verified live: a second user in the *same* org gets an empty conversation list and a `404` when trying to continue the first user's conversation by id, while still being able to start their own new one on the same supplier. (`server/models/Conversation.js`, `server/routes/rag.js`, `server/routes/suppliers.js`)
- **Conversation history window is capped at 8 messages (4 exchanges).** A follow-up like "why is it that high?" almost always refers to the immediately preceding answer, not something many turns back — capping bounds prompt size and Gemini token cost regardless of how long a conversation runs, while still covering a short multi-step clarification thread. (`server/services/ragService.js`)
- **`gemini-flash-latest` over the pinned `gemini-2.5-flash`.** The explicit version looked more stable on paper but failed live ("no longer available to new users") despite being listed in `ListModels`; the `-latest` alias proved reliable for this API key. Chosen empirically, not by preference. (`server/services/embedService.js`)
- **Only a true zero-result vector search is retried, never a low-relevance one.** `$vectorSearch` returns the filter's top-k regardless of score, so a present-but-irrelevant result is a real answer (or a real "I don't know" from the model) and returns immediately. Only a genuinely empty result set — the signature of Atlas Search's indexing lag right after a fresh upload — triggers the 1s/2s/3s retry. Caveat, live-measured: the actual indexing lag in this environment sometimes exceeds the ~6s cumulative window these delays cover (one clean poll measured ~9.5s), so the fix substantially reduces but doesn't eliminate the false-negative window. Carried into the backlog below. (`server/services/ragService.js`)
- **Four independent cross-org data-leak gaps were found and fixed** (`rag.js`, `news.js`, `documents.js` list, `documents.js` upload) — each live-exploited with two real orgs before being fixed, not assumed from code review. Same root cause every time: the route never checked `Supplier.findOne({_id, orgId})` before touching that supplier's data, despite the pattern being established elsewhere since Phase 1. See the Backlog for the structural recommendation.

## Backlog — carried into Phase 3 (resolved/superseded, kept for history)

- ~~`jobs/newsCron.js` never wired up~~ — **fixed in Phase 3**: wired into `index.js`, runs every 6h.
- **Org-scoping is enforced per-route, not structurally** — still open. Phase 3 checked every new/touched route explicitly and didn't repeat the mistake, but the structural fix (shared middleware / lint rule) recommended here hasn't been built. Carried forward.
- **No "create supplier" UI exists anywhere in the frontend** — still open, unrelated to Phase 3, not touched.
- **Atlas Search indexing lag isn't fully covered by the RAG retry fix** — still open, unrelated to Phase 3, not touched.
- **Gemini free-tier `generate_content` quota (20/day)** — still relevant, and hit repeatedly again during Phase 3 (sentiment classification, enrichment). See `TODO.md` for the current state.

---

# ✅ Phase 3 Complete — End-to-End Smoke Test (2026-08-02)

Every item from the Phase 3 plan above (news aggregation, sentiment, enrichment, timeline, live risk updates) has been implemented, hardened, and verified against real Atlas data, real NewsAPI calls, and real Gemini calls (where quota allowed) - not just code review.

## Smoke Test Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | News fetch + sentiment + storage for a real supplier | 🟢 PASS | Real NewsAPI articles fetched and stored (org-scoped), first article got real Gemini sentiment before quota exhaustion, remaining articles gracefully stored with `null` sentiment instead of being lost |
| 2 | Dedup on repeated fetch | 🟢 PASS | Re-running refresh on the same supplier fetched 5 articles from NewsAPI but stored 0 new ones |
| 3 | Risk score formula + cap + rate limit | 🟢 PASS | Verified the raw formula matches exactly (e.g. a raw target of 84 from a starting score of 0 was correctly capped to 15), and an immediate second update with the same reason was correctly skipped as rate-limited |
| 4 | Timeline merges all 5 event types | 🟢 PASS | A real supplier accumulating a document upload, news articles, a manual edit, and a risk change all appeared correctly, sorted most recent first |
| 5 | Company enrichment | 🟢 PASS | Re-verified live after the Gemini model/quota fix (see below): 3 real companies (Tesla, Siemens, Toyota) returned plausible, mostly-accurate data via both direct service calls and the real UI |
| 6 | Cross-org access blocked on every new/touched endpoint | 🟢 PASS | `news.js` (GET + refresh), `suppliers.js` (enrich + timeline) all correctly 404 for a second org, re-verified in the final pass |
| 7 | Zero unexpected console errors (Playwright) | 🟢 PASS | The only console line seen was the browser's own default logging of a real, intentionally-triggered 500 (Gemini quota) during the enrichment UI test - not an application bug, same category noted in the Phase 1/2 smoke tests |

All test data (suppliers, users, orgs, documents, news, risk history) created during testing was cleaned from Atlas afterward.

## Key Decisions & Rationale

Non-obvious calls made during Phase 3:

- **Enrichment doesn't feed the risk-scoring formula.** There's no non-speculative signal for how industry/company-size/founding-year should move a risk score without real product input - implemented as a recompute-for-freshness trigger only. Noted in `TODO.md` as a product decision, not a technical one. (`server/routes/suppliers.js`)
- **Risk score changes are capped at +/-15 per update and rate-limited to once per (supplier, reason) per 24h.** Guards against a burst of negative news (or a batch cron run) producing a nonsensical single-step jump - the score still moves toward the "correct" weighted value, just gradually. Live-verified both guards independently. (`server/services/riskScoreService.js`)
- **Timeline is aggregated on read, not a dedicated event-log model.** Every event type (supplier created/updated, document uploaded, news mentioned, risk changed) already has a source of truth in an existing collection - a separate model would just duplicate data and need to stay in sync. (`server/routes/suppliers.js`)
- **Gemini over a paid company-data API for enrichment**, and **the NewsAPI key already in `.env` used directly rather than building the keyless GDELT/RSS fallback** - both chosen because the primary path (a real, working key/no-new-signup) was available, per the spec's own guidance to default to the no-key-required or already-available path rather than block progress. Both are revisable; see `TODO.md`.
- **`TODO.md` introduced this phase** as the single place for anything genuinely blocked on a human decision (API keys, product tradeoffs, infrastructure/billing, known limitations) - kept separate from this file's historical backlog sections so open items don't get lost in a growing document.

## Backlog — carried into Phase 5

See `TODO.md` at the repo root for the full, current list of open items (it supersedes this section going forward - kept here only for the org-scoping/create-supplier-UI items that predate `TODO.md`'s introduction):

- **Org-scoping is still enforced per-route, not structurally.** Recommendation unchanged since Phase 2: a shared middleware that resolves the supplier via an org-scoped lookup and attaches it as `req.supplier`, or at minimum a lint rule / review checklist item. Every new Phase 4 route (`twin`, `esg-refresh`, `logistics-refresh`, `snapshot`/`snapshots`) was individually checked and live cross-org-tested rather than relying on the pattern being structural - none repeated the mistake, but the structural fix itself still hasn't been built.
- ~~Document upload/delete and manual supplier edits never triggered a risk-score recompute~~ - **fixed in Phase 4**: both now trigger a shared risk+health recompute via `twinSyncService.js`.
- **No "create supplier" UI.**

---

# ✅ Phase 4 Complete — End-to-End Smoke Test (2026-08-05)

Every item from the Phase 4 plan above (Unified Supplier Model, Digital Twin Engine, Health Score, Historical Snapshots, Twin Synchronization) has been implemented, hardened, and verified against real Atlas data and real Gemini calls - not just code review. Built directly on a completed read-only audit rather than re-discovering its findings.

## Smoke Test Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | ESG/logistics refresh, real differentiated data | 🟢 PASS | Patagonia scored 95/88/90 (E/S/G), ExxonMobil scored 35/50/60 - real, plausible differentiation, not hallucinated noise |
| 2 | Null-vs-zero bug found and fixed | 🟢 PASS | `Number(null)` evaluating to `0` was silently turning Gemini's honest "unknown" logistics responses into a misleading literal `0` - fixed before this ever reached the UI |
| 3 | Digital Twin fully synthesizes all sources | 🟢 PASS | A real Tesla supplier with accumulated documents/news/enrichment/ESG/logistics/risk/health all correctly appeared in one `GET .../twin` response, internally consistent (e.g. risk's `expiryScore` matched `contract.status`) |
| 4 | Health Score meaningfully differentiated from Risk Score | 🟢 PASS | Two suppliers with identical (never-computed, 0) risk scores produced health scores of 65 and 44 based purely on ESG/logistics/contract differences - proof it isn't Risk Score renamed |
| 5 | Document upload/manual edit immediately updates both scores | 🟢 PASS | Uploading a document moved riskScore 0→15 and healthScore 50→59 in one request, no separate refresh step; a follow-up `contractExpiry` edit moved both again, with exact arithmetic matching the documented formulas both times |
| 6 | Pre-existing sync gap confirmed fixed with real before/after evidence | 🟢 PASS | Same test as #5 - before Phase 4, this upload/edit would have left both scores unchanged indefinitely; both moved immediately with no cron/manual-refresh step in between |
| 7 | Snapshot capture + comparison reflects real point-in-time state | 🟢 PASS | Two manual snapshots taken with a `contractExpiry` edit in between correctly captured differing states (risk 26→41, health 58→49); a third snapshot was auto-triggered by a significant (capped) swing, unprompted |
| 8 | Retention policy | 🟢 PASS | Verified with a temporarily-lowered test cap (3 instead of 100): after 7 total snapshot takes, exactly the 3 most recent remained |
| 9 | Cross-org access blocked on every new endpoint | 🟢 PASS | `twin`, `esg-refresh`, `logistics-refresh`, `snapshot` (POST), `snapshots` (list), `snapshots/:id` (single) all correctly 404 for a second org, tested together in one sweep |
| 10 | Zero console errors across all new UI (Playwright) | 🟢 PASS | Full flow - register, populate real data, view twin, edit, take snapshot - produced zero console errors across 5 separate live UI runs during development plus one final comprehensive pass |

All test data (suppliers, users, orgs, documents, news, risk/health history, snapshots) created during testing was cleaned from Atlas after every pass.

## Key Decisions & Rationale

Non-obvious calls made during Phase 4, kept here so the reasoning isn't lost once this stops being a live conversation:

- **Health Score's formula is deliberately structured so ESG+logistics (45% combined) outweigh the inverted risk-score component (25%)** - the audit's single clearest warning was not to let this become Risk Score renamed. Verified live with two suppliers sharing an identical (0, never-computed) risk score but scoring 65 vs. 44 on health, driven entirely by the new signals. (`server/services/healthScoreService.js`)
- **A manual edit that explicitly sets `riskScore` skips the new auto-recompute trigger, but Health Score still recomputes.** Without this carve-out, the newly-added sync trigger would immediately overwrite an admin's deliberate manual risk-score entry with the computed value - which would make manually setting it pointless. Health has no equivalent override field, so no carve-out is needed there. A real, non-obvious product judgment call - flagged in `TODO.md` as revisable. (`server/routes/suppliers.js`)
- **Health's inverted-risk factor is computed *after* risk's own recompute within the same trigger, not before.** `twinSyncService.syncScoresAfterChange()` calls `computeRiskScore` then `computeHealthScore` in that order deliberately - health's `riskComponent = 100 - riskScore` would otherwise use a stale risk value the moment risk actually changes. Verified live: after a document upload moved risk 0→15, health's `riskComponent` factor read `85` (using the *new* risk score), not `100`. (`server/services/twinSyncService.js`)
- **Digital Twin stays compute-on-read, not persisted** - explicitly recommended by the audit and consistent with the timeline endpoint's existing precedent. No sync burden, always fresh by construction. Revisit only if this becomes a real performance concern at scale (unbenchmarked - see `TODO.md`).
- **An on-demand snapshot is automatically taken when either score moves by a significant (≥15-point, i.e. capped) amount**, on top of the existing scheduled+manual triggers - deliberately not on every minor mutation, which would defeat the retention cap's whole purpose. Verified live: a capped risk swing correctly triggered a `reason: significant_change` snapshot with no explicit request to do so.
- **Found and fixed a real bug during ESG/logistics testing, not just at the end:** `Number(null)` evaluates to `0` in JavaScript, not `NaN` - the initial coercion silently converted Gemini's correct "I don't know" `null` responses into a misleading literal `0` for on-time-delivery-rate (reading as "0%" instead of "unknown"). Caught by inspecting the raw Gemini response directly rather than trusting the parsed output, fixed before it ever reached the UI.

---

# ✅ Phase 5 Complete — End-to-End Smoke Test (2026-08-06)

Every item from the Phase 5 plan above (configurable weights, explainable narratives, confidence scores, risk/health trend history, alert thresholds) has been implemented, hardened, and verified against real Atlas data and real Gemini calls - not just code review. Built directly on a completed read-only audit rather than re-discovering its findings.

## Smoke Test Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Editing org weights via the real UI changes real scores | 🟢 PASS | Weight settings panel edit + save, confirmed the running-total validation blocks an unbalanced save, and a subsequent supplier score computation used the new weights |
| 2 | Weight validation hard-rejects a bad sum | 🟢 PASS | `PATCH /org/risk-config` returned `400 INVALID_CONFIG` with the actual submitted sum, no silent rescale |
| 3 | Config is lazily created, not on read | 🟢 PASS | `GET /org/risk-config` for a never-configured org returned defaults with `isDefault: true` and wrote no document; the first `PATCH` created it |
| 4 | Narrative correctly attributes a factor-value-driven change | 🟢 PASS | Verified against a real news-driven score change |
| 5 | Narrative correctly attributes a weight-only change (no factor value change) | 🟢 PASS | Found and fixed a real blind spot first (see below) - after the fix, correctly named "country risk's contribution increased (now 100%)" following a weight-only edit with zero underlying data change |
| 6 | Narrative never states a contradictory causal claim | 🟢 PASS | Found and fixed a real sign-mismatch bug first (see below) - re-verified the rephrased sentence structure across several capped-change scenarios |
| 7 | Confidence scores genuinely discriminate, not maxed out | 🟢 PASS | Tesla/Siemens: 0.85-1.0 on enrichment/ESG, 0-0.4 on logistics (data-scarce); a fabricated company: 0 across the board |
| 8 | Risk/health trend chart renders real history | 🟢 PASS | Dual-line chart populated from real `RiskHistory`/`HealthHistory` rows for a supplier with several score changes |
| 9 | Dashboard average health score + worsening-health panel | 🟢 PASS | Cross-checked against the same underlying data used by the per-supplier chart |
| 10 | Alert banner + dashboard active-alerts panel fire on a real breach | 🟢 PASS | Lowered a test org's risk threshold, triggered a real enrich-driven score change, confirmed both the per-supplier banner and the dashboard panel showed the breaching supplier with the correct narrative text |
| 11 | Snapshot reason correctly prioritizes threshold breach over significant change | 🟢 PASS | Found and fixed a real precedence bug first (see below) - re-verified the snapshot was labeled `'threshold_breach'`, not `'significant_change'`, on a simultaneous large-swing-plus-crossing |
| 12 | Cross-org access blocked on every new endpoint | 🟢 PASS | `/org/risk-config` (GET+PATCH) and `/suppliers/:id/risk-health-history` both correctly 404 for a second org |
| 13 | Full smoke run across every Phase 5 UI surface, zero console errors (Playwright) | 🟢 PASS | Weight settings, supplier creation, enrich/ESG/logistics refresh, dashboard stats, trend chart, narrative toggle, and confidence badges all exercised together in one pass |

All test data (orgs, suppliers, weight configs, alerts) created during testing was cleaned from Atlas after every pass.

## Key Decisions & Rationale

Non-obvious calls made during Phase 5, kept here so the reasoning isn't lost once this stops being a live conversation:

- **Weight validation is a hard 400 rejection, not a silent auto-normalize.** A misconfigured org (weights that don't sum to 1) gets a loud error with the actual submitted sum, rather than having its input silently rescaled to something it didn't ask for - the failure mode a configurable-weights feature most needs to avoid is an admin who thinks they set weights one way while the app quietly used another. Revisable if this proves too strict in practice (`TODO.md`).
- **`RiskConfig` is lazily created on the first `PATCH`, not on the first `GET`.** Reading a never-configured org's weights returns the hardcoded defaults directly, with no row written - avoids a placeholder document for every org that never opens the settings panel.
- **Confidence is a self-reported `0-1` number from the same prompted-JSON pattern as sentiment, not token-level logprobs.** The Gemini Node SDK's logprobs support is model/tier-limited and measures token likelihood, not semantic confidence in the answer - a self-report was judged more useful and consistent with the existing sentiment precedent. Live-verified to vary sensibly by company and by field rather than being uniformly maxed out.
- **Found and fixed a real narrative sign-contradiction bug during live testing:** ranking factors by `(value_now - value_prev) * weight` could name a factor as the reason for a change whose own direction contradicted the actual reported delta's sign, whenever an earlier score change had itself been capped (so the stored `previousScore` wasn't the true raw weighted sum of `previousFactors`). Fixed by rephrasing every narrative sentence to state the real delta and the dominant factor's own movement as two separate, both-true facts, never a causal claim between them. (`server/services/narrativeService.js`)
- **Found and fixed a real narrative blind spot in the same pass:** a weight-only edit between two measurements, with no underlying factor value change, produced a bare "score fell by -11" narrative naming no factor, because the original contribution model only diffed factor *values*. Fixed by snapshotting the weights actually used (`weightsUsed` field on `RiskHistory`/`HealthHistory`) and changing the contribution formula to `(value_now * weight_now) - (value_prev * weight_prev)`, which correctly attributes weight-driven changes too.
- **No scheduled cron checks for threshold breaches.** Alert state is computed fresh from the supplier's current persisted score on every read (`twinService.js`, `GET /dashboard/stats`) - there's no staleness window a periodic re-check would close. A cron would only add value paired with a push notification channel (email/SMS) to fire from at the moment of breach, which doesn't exist yet (`TODO.md`).
- **Found and fixed a real snapshot-labeling precedence bug:** when a change was simultaneously a large (capped) swing and a fresh threshold crossing, the original `if (significant) {...} else if (breach) {...}` ordering always labeled the snapshot `'significant_change'`, silently losing the more decision-relevant `'threshold_breach'` fact. Fixed by checking the breach condition first. (`server/services/twinSyncService.js`)
- **Default alert thresholds (risk ≥70, health ≤30) were chosen to match `RiskBadge`/`HealthBadge`'s existing red-zone cutoffs**, not arbitrary new numbers, so a breach lines up with what a user already reads as "red" on the badge.

---

# ✅ Phase 6 Complete — End-to-End Smoke Test (2026-08-08)

Every item from the Phase 6 plan above (risk forecasting, predictive dashboard, early warning system, anomaly detection, trend analysis) has been implemented and verified against real Atlas data - not just code review. Unlike prior phases, most individual verifications *correctly* return an honest `insufficient_data` result today, since real per-supplier history is still thin; that's the expected, working behavior this phase was built to produce, not a shortfall.

## Smoke Test Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Per-supplier forecast honestly abstains for real suppliers without enough history | 🟢 PASS | Confirmed against real current suppliers - most/all correctly return `insufficient_data` with the real point count/span and what was required |
| 2 | Burst-detection refuses a same-instant test-script cluster | 🟢 PASS | Reused the audit's own "4 `RiskHistory` rows in 0.03s" finding as the refusal case; `MIN_SPAN_HOURS` gate rejects it even though `MIN_POINTS` alone would pass |
| 3 | Portfolio forecast returns a real, non-insufficient number | 🟢 PASS | Raw-point pooling across every supplier's `SupplierSnapshot` rows produced a genuine `'ok'` result, after the day-bucketed-average first design was found (live) to wrongly fail sufficiency |
| 4 | Predictive dashboard panel renders a real confidence band that visibly widens | 🟢 PASS | Portfolio `<Area>`/`<Line>` band, sparser/further-out projections visibly wider |
| 5 | Per-supplier insufficient-data state renders as real, clear UI text | 🟢 PASS | "Not enough history yet... N collected, M needed" with real numbers, never blank/spinner |
| 6 | Chart X-axis stays chronological with a projected series present | 🟢 PASS | Found and fixed a real bug first (see below) - re-verified via screenshot after moving the historical `<Line>` to declare first |
| 7 | Early warning correctly abstains for insufficient-data suppliers | 🟢 PASS | Unit-tested (4 cases) plus confirmed live - the more important case given today's real data reality |
| 8 | Early warning fires at the correct horizon where enough real history exists | 🟢 PASS | Unit-tested against a realistic synthetic point array covering the exact crossing logic |
| 9 | Early warning excludes a metric already reactively breaching today | 🟢 PASS | Unit-tested exclusion path; Phase 5's reactive alert and Phase 6's projected alert never double-report the same metric |
| 10 | Anomaly detection abstains on insufficient window data, zero false positives on real data | 🟢 PASS | Live-scanned 43 suppliers with recent `RiskHistory` activity: 70 insufficient_data, 16 evaluated-and-correctly-not-detected, 0 false positives; all suppliers with recent news also 0 false positives on sentiment shift |
| 11 | Anomaly detection excludes a window already caught by Phase 5's significant-change cap | 🟢 PASS | Unit-tested (9 cases total) exclusion path |
| 12 | Trend-line overlay reconstructs the exact forecast-panel regression line, gated per-metric | 🟢 PASS | Verified live against a real qualifying supplier - legend correctly showed "Risk trend (fitted)" while correctly omitting a health trend line (health forecast still `insufficient_data` for that supplier) |
| 13 | Cross-org access blocked on every new endpoint | 🟢 PASS | `/suppliers/:id/forecast`, `/org/forecast`, and the `/suppliers/:id/twin` fields they feed all correctly 404/scope for a second org |
| 14 | Phase 5's existing reactive alerts still work unchanged alongside the new predictive/anomaly tiers | 🟢 PASS | Fresh org: real reactive breach banner fired correctly, with correctly zero false early-warning/anomaly sections since no predictive data existed yet |
| 15 | Full smoke run, zero console errors (Playwright), including every insufficient-data state | 🟢 PASS | Dashboard, supplier detail, forecast panels, all three alert tiers exercised together in one pass |

All synthetic test data (orgs, suppliers, forecasts, alerts) created during this phase's own testing was cleaned from Atlas after every pass. A separate, broader DB-wide audit on 2026-08-08 additionally found 23 **older** leftover test orgs from Phase 5's own `test_step1-5_*.js` scripts, which had never had a cleanup step written at all (unlike Phase 3 and earlier). 22 were deleted; one was kept on purpose as a permanent fixture - see the note under Phase 6's roadmap table above and `TODO.md` section 5.

## Key Decisions & Rationale

Non-obvious calls made during Phase 6, kept here so the reasoning isn't lost once this stops being a live conversation:

- **Minimum-data thresholds (`MIN_POINTS = 5`, `MIN_SPAN_HOURS = 24`) are hard-coded, not per-org configurable, and deliberately conservative.** Chosen to comfortably reject the exact burst pattern the audit found while still firing on genuinely time-spread real data. Not exposed as an org setting because there's no product signal yet for what a "looser" or "stricter" org would even want.
- **`confidenceLevel` is capped at `'medium'`, never `'high'`, in this version - deliberately, not a placeholder.** A hand-rolled regression over at most a few dozen points, on a hand-tuned 0-100 score, should never claim high confidence regardless of how much data accumulates within what this phase can validate.
- **Portfolio forecasting pools raw `SupplierSnapshot` rows, not a day-bucketed average, for the regression fit.** The day-bucketed design was tried first and rejected after live testing showed it collapsed a data-rich org (25 real rows) down to 2-3 points, wrongly failing sufficiency. The day-bucketed average is still computed and returned separately, display-only, since a scatter of raw cross-supplier points is unreadable as a trend line.
- **Found and fixed a real recharts axis-ordering bug during live UI testing, not code review:** with a shared category `XAxis` and `allowDuplicatedCategory={false}`, recharts builds the axis in JSX declaration order, not by sorting label values - declaring the future-projecting `<Area>`/dashed `<Line>` before the historical line scrambled the axis into non-chronological order. Fixed by always declaring the historical series first.
- **Both new alert types (projected breach, anomaly) explicitly exclude anything already caught by a more specific mechanism** - a projected breach never fires for a metric already breaching today, and a compounding-drift window never fires if it already contains one change large enough to have tripped Phase 5's own significant-change cap. Deliberate non-overlap: re-reporting an already-known problem under a second alert type would dilute signal, not add it.
- **Sentiment pattern-shift detection can structurally never look back further than 7 days**, because `NewsCache.publishedAt` has a hard 7-day MongoDB TTL - articles are actually deleted, not filtered. Not a tunable parameter of `anomalyService.js`; a ceiling imposed by a schema decision three phases earlier.
- **The "fires correctly on a genuine real-trigger crossing" test case for early warning and compounding drift could not be produced within this build session** - both require real data spread across real hours/days that a live session can't fabricate by waiting. Verified instead via unit tests against realistic synthetic point arrays, plus a full scan of every real supplier with enough history to evaluate, confirming zero false positives and correct abstention given today's actual trends. Expected to resolve itself through real ongoing usage, not a gap to close artificially (`TODO.md`).
- **A DB-wide test-data audit found the Phase 5/6 leftover-account problem was systemic, not isolated** - every account in the database traced back to test registrations, and Phase 5's own `test_step1-5_*.js` scripts had no matching cleanup step at all (unlike Phase 3 and earlier). One org was deliberately kept as a permanent fixture rather than deleted, since it's the only currently-existing example of real data that clears `forecastService.js`'s sufficiency gates on both risk and health - see `TODO.md` section 5.

---

# ✅ Phase 7 Complete — End-to-End Smoke Test (2026-08-08)

Every item from the Phase 7 plan above (failure simulation, AI decision support, alternative supplier recommendations, business impact analysis, recovery planning) has been implemented and verified against real Atlas data and real Gemini calls - not just code review. This phase carried Phase 6's data-honesty discipline into a phase with an even thinner real-data foundation: several verifications are expected to show a real, working "not enough data" or "AI-estimate" state today rather than a rich real-data result, since the live database (post-cleanup) holds one real fixture org. All rich-data verifications below were run against a temporary, real, clearly-named test org created and destroyed within this phase's own session.

## Smoke Test Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Failure simulation reflects real, genuinely different supplier profiles | 🟢 PASS | 3 real suppliers (bare, Gemini-enriched-with-document, sole-category-source) created via the actual running API - outputs correctly differed, e.g. the sole-source supplier correctly said "the organisation's only supplier" |
| 2 | Failure simulation blocked cross-org | 🟢 PASS | A second org's id for the same supplier correctly returned 404 |
| 3 | Mitigation strategies are situation-specific, not generic | 🟢 PASS | Real Gemini calls correctly referenced context specific to the test supplier (e.g. "20 days remaining on the contract") |
| 4 | Mitigation strategies throw on malformed Gemini shape | 🟢 PASS | 5 synthetic malformed responses (mocked via `require.cache` substitution) all correctly threw; a well-formed response correctly succeeded |
| 5 | Alternatives honestly gate each comparison dimension | 🟢 PASS | An unenriched pair scored on category+country only; after enriching one side, `comparisonBasis` correctly reflected the new dimension's real availability |
| 6 | Alternatives honestly abstains with no comparable pool | 🟢 PASS | A sole-category-source supplier correctly returned `status: 'no_alternatives_found'` instead of a low-quality guess |
| 7 | Business impact: AI-estimate path for an unpopulated supplier | 🟢 PASS | Correctly returned `mode: 'ai_estimate'` with an honest all-null `userProvided` block |
| 8 | Business impact: real-math path after populating real fields | 🟢 PASS | Same supplier, after `PATCH .../business-fields` with a real contract value, correctly switched to `mode: 'real'` with direct (non-Gemini) math |
| 9 | Business impact: locale bug found and fixed live | 🟢 PASS | A real $500,000 contract value rendered as `5,00,000` (server's OS locale) before the fix, `500,000` after - re-verified live post-fix |
| 10 | Business-fields update is admin-only | 🟢 PASS | `PATCH .../business-fields` correctly `403 FORBIDDEN` for a `viewer` role |
| 11 | Recovery estimate is a genuinely context-sensitive range, never a fixed output | 🟢 PASS | A data-rich and a data-thin test supplier produced different confidence levels (0.8 vs. 0.4) in the same session, both always labeled `"AI-estimated range - not a calculation"` |
| 12 | Cross-org access blocked on every new endpoint | 🟢 PASS | All 6 new endpoints (`simulate-failure`, `mitigation-strategies`, `alternatives`, `business-fields` PATCH, `business-impact` GET, `recovery-estimate`) correctly 404/403 for a second org, tested together in one sweep |
| 13 | Full smoke run across the Scenario Simulator UI, zero console errors (Playwright) | 🟢 PASS | Simulate → mitigate → alternatives → business impact (edit + view) → recovery estimate exercised together in one pass |

This phase's own test data (`phase7_test_*` org, 2 users, 6 suppliers total across the session) was deleted via the newly-fixed `deleteOrgCascade` service, verified with a live query before (2 test users, 3 orgs/users, 6 suppliers total) and after (0 `phase7_test*` rows, exactly 1 org/1 user/1 supplier remaining - the permanent fixture, confirmed untouched) cleanup, plus an explicit orphan-check across `riskhistories`/`healthhistories`/`suppliersnapshots`/`newscaches` for the deleted org's id - all confirmed 0.

## Key Decisions & Rationale

Non-obvious calls made during Phase 7, kept here so the reasoning isn't lost once this stops being a live conversation:

- **Business Impact's real-math mode is opt-in forever, unlike every other AI-default field in this app.** Enrichment/ESG/logistics/forecasting all improve automatically just from the app running and accumulating real history; Business Impact's real numbers will never appear without someone deliberately entering them via the new admin-only fields. Accepted as correct for this specific kind of data (nobody's business generates a contract value passively), not treated as a shortfall to fix later.
- **Every AI-backed Phase 7 service re-derives Step 1's simulation context server-side rather than trusting a client-supplied one.** Matches the "never trust client-provided context for a computed result" precedent already established throughout the app (risk/health scoring, forecasting) - a client could otherwise pass a fabricated simulation object to skew mitigation strategies or the recovery estimate.
- **`criticalityRating` is a 1-5 integer scale, not enum labels ("low"/"high").** My own design call, absent spec guidance either way - chosen to compose numerically with the rest of the app's scoring conventions (risk/health/confidence are all numeric) rather than requiring a separate label-to-number mapping wherever it's used.
- **Recovery Planning's label is unconditional, Business Impact's `mode` is conditional.** Deliberately different: Business Impact genuinely has two real code paths that can each be correct (real math XOR AI estimate), so the label must say which one ran. Recovery Planning has exactly one path - always an estimate - so making that label conditional on anything would imply a precision it structurally can never have.
- **Found and fixed a real locale bug via live testing, not code review**: `Number.prototype.toLocaleString()` with no locale argument depends on the server process's own OS locale, not the caller's - this deployment's server defaulted to Indian digit grouping. Every server-generated currency string in `businessImpactService.js` now passes an explicit `'en-US'` locale. Worth remembering as a bug *category*: any other server-side `toLocaleString()` call elsewhere in the app (none currently exist per a repo-wide check) would carry the same risk.
- **A DB-wide org-level cascade-delete gap was closed as a side effect of this phase's cleanup work, not the phase's stated goal.** The app had accumulated no fewer than three separate cleanup-related findings across Phases 5-7 (leftover test accounts, leftover test orgs, orphaned orgs with no cascade path) - each fixed as found, each verified with a live before/after query rather than trusted from the fix itself, per the standing lesson from the Phase 5/6 cleanup-claim failures earlier in this project.

Full pass/fail verification of all of the above is above; open items (business-impact real-mode's manual-population dependency, unvalidated similarity-scoring weights, confidence-calibration inheritance from Phase 5/6) are tracked in `TODO.md` sections 2 and 4.

---

# ✅ Phase 8 Complete — End-to-End Smoke Test (2026-08-08)

Every item from the Phase 8 plan above (Risk Analyst, Legal, Finance, ESG, Logistics, and Manager agents, plus Agent Collaboration) has been implemented and verified against real Atlas data and real Gemini calls - not just code review. This phase's central deliverable was honesty discipline, not feature count: two agents (Risk Analyst, Legal) are genuine new capability, two (ESG, Logistics) are explicitly-labeled thinner things, and Finance's one new behavior is a hardcoded refusal rather than a Gemini call at all.

## Smoke Test Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Risk Analyst reflects real, differentiated supplier profiles | 🟢 PASS | Two real suppliers (bare vs. one with a contract expiring in 10 days) produced correctly differentiated assessments and key concerns; forecast/history/anomaly dimensions correctly reported as unavailable for both (no history yet) |
| 2 | Risk Analyst blocked cross-org | 🟢 PASS | A second org's id for the same supplier correctly returned 404 |
| 3 | Legal extraction is accurate and source-quoted against real document text | 🟢 PASS | A hand-built test contract (termination/renewal/compliance/liability/payment clauses) was correctly extracted across all 5 topics, each finding matched by a real excerpt |
| 4 | Legal honestly abstains with no documents or no relevant content | 🟢 PASS | A zero-document supplier correctly returned `status: 'no_documents'` instead of a guess |
| 5 | Finance real-math and AI-estimate modes both work, reusing Phase 7 | 🟢 PASS | An unpopulated supplier correctly returned `mode: 'ai_estimate'`; after `PATCH .../business-fields`, the same supplier correctly switched to `mode: 'real'` |
| 6 | Finance payment-history/invoices are always a hardcoded abstention, never a number | 🟢 PASS | Identical abstention message present and non-numeric in both business-impact modes; verified live beforehand that a differently-shaped prompt makes the same model fabricate a plausible fake figure, confirming the code-enforced design was necessary |
| 7 | ESG/Logistics correctly labeled as non-independent, and correctly persist on first fetch | 🟢 PASS | Found and fixed a real bug first (see below) - re-verified a first call correctly returns `freshlyFetched: true` with real data, a second call correctly returns `freshlyFetched: false` reusing the persisted result, no duplicate Gemini call |
| 8 | Manager Agent executive summary honestly reflects real input depth | 🟢 PASS | Verified against a rich profile (real document, real business fields, real ESG/logistics) and a sparse profile - both summaries correctly distinguished genuine analysis from focused-lens restatements and from the payment-history abstention, not flattened into equal-sounding claims |
| 9 | Manager Agent concurrency hardening | 🟢 PASS | Found an intermittent 500 first (see below) - sequenced ESG/Logistics relative to each other; re-verified against both a cold (never-enriched) and a rich supplier with no further failures |
| 10 | Cross-org access blocked on every new endpoint | 🟢 PASS | All 6 new endpoints (`risk-analyst`, `legal`, `finance`, `esg`, `logistics`, `manager-summary`) correctly 404 for a second org |
| 11 | Full smoke run across the real Agents UI panel, zero console errors (Playwright) | 🟢 PASS | Register → create supplier → all 6 agent cards → Manager Summary exercised together in one real-browser pass; screenshot-confirmed correct honest labeling throughout (uppercase CSS badges initially tripped up the test script's case-sensitive text assertions, not the app - confirmed visually) |

This phase's own test data (16 orgs created across per-step isolated tests and cross-org checks) was deleted via the existing `deleteOrgCascade` service, verified with a live query before (16 matching orgs/users found, all `phase8_*`-prefixed) and after (0 remaining) cleanup, plus an explicit orphan-check across `riskhistories`/`healthhistories`/`suppliersnapshots`/`newscaches`/`documents`/`docchunks`/`conversations`/`riskconfigs` for all 16 deleted org ids - all confirmed 0. Final DB state: exactly the one real fixture org, untouched.

## Key Decisions & Rationale

Non-obvious calls made during Phase 8, kept here so the reasoning isn't lost once this stops being a live conversation:

- **"Agent" means a scoped, persona-focused Gemini call, not an autonomous tool-using agent - a deliberate scope decision matching what the audit found actually exists in this codebase**, not a shortfall relative to some other interpretation of "multi-agent." No framework was added; none was needed for five different lenses on the same supplier.
- **ESG and Logistics were built, not skipped, despite being the audit's weakest cases** - per this project's established pattern (Phase 6/7) of shipping every roadmap item but framing the weaker ones honestly. The one real addition in each (naming the weakest ESG dimension; a delivery-reliability threshold) is genuine, if modest - not manufactured to seem more substantial than it is.
- **Finance's payment-history/invoice abstention is permanent, not a data-population gap that will resolve with more usage** (unlike, say, Alternative Supplier Recommendations' sparse-data problem from Phase 7). There is categorically no source - public or inferable - for a specific org's private transaction history with a specific supplier; closing this gap for real would need a new payment/invoice integration this project doesn't have.
- **The Manager Agent's `inputs` block hardcodes each source's real nature in code** (`genuine_synthesis` / `genuine_extraction` / `real_math_or_estimate_plus_hardcoded_abstention` / `focused_lens_restatement`), rather than trusting the prompt instruction alone to keep Gemini's prose honest every time - the same "enforce it structurally, don't just ask nicely" principle the Finance Agent's abstention already established.
- **Found and fixed a real persistence bug via live testing, not code review**: the ESG/Logistics agents' "fetch if never populated" fallback called Gemini but never saved the result back to the supplier document, so every subsequent call silently re-fetched from Gemini instead of reusing real data - wasting quota and risking inconsistent answers across calls to the same supplier. Fixed to persist exactly like the existing `/esg-refresh`/`/logistics-refresh` endpoints do (`server/services/esgAgentService.js`, `logisticsAgentService.js`).
- **Handled an intermittent, non-reproducible Manager Agent 500 with appropriate humility rather than a false-confidence fix**: an isolated repro attempt at the suspected concurrent-`save()` race didn't reproduce deterministically, so rather than claim a definitive root cause, the two document-mutating calls (ESG, Logistics) were simply sequenced relative to each other inside the Manager Agent - removing the theoretical risk at the cost of one extra sequential await, without overstating what was actually confirmed. (`server/services/managerAgentService.js`, commit `9de174e`)

Full pass/fail verification of all of the above is above; open items (Finance's permanent abstention, ESG/Logistics's honest scope ceiling, Manager Agent's dependency on its inputs' honesty, per-call Gemini-quota cost) are tracked in `TODO.md` sections 2 and 4.

---

# 🎯 Target Release

| Version | Milestone |
|----------|-----------|
| v0.1 | Authentication & Supplier Management |
| v0.2 | Intelligent Data Layer (RAG) |
| v0.3 | Supplier Intelligence |
| v0.4 | Supplier Digital Twin |
| v0.5 | Explainable Risk Scoring |
| v0.6 | Predictive Analytics |
| v0.7 | Scenario Simulator |
| v0.8 | Multi-Agent Intelligence |
| v0.9 | Supply Chain Visualization |
| v1.0 | Enterprise Release 🚀 |
---

# Version Roadmap

| Version | Milestone |
|----------|-----------|
| **v0.1** | Authentication & Supplier Management |
| **v0.2** | Document Upload & AI Chat (RAG) |
| **v0.3** | News Intelligence & Sentiment Analysis |
| **v0.4** | Supplier Digital Twin Engine |
| **v0.5** | Explainable Risk Scoring |
| **v0.6** | Predictive Analytics |
| **v0.7** | Scenario Simulator |
| **v0.8** | Multi-Agent AI |
| **v0.9** | Supply Chain Graph Visualization |
| **v1.0** | Enterprise Release |

---

# Getting Started

## Fork the Repository

Click the **Fork** button on GitHub.

Clone your fork.

```bash
git clone https://github.com/<your-username>/SupplyLens.git
cd SupplyLens
```

---

## Install Dependencies

### Client

```bash
cd client
npm install
```

### Server

```bash
cd ../server
npm install
```

---

## Configure Environment Variables

Create

```
server/.env
```

Example

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

GOOGLE_API_KEY=your_google_api_key
```

---

## Start Development Server

Backend

```bash
npm run dev
```

Frontend

```bash
npm run dev
```

---

# Project Structure

```
SupplyLens/

client/
│
├── src/
├── public/
└── package.json

server/
│
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── uploads/
└── package.json

README.md

CONTRIBUTING.md
```

---

# Branch Naming Convention

Please use descriptive branch names.

Examples

```
feature/rag-chatbot

feature/digital-twin

feature/scenario-simulator

feature/multi-agent-ai

feature/supplier-graph

bugfix/login-validation

docs/update-readme

refactor/auth-service
```

---

# Commit Guidelines

SupplyLens follows the **Conventional Commits** specification.

Examples

```
feat: add supplier digital twin engine

feat: implement RAG chatbot

feat: integrate supplier sentiment analysis

fix: resolve JWT authentication bug

refactor: simplify supplier controller

docs: improve installation guide

test: add supplier API integration tests
```

---

# Coding Standards

## Frontend

- Use React functional components.
- Prefer Hooks over class components.
- Create reusable UI components.
- Use descriptive variable names.
- Avoid duplicated logic.

---

## Backend

- Follow RESTful API principles.
- Validate all incoming requests.
- Use async/await.
- Separate business logic into services.
- Return meaningful HTTP status codes.

---

## General

- Write readable code.
- Keep functions small.
- Use meaningful commit messages.
- Remove unused imports.
- Document complex logic.

---

# Pull Request Guidelines

Before submitting a Pull Request:

- Sync your branch with the latest `main`
- Ensure the project builds successfully
- Test your changes
- Update documentation if necessary
- Keep each PR focused on a single feature or bug fix

PR Description should include:

- Summary
- Motivation
- Testing
- Screenshots (if applicable)

---

# Reporting Bugs

When reporting bugs, include:

- Operating System
- Browser
- Node.js version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if available)

---

# Feature Requests

Feature requests should include:

- Problem statement
- Proposed solution
- Alternative approaches
- Additional context

We especially welcome ideas related to:

- AI
- Supply Chain Analytics
- Digital Twins
- Predictive Analytics
- Explainable AI
- Multi-Agent Systems
- Supply Chain Visualization

---

# Documentation

Documentation improvements are always welcome.

Examples include:

- README updates
- API documentation
- Architecture diagrams
- Deployment guides
- Tutorials
- Code comments

---

# Code of Conduct

Please be respectful, collaborative, and constructive.

We strive to maintain an inclusive and welcoming environment for everyone.

---

# License

By contributing to SupplyLens, you agree that your contributions will be licensed under the project's MIT License.

---

## Thank You ❤️

Every contribution—whether it's fixing a typo, improving documentation, or implementing a major feature—helps make SupplyLens a better platform for intelligent supplier risk management.

Happy coding! 🚀
