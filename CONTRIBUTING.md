# Contributing to SupplyLens

Thank you for your interest in contributing to SupplyLens!

We welcome contributions that improve functionality, fix bugs, enhance documentation, or introduce new features aligned with our mission of intelligent supplier risk management.

---

# Table of Contents

- Code of Conduct
- Getting Started
- Development Setup
- Project Structure
- Branch Naming
- Commit Guidelines
- Pull Request Process
- Coding Standards
- Reporting Bugs
- Suggesting Features
- Documentation
- License

---

# Code of Conduct

Be respectful and professional.

We expect contributors to:

- Be respectful during discussions.
- Write clean and maintainable code.
- Provide constructive feedback.
- Help maintain a welcoming environment.

---

# Getting Started

## 1. Fork the repository

Click **Fork** on GitHub.

## 2. Clone your fork

```bash
git clone https://github.com/<your-username>/SupplyLens.git
cd SupplyLens
```

## 3. Install dependencies

Frontend

```bash
cd client
npm install
```

Backend

```bash
cd ../server
npm install
```

## 4. Configure environment variables

Create

```
server/.env
```

Example

```
PORT=5000

MONGO_URI=your_mongodb_connection

JWT_SECRET=your_secret

GOOGLE_API_KEY=your_api_key
```

---

# Running the project

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
    src/
    public/

server/
    controllers/
    routes/
    middleware/
    models/
    services/
    utils/

README.md
CONTRIBUTING.md
```

---

# Branch Naming

Use descriptive branch names.

Examples

```
feature/sentiment-analysis

feature/risk-dashboard

bugfix/login-error

docs/readme-update

refactor/auth-service
```

---

# Commit Guidelines

Use Conventional Commits.

Examples

```
feat: add supplier similarity search

fix: resolve JWT authentication issue

docs: improve README

refactor: optimize sentiment service

test: add supplier API tests
```

---

# Coding Standards

## JavaScript

- Use ES6+
- Prefer const over let where possible.
- Avoid unnecessary nesting.
- Use async/await instead of promise chains.

## React

- Functional components
- Hooks
- Reusable components
- Avoid duplicated UI

## Backend

- Separate controllers, routes, and services.
- Validate all inputs.
- Return meaningful HTTP status codes.

---

# Pull Request Process

Before submitting a PR:

- Sync with the latest main branch.
- Ensure the project builds successfully.
- Test your changes.
- Update documentation if needed.
- Keep pull requests focused on a single feature or fix.

PR template:

### Description

Explain what changed.

### Motivation

Why was this change needed?

### Testing

Describe how you tested it.

### Screenshots

If applicable.

---

# Reporting Bugs

Please include:

- Operating System
- Browser
- Node.js version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if available

---

# Feature Requests

Include:

- Problem statement
- Proposed solution
- Alternative approaches
- Additional context

---

# Documentation

Good documentation is as valuable as code.

Contributions improving:

- README
- API documentation
- Setup instructions
- Architecture diagrams

are always appreciated.

---

# License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

Thank you for helping improve SupplyLens!
