# SupplyLens — Architecture

A real technical reference for developers, separate from [CONTRIBUTING.md](CONTRIBUTING.md)'s
phase-by-phase changelog. If you want to know *why* something was built a certain way in a specific
phase, CONTRIBUTING.md has that history. If you want to know how the system fits together *right
now*, this is that document.

## System overview

SupplyLens is a MERN app (MongoDB Atlas, Express, React, Node) with one external AI dependency
(Google Gemini, via `@google/generative-ai`) and one external data dependency (Currents API, for
news). Both are optional at runtime: with `MONGO_URI` unset the server runs in a genuine **demo
mode** (in-memory canned data, no crash); with `GEMINI_API_KEY`/`CURRENTS_API_KEY` unset, the
specific features that need them fail gracefully rather than blocking anything else.

```
frontend/  React 19 + Vite + TypeScript, Tailwind v4, shadcn/ui, react-router-dom
server/    Express 5 + Mongoose 9, CommonJS
```

## Server layout

| Directory | What's actually in it |
|---|---|
| `routes/` | 9 route files: `auth`, `suppliers` (the largest — CRUD plus every per-supplier feature: enrichment, ESG/logistics, twin, timeline, forecast, scenario simulator, agents, geolocation), `dashboard`, `documents`, `news`, `rag`, `orgConfig` (risk-config, admin-managed team membership — invite a member, list members, promote/demote an existing one), `orgAnalytics` (org-wide/portfolio endpoints — forecast, timeline, map, heatmap, concentration graph, audit logs), `health` (Phase 10). |
| `services/` | 40 files. Business logic lives here, not in routes — routes stay thin (auth/validation/org-scoping, then delegate). Includes the scoring engine, forecasting, simulation, similarity/recommendation, every Gemini-calling service, and Phase 10's `auditLogService`. |
| `models/` | 14 Mongoose models. `Supplier` is the core entity; `RiskHistory`/`HealthHistory` log **score changes**; `AuditLog` (Phase 10) logs **user actions** — deliberately separate collections, see below. |
| `middleware/` | `auth` (JWT), `requireRole` (RBAC gate), `validate` (express-validator wrapper), `errorHandler` (centralized, single response shape), `rateLimit` and the CORS config in `config/corsOptions.js` (Phase 10). |
| `jobs/` | Three node-cron jobs: `newsCron` (6-hourly), `snapshotCron` (daily), and `alertCron` (15-minutely — checks risk/health threshold breaches and emails opted-in users via `notificationService`). Each has a boot-time catch-up check against `CronRunLog` so a missed slot (deploy, crash, sleeping dev machine) doesn't silently starve the schedule. |
| `config/` | `db.js` (Mongo connection + demo-mode fallback), `swagger.js` (OpenAPI spec, tag-organized by phase), `logger.js` (pino, Phase 10), `corsOptions.js` (Phase 10). |
| `data/` | Two static JSON lookup tables, no external API: `countryRisk.json` (risk-scoring input) and `countryCentroids.json` (Phase 9 map/heatmap — capital-city coordinates per ISO country code). |

## Frontend layout

`frontend/` is the current, canonical frontend (the earlier `client/` app it replaced had no
router and no TypeScript). `App.tsx` defines real `react-router-dom` routes: `/`, `/login`, and
`/dashboard/*` behind `ProtectedRoute`. `/dashboard` is a layout route (`DashboardLayout`) whose
sidebar/topbar shell persists across navigation rather than remounting — `AnimatePresence`'s page
transition is keyed on the top-level path *section* (e.g. `/dashboard` for every dashboard
sub-route), not the raw pathname, so only landing↔login↔dashboard transitions actually fade.
`/dashboard/analytics/*` is itself a nested layout route (`AnalyticsLayout`) wrapping the four
visualization tab pages (concentration graph, geographic map, timeline, heatmap).

- `lib/` — `api.ts` (the one shared axios instance, including access-token refresh handling),
  `auth.tsx` (`AuthProvider`/`useAuth`), and one module per feature area (`suppliers.ts`,
  `documents.ts`, `chat.ts`, `twin.ts`, `forecast.ts`, `scenario.ts`, `agents.ts`,
  `visualizations.ts`, `org.ts`, etc.) plus `types.ts` for the corresponding response shapes.
- `components/` — organized by area (`dashboard/`, `supplier/`, `badges/`, `landing/`, `ui/` for
  shadcn primitives), not a flat directory.
- `pages/` — one file per top-level route, plus `pages/analytics/` for the four visualization tabs.

## The org-scoping / 404-vs-403 convention

Load-bearing since Phase 1, applied identically across every route touching a specific record:

- Every request carries a JWT with `{id, orgId, role}`.
- Every query that fetches a specific record filters by **both** the record's own id and
  `req.user.orgId`.
