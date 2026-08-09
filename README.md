# 🛡️ SupplyLens - SMB Supplier Risk Tracker

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)
![License](https://img.shields.io/badge/License-MIT-green)

SupplyLens is an **AI-powered SaaS application** that helps **Small and Medium Businesses (SMBs)** monitor, assess, and reduce supplier risks.

Unlike traditional supplier management tools, SupplyLens combines **CRUD operations**, **Retrieval-Augmented Generation (RAG)**, **AI-powered sentiment analysis**, and **automated risk scoring** into a single intelligent platform.

---

# 🚀 Why SupplyLens?

Modern supply chains are exposed to multiple risks—from contract expiry to negative media coverage.

SupplyLens helps businesses:

- 📦 Manage supplier information in one place
- 📄 Store and analyze supplier documents
- 🤖 Ask AI questions directly about uploaded contracts
- 📰 Monitor supplier-related news automatically
- 📊 Compute dynamic supplier risk scores
- 🚨 Receive alerts before contracts expire

---

# ✨ Features

## 📋 Core Management

### Supplier Registry
- Full CRUD operations
- Store supplier profiles
- Categorize suppliers
- Manage contact information

### Risk Dashboard
- Overall supplier risk overview
- Color-coded risk indicators
  - 🟢 Green
  - 🟡 Amber
  - 🔴 Red

### Document Vault
- Secure PDF upload
- Contract storage
- Audit reports
- Certifications

### Expiry Alerts
- Automatic contract expiry tracking
- Upcoming expiration reminders

---

# 🤖 AI & Intelligence

## 💬 RAG Chat (Flagship Feature)

Upload supplier contracts and ask natural language questions such as:

> "What are the penalty clauses?"

> "When does this contract expire?"

> "Who is responsible for delivery delays?"

Responses are grounded directly in the uploaded documents using **Retrieval-Augmented Generation (RAG)**, significantly reducing hallucinations.

---

## 📈 Risk Score Engine

Every supplier receives a nightly **0–100 risk score**.

### Risk Formula

| Factor | Weight |
|---------|---------|
| News Sentiment | 40% |
| Contract Expiry | 30% |
| Missing Compliance Documents | 20% |
| Country Risk | 10% |

---

## 📰 News Monitor

A scheduled background worker:

- Polls Currents API
- Finds supplier-related news
- Uses Google Gemini for sentiment analysis
- Updates supplier risk automatically

---

# 🛠️ Tech Stack

| Layer | Technology |
|--------|------------|
| **Frontend** | React, Vite, Tailwind CSS, Axios |
| **Backend** | Node.js, Express, Mongoose, Multer, Node-cron |
| **Database** | MongoDB Atlas (Vector Search) |
| **Authentication** | JWT, Bcryptjs |
| **AI Models** | Google Gemini 1.5 Flash, text-embedding-004 |
| **PDF Parsing** | pdf-parse |

---

# 🏗️ System Architecture

> For the real technical depth - actual route/service/job layout, the org-scoping security
> convention, and the honesty-framing decisions behind the AI features - see
> [ARCHITECTURE.md](ARCHITECTURE.md). For the full phase-by-phase build history, see
> [CONTRIBUTING.md](CONTRIBUTING.md). The diagram below is a simplified, high-level picture.

```
                   +----------------------+
                   |      React App       |
                   +----------+-----------+
                              |
                              |
                         REST API
                              |
                              ▼
                 +------------------------+
                 |   Express Backend      |
                 +------------------------+
                 | Authentication (JWT)   |
                 | Supplier CRUD          |
                 | PDF Upload             |
                 | Risk Engine            |
                 | RAG Service            |
                 +-----------+------------+
                             |
         +-------------------+------------------+
         |                                      |
         ▼                                      ▼
MongoDB Atlas                          Google Gemini API
(Vector Search)                  (Embeddings + Generation)

         ▲
         |
   Node Cron Jobs
         |
         ▼
Currents API + Sentiment Analysis
```

---

# 📁 Project Structure

```
SupplyLens/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   │
│   └── package.json
│
├── server/
│   ├── config/
│   ├── middleware/
│   ├── jobs/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── index.js
│   └── package.json
│
├── README.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── TODO.md
├── docker-compose.yml
├── render.yaml
└── .gitignore
```

---

# 📥 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/yourusername/supplylens.git

cd supplylens
```

---

# ⚙️ Backend Setup

Navigate to the server.

```bash
cd server
```

Install dependencies.

```bash
npm install
```

Create a `.env` file.

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

GEMINI_API_KEY=your_google_gemini_key

CURRENTS_API_KEY=your_currents_api_key
```

Run the backend.

```bash
node index.js
```

---

# 💻 Frontend Setup

Open another terminal.

```bash
cd client
```

Install dependencies.

```bash
npm install
```

Run Vite.

```bash
npm run dev
```

---

# 🧠 MongoDB Vector Search Configuration

SupplyLens uses MongoDB Atlas Vector Search for semantic document retrieval.

Create a **Vector Search Index** on the `doc_chunks` collection.

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

# 📊 Risk Scoring Formula

The supplier risk score is recalculated every night.

| Component | Weight |
|------------|---------|
| Negative News Sentiment | 40% |
| Contract Expiry | 30% |
| Missing Compliance Documents | 20% |
| Country Risk | 10% |

The final score ranges from **0 (Low Risk)** to **100 (High Risk)**.

---

# 🔄 Background Jobs

Node Cron automatically performs scheduled tasks:

- 📰 Fetch supplier news
- 😊 Analyze sentiment using Gemini
- 📊 Recalculate supplier risk scores
- ⏰ Check contract expiry

---

# 🔒 Authentication

SupplyLens uses:

- JWT Authentication
- Password hashing with Bcrypt
- Protected API routes

---

# 🌟 Future Improvements

- Email Notifications
- OCR Support
- Multi-language Contracts
- Supplier Performance Analytics
- Vendor Comparison Dashboard
- Live Risk Monitoring
- A real live deployment (Docker + a [Render blueprint](render.yaml) exist and are ready - see [TODO.md](TODO.md) for the account/billing step still needed)

---

# 📸 Screenshots

> Add screenshots here after deployment.

```
Dashboard

Supplier Details

RAG Chat

Risk Dashboard
```

---

# 📄 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

**Diya Gowda**

Built as an AI-powered SaaS project demonstrating:

- Full Stack Development
- MongoDB Vector Search
- Retrieval-Augmented Generation (RAG)
- Google Gemini Integration
- Background Workers
- REST APIs
- JWT Authentication
- Production-ready SaaS Architecture

⭐ If you found this project useful, consider giving it a star!
