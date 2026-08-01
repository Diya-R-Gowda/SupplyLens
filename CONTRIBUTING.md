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

---

# Remaining Work — Phase 2 (Intelligent Data Layer)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | PDF Upload Pipeline | Support secure upload and storage of supplier documents. |
| 🔴 | PDF Parsing | Extract text and metadata from uploaded supplier documents. |
| 🔴 | Document Chunking | Split documents into embedding-ready chunks for semantic search. |
| 🔴 | Embedding Generation | Generate vector embeddings using Gemini Embedding models. |
| 🔴 | MongoDB Atlas Search | Store embeddings in Atlas Vector Search for efficient retrieval. |
| 🔴 | RAG Chatbot | Build Retrieval-Augmented Generation chatbot using supplier documents. |
| 🔴 | Conversation Memory | Maintain contextual conversations across user interactions. |

---

# Remaining Work — Phase 3 (Supplier Intelligence)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | News Aggregation | Integrate NewsAPI, RSS feeds, or GDELT for supplier monitoring. |
| 🔴 | Sentiment Analysis | Analyze supplier-related news using AI/NLP models. |
| 🔴 | Company Enrichment | Automatically collect supplier industry, location, and business metadata. |
| 🔴 | Supplier Timeline | Maintain chronological history of supplier events and activities. |
| 🔴 | Live Risk Updates | Automatically update supplier risk when new intelligence becomes available. |

---

# Remaining Work — Phase 4 (Supplier Digital Twin)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | Digital Twin Engine | Combine internal and external supplier information into a continuously evolving supplier profile. |
| 🔴 | Unified Supplier Model | Merge contracts, documents, news, ESG, logistics, and operational data. |
| 🔴 | Supplier Health Score | Continuously calculate supplier health based on multiple data sources. |
| 🔴 | Historical Snapshots | Track supplier state over time for comparison and auditing. |
| 🔴 | Twin Synchronization | Keep Digital Twin updated whenever new supplier information is received. |

---

# Remaining Work — Phase 5 (Explainable Risk Scoring)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | Risk Scoring Engine | Calculate weighted supplier risk scores using configurable factors. |
| 🔴 | Explainable AI | Explain why supplier risk changed and identify contributing factors. |
| 🔴 | Confidence Scores | Display confidence levels for every AI-generated recommendation. |
| 🔴 | Risk History | Maintain historical supplier risk trends and visualizations. |
| 🔴 | Alert Thresholds | Trigger alerts when configurable risk limits are exceeded. |

---

# Remaining Work — Phase 6 (Predictive Analytics)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | Risk Forecasting | Predict future supplier risk using historical trends. |
| 🔴 | Anomaly Detection | Detect unusual supplier behavior and operational anomalies. |
| 🔴 | Trend Analysis | Visualize long-term supplier performance trends. |
| 🔴 | Early Warning System | Notify users before supplier risk becomes critical. |
| 🔴 | Predictive Dashboard | Display future supplier health projections and confidence intervals. |

---

# Remaining Work — Phase 7 (Scenario Simulator)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | Supplier Failure Simulation | Simulate supplier shutdowns and disruptions. |
| 🔴 | Business Impact Analysis | Estimate operational and financial impact of supplier failures. |
| 🔴 | Recovery Planning | Calculate estimated recovery time after disruptions. |
| 🔴 | Alternative Supplier Recommendations | Recommend replacement suppliers based on similarity and performance. |
| 🔴 | AI Decision Support | Generate mitigation strategies using AI recommendations. |

---

# Remaining Work — Phase 8 (Multi-Agent Intelligence)

| Status | Item | Notes |
|---------|------|-------|
| 🔴 | Risk Analyst Agent | Evaluate operational and financial supplier risks. |
| 🔴 | Finance Agent | Analyze payment history, invoices, and financial stability. |
| 🔴 | Legal Agent | Review contracts, compliance clauses, and obligations. |
| 🔴 | ESG Agent | Assess environmental, social, and governance performance. |
| 🔴 | Logistics Agent | Monitor shipping performance and logistics disruptions. |
| 🔴 | Manager Agent | Aggregate outputs from all AI agents into executive summaries. |
| 🔴 | Agent Collaboration | Enable communication between specialized AI agents for coordinated decision-making. |

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

## Backlog — carried into Phase 2

Known, deferred issues. None block Phase 1 completion; all are pre-existing gaps in the Phase 2 (Intelligent Data Layer) surface area:

- **`pdf-parse` v2 API mismatch** (`server/services/ingestService.js`) — still calls `pdf(buffer)` the v1 way; the installed v2 exports a `PDFParse` class instead of a callable function. Real (non-demo) document upload/ingestion 500s until fixed.
- **Gemini `text-embedding-004`** (`server/services/embedService.js`) — used for both ingestion and RAG query embedding; last known to be failing. Blocks real RAG independently of the pdf-parse fix.
- **`jobs/newsCron.js` never wired up** — not required anywhere in the app or any npm script, so `NewsCache` is never populated in real DB mode; `GET /news/:supplierId` returns an empty array for every real supplier until this job is actually started somewhere.

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