- If that combined lookup finds nothing — because the id doesn't exist, or because it belongs to a
  *different* organisation — the response is **404**, never 403.

The reasoning: a 403 ("exists, but you can't see it") leaks the fact that the id is real. A 404
("not found") looks identical whether the id never existed or belongs to someone else's
organisation — so a caller can never use response codes to enumerate other orgs' data. This is
tested directly (`server/tests/orgScoping.test.js`, Phase 10) against 4 endpoints spread across 4
different route files, not just `suppliers.js`.

## Distinct history collections — don't conflate these

Three different collections all sound like "history" and are not interchangeable:

| Collection | Records | NOT |
|---|---|---|
| `RiskHistory` / `HealthHistory` | Score changes computed by the app's own scoring engine | User actions |
| `Conversation` | AI chat turns (RAG Q&A) | Administrative actions |
| `AuditLog` (Phase 10) | Real user actions — who did what, when (supplier/document/risk-config mutations) | Score changes or AI output |

## Honesty-framing decisions (Phases 5–9)

This project has held one discipline consistently since Phase 5: **never let output look more
certain, precise, or structurally grounded than the real data actually supports.** The concrete
mechanisms, in the order they were built:

- **Data-sufficiency gating** (Phase 5–6, `forecastService.js`): forecasts require a real minimum
  point count *and* a minimum real time spread before producing a number at all — a burst of
  same-instant test writes never counts as "enough history." Below the gate, the response is an
  explicit `insufficient_data` status with the real point count and what was required, never a
  hidden zero or a silently-omitted field. Confidence is hardcoded to never exceed `medium`,
  regardless of fit quality, for the same reason.
- **AI-estimate labeling** (Phase 3–4, `Supplier.enrichment`/`.esg`/`.logistics`): every
  Gemini-generated field is a separate, clearly-named sub-object with its own `confidence` and
  `source: 'gemini'`, structurally distinct from manually-entered fields — never blended into one
  number without saying which is which.
- **Real-vs-AI-estimated labeling** (Phase 7, Scenario Simulator): every output explicitly states
  whether it's derived from real data or an AI estimate.
- **Per-source depth labeling** (Phase 8, Manager Agent synthesis): inputs to the synthesis step
  carry explicit depth/quality labels baked in, rather than trusting the model's own phrasing to
  stay honest about which inputs were thin.
- **Concentration & Redundancy View, not "dependency graph"** (Phase 9,
  `concentrationGraphService.js`): no supplier-to-supplier relationship data exists anywhere in
  this schema. The graph's two edge types (`similarity`, `same_country`) are real, traceable facts
  about category/country/scoring proximity — never described anywhere (code, API, UI, Swagger) as
  implying upstream/downstream supply-chain flow.
- **Country-level geography, not precise location** (Phase 9, `geoLocationService.js`): no lat/long
  or address exists anywhere in this schema. The map/heatmap use a static country-centroid lookup
  and say so explicitly in every response and every UI label.

## Phase 10 — what enterprise-readiness actually covers here

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full Phase 10 audit and build log. Summary of what's
real versus what's a foundation for more work:

- **Testing**: critical-path coverage (auth, RBAC, org-scoping, core scoring/forecast math) via a
  real Jest + Supertest + mongodb-memory-server suite — not comprehensive coverage of all 9 prior
  phases' features. Grown substantially post-launch (179 tests, 17 files as of this update) and
  joined by `frontend/`'s first-ever automated suite (Vitest + React Testing Library, 96 tests,
  12 files) — see TODO.md for exactly what's covered vs. still deliberately deferred in both.
- **CI**: GitHub Actions runs the real test suite and a real frontend build check on every push/PR
  to `main` — confirmed by actually watching it pass, not just written and assumed correct.
- **Docker**: real Dockerfiles + docker-compose, built and run locally, with a real end-to-end
  check through the actual containers (not just "the files exist").
- **Security**: helmet, rate limiting (general + a tighter auth-specific limit), CORS scoped to a
  configured origin list, and input validation closing a real gap the audit found (previously zero
  `validate()` coverage across 7 route files, including one genuine bug fix).
- **Monitoring**: `/api/health` + `/api/health/db`, structured pino logging (replacing scattered
  `console.*`) with request-level logging and secret redaction.
- **Audit logs**: a real `AuditLog` model and viewing endpoint, hooked into every admin-gated
  mutation.
- **RBAC**: deliberately left as the existing 2-role (admin/viewer) model — no real product need for
  more granularity was found anywhere in the codebase or TODO.md; see TODO.md for that decision.
- **Deployment**: a real, complete Render blueprint (`render.yaml`) and `.env.example` — not
  actually deployed live this session (needs an account/billing decision only the project owner can
  make; see TODO.md for exact next steps).
