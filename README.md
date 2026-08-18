# 🛡️ SupplyLens - AI-Powered Supplier Risk & Intelligence Platform

![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express%205-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?logo=mongodb)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)
![Tests](https://img.shields.io/badge/Tests-Jest%20%2B%20Supertest-C21325?logo=jest)
![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

SupplyLens is an **AI-powered SaaS application** that helps organizations monitor, explain, forecast, and simulate supplier risk end-to-end - not just track it.

It combines **CRUD supplier management**, **Retrieval-Augmented Generation (RAG)**, **AI sentiment/enrichment analysis**, **explainable risk & health scoring**, **predictive forecasting**, **multi-agent AI intelligence**, and **supply chain visualization** into a single platform, built and shipped across 10 verified phases (see [CONTRIBUTING.md](CONTRIBUTING.md) for the full build history).

**Status: v1.0.0 - all 10 roadmap phases complete and verified end-to-end.**

---

# 🚀 Why SupplyLens?

Modern supply chains are exposed to multiple risks - from contract expiry to negative media coverage to concentration risk. SupplyLens helps organizations:

- 📦 Manage supplier information in one place, scoped per organization
- 📄 Store and semantically search supplier documents
- 🤖 Ask AI questions directly about uploaded contracts (RAG)
- 📰 Monitor supplier-related news and sentiment automatically
- 📊 Compute explainable, per-org-configurable risk & health scores
- 🔮 Forecast risk trajectories and catch anomalies before they're obvious
- 🧭 Run "what-if" scenario simulations before making sourcing decisions
- 🕸️ Visualize supplier concentration, geography, and portfolio timelines
- 🧑‍🤝‍🧑 Get coordinated multi-agent AI analysis (Risk, Finance, ESG, Legal, Logistics + a Manager agent synthesis)
- 🚨 Receive threshold-based alerts before problems become incidents

---

# ✨ Features

## 📋 Core Management
- Full supplier CRUD - org-scoped, with search/filter/pagination, role-gated (admin write, viewer read-only)
- Responsive dashboard with real KPIs, category/growth charts, and a recent-activity feed
- Secure PDF document vault (GridFS-backed) with per-supplier upload/list/delete

## 💬 RAG Chat
Upload supplier contracts and ask natural-language questions such as *"What are the penalty clauses?"* or *"When does this contract expire?"* Answers are grounded in the uploaded documents via MongoDB Atlas Vector Search + Gemini, with source-filename attribution and multi-turn conversation memory.

## 📈 Explainable Risk & Health Scoring
Every supplier gets two distinct, weighted scores - **Risk** and **Health** - computed from news sentiment, contract/document completeness, ESG, logistics, and country factors. Per-org configurable weight tables, deterministic plain-language explanations of *why* a score changed, confidence badges on every AI-derived input, and full historical trend charts.

## 🔮 Predictive Analytics
Linear-regression risk forecasting (per-supplier and portfolio-wide) with honest `insufficient_data` states rather than fake numbers, compounding-delta anomaly detection, sentiment pattern-shift detection, and an early-warning tier that projects future threshold breaches.

## 🧭 Scenario Simulator
"What-if" analysis for supplier failure and sourcing decisions, with alternate-supplier recommendations grounded in real portfolio data.

## 🧑‍🤝‍🧑 Multi-Agent Intelligence
Specialized AI agents - **Risk Analyst, Finance, ESG, Legal, Logistics** - each scoped to what it can honestly assess from real data, coordinated by a **Manager agent** that synthesizes an executive summary and labels each input's actual analytical depth rather than overstating it.

## 🕸️ Supply Chain Visualization
- **Concentration & Redundancy graph** - same-category and same-country relationship mapping (no fabricated dependency data)
- **Geographic map** - country-level supplier locations
- **Portfolio timeline** - every supplier's events merged into one chronological feed
- **Risk heatmap** - portfolio risk distribution at a glance

## 🏢 Enterprise Readiness
- JWT auth with refresh-token rotation, bcrypt hashing, and full RBAC (`admin` / `viewer`)
- Centralized error handling, security headers (`helmet`), and rate limiting
- Structured logging (`pino`) and audit logs for sensitive actions
- Automated test suite (Jest + Supertest + `mongodb-memory-server`) and CI on every push
- Docker Compose for local full-stack orchestration; a ready-to-deploy [Render Blueprint](render.yaml)
- Full OpenAPI/Swagger docs at `/api-docs`

---

# 🛠️ Tech Stack

| Layer | Technology |
|--------|------------|
| **Frontend** | React 19, Vite, Tailwind CSS, Recharts, React-Leaflet, @xyflow/react, Axios |
| **Backend** | Node.js, Express 5, Mongoose, Multer, Node-cron |
| **Database** | MongoDB Atlas (Vector Search + GridFS) |
| **Authentication** | JWT (access + rotating refresh tokens), Bcryptjs, role-based access control |
| **AI Models** | Google Gemini (`gemini-flash-latest` generation, `gemini-embedding-001` embeddings @ 768 dims) |
| **PDF Parsing** | pdf-parse |
| **Security/Ops** | Helmet, express-rate-limit, Pino/Pino-HTTP structured logging |
| **Testing/CI** | Jest, Supertest, mongodb-memory-server, GitHub Actions |
| **Docs** | swagger-jsdoc, swagger-ui-express |
| **Containers/Deploy** | Docker, Docker Compose, Render Blueprint (`render.yaml`) |

---

# 🏗️ System Architecture

> For the real technical depth - actual route/service/job layout, the org-scoping security
> convention, and the honesty-framing decisions behind the AI features - see
> [ARCHITECTURE.md](ARCHITECTURE.md). For the full phase-by-phase build history, technical
> summaries, and smoke-test results, see [CONTRIBUTING.md](CONTRIBUTING.md). The diagram
> below is a simplified, high-level picture.

```
                   +----------------------+
                   |      React App       |
                   +----------+-----------+
                              |
                         REST API (JWT + RBAC)
                              |
                              ▼
                 +------------------------+
                 |   Express Backend      |
                 +------------------------+
                 | Auth · Supplier CRUD   |
                 | Documents · RAG        |
                 | Risk/Health Engine     |
                 | Forecasting · Agents   |
                 | Visualization APIs     |
                 +-----------+------------+
                             |
         +-------------------+------------------+
         |                                      |
         ▼                                      ▼
MongoDB Atlas                          Google Gemini API
(Vector Search + GridFS)        (Embeddings + Generation + Agents)

         ▲
         |
   Node Cron Jobs
         |
         ▼
News API + Sentiment Analysis
```

---

# 📁 Project Structure

```
SupplyLens/
│
├── frontend/
│   ├── src/
│   │   ├── components/      # dashboard shell, supplier panels, badges, landing, shadcn ui/
│   │   ├── lib/              # api client, auth, per-feature service modules, types
│   │   ├── pages/             # top-level routes + pages/analytics/ sub-routes
│   │   └── App.tsx
│   └── package.json
│
├── server/
│   ├── config/
│   ├── middleware/
│   ├── jobs/
│   ├── models/
│   ├── routes/
│   ├── services/            # 40+ services: scoring, forecasting, agents, visualization, etc.
│   ├── tests/                # Jest + Supertest, mongodb-memory-server
│   ├── data/                 # static reference data (e.g. country centroids)
│   ├── index.js
│   └── package.json
│
├── .github/workflows/ci.yml
├── README.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── TODO.md
├── docker-compose.yml
├── render.yaml
└── .env.example
```

---

# 📥 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/Diya-R-Gowda/SupplyLens.git
cd SupplyLens
```

## 2. Configure Environment

Copy `.env.example` to `.env` at the **repo root** and fill in real values (the server loads it from `../.env` relative to itself):

```bash
cp .env.example .env
```

See `.env.example` for the full list (`MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `CURRENTS_API_KEY`, `CORS_ORIGIN`, `LOG_LEVEL`, `VITE_API_BASE_URL`). If `MONGO_URI` is left unset, the server runs in a demo mode with canned in-memory data - useful for trying the app without a cluster.

## 3. Run with Docker Compose (fastest way to try it)

```bash
docker compose up --build
```

This starts MongoDB, the API server (`:5000`), and the built frontend (`:8080`) together.

## 4. Or Run Locally (server + frontend separately)

```bash
cd server
npm install
npm run dev        # nodemon, http://localhost:5000

# in another terminal
cd frontend
npm install
npm run dev         # Vite dev server, http://localhost:5173
```

---

# 🧪 Testing & CI

```bash
cd server
npm test            # Jest + Supertest against a real, ephemeral mongod (mongodb-memory-server)
```

GitHub Actions (`.github/workflows/ci.yml`) runs the full server test suite and a frontend build check on every push and PR to `main`.

A separate workflow (`.github/workflows/docker-publish.yml`) builds and publishes both Docker images to GitHub Container Registry on every push of a `v*.*.*` tag - `ghcr.io/<owner>/supplylens-server` and `ghcr.io/<owner>/supplylens-frontend`, each tagged with the release version and `latest`.

---

# 🧠 MongoDB Vector Search Configuration

SupplyLens uses MongoDB Atlas Vector Search for semantic document retrieval.

Create a **Vector Search Index** named `default` on the `docchunks` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "supplierId"
    }
  ]
}
```

---

# 📊 Risk & Health Scoring

Suppliers get two distinct, per-org-configurable scores (`PATCH /org/risk-config`), each a weighted combination of real signals - news sentiment, contract/document completeness, ESG, logistics, and country risk - with deterministic plain-language explanations of every change. Defaults match the original build's formulas; full mechanics are documented in [ARCHITECTURE.md](ARCHITECTURE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

---

# 🔄 Background Jobs

Node Cron automatically performs scheduled tasks:

- 📰 Fetch supplier news
- 😊 Analyze sentiment using Gemini
- 📊 Recalculate supplier risk & health scores
- 📸 Take daily supplier snapshots

---

# 🔒 Security & Access Control

- JWT authentication with rotating refresh tokens
- Password hashing with Bcrypt
- Role-based access control (`admin` / `viewer`) enforced on every mutating route, including admin-managed team membership (`POST /org/invite-user` to add a member, `PATCH /org/users/:userId/role` to promote/demote an existing one)
- Org-scoped data access enforced on every route (verified with cross-org isolation tests)
- Security headers via Helmet, rate limiting via express-rate-limit
- Audit logs for sensitive admin actions

---

# 🌟 Remaining / Future Work

See [TODO.md](TODO.md) for the full, honest list of open items and known limitations. Highlights:

- Actual live deployment - `render.yaml` and Docker are ready; going live needs a real Render account/billing decision only you can make
- A true multi-tier dependency graph, if real supplier-to-supplier relationship data is ever captured
- Alert-breach notifications are email-only for now; SMS is a real but unbuilt v2 candidate
- Team invites and role changes are admin-direct-action only — no self-service email invite/accept flow yet

---

# 📸 Screenshots

> Add screenshots here after deployment.

```
Dashboard
Supplier Digital Twin
RAG Chat
Risk & Health Trends
Concentration Graph / Geographic Map
Multi-Agent Analysis
```

---

# 📄 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

**Diya Gowda**

Built as an AI-powered SaaS project demonstrating:

- Full Stack Development (React 19 + Express 5)
- MongoDB Vector Search & GridFS
- Retrieval-Augmented Generation (RAG)
- Google Gemini Integration (generation, embeddings, multi-agent synthesis)
- Explainable, configurable risk/health scoring
- Predictive analytics & anomaly detection
- Automated testing, CI, and containerized deployment
- Production-ready SaaS Architecture with RBAC and audit logging

⭐ If you found this project useful, consider giving it a star!
