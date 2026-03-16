# Contributing to ArduinoSim

Thank you for your interest in contributing! This guide will help you get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

Be respectful and constructive. Harassment of any kind will not be tolerated.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)
- Git

### Local Setup

```bash
# 1. Fork and clone the repo
git clone https://github.com/<your-username>/arduino-ide-tools.git
cd arduino-ide-tools

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and secrets

# 4. Seed test data (optional)
npx ts-node --skip-project scripts/seed.ts

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to verify it's running.

---

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-description
   ```

2. **Make your changes** — keep commits small and focused.

3. **Lint and type-check** before pushing:
   ```bash
   npm run lint
   npm run type-check
   ```

4. **Format your code**:
   ```bash
   npm run format
   ```

5. **Push and open a Pull Request** against `main`.

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/...` | `feat/dark-mode` |
| Bug fix | `fix/...` | `fix/session-expiry` |
| Docs | `docs/...` | `docs/api-reference` |
| Refactor | `refactor/...` | `refactor/auth-flow` |
| Chore | `chore/...` | `chore/upgrade-deps` |

---

## Project Structure

```
arduino-ide-tools/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST API handlers
│   └── (routes)/         # Page components
├── components/           # Reusable React components
├── lib/                  # Shared utilities (db, auth helpers, etc.)
├── types/                # TypeScript type definitions
├── scripts/              # One-off scripts (seeding, migrations)
├── test-project-files/   # Sample Arduino project files
└── docs/                 # Documentation and guides
```

---

## Submitting Changes

### Pull Request Checklist

Before opening a PR, confirm:

- [ ] Code builds without errors (`npm run build`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] PR description explains *what* and *why*
- [ ] Related issues are linked (e.g., `Closes #42`)

### PR Description Template

```
## What does this PR do?
<!-- Brief summary -->

## Why is this change needed?
<!-- Context / motivation -->

## How was this tested?
<!-- Manual steps or automated tests -->

## Related issues
<!-- Closes #XX -->
```

---

## Coding Standards

- **TypeScript** — all new code must be typed. Avoid `any`.
- **Zod** — validate all external inputs (API request bodies, query params).
- **Components** — prefer small, single-responsibility components.
- **API routes** — always return consistent error shapes:
  ```json
  { "error": "Human-readable message" }
  ```
- **Environment secrets** — never hardcode secrets; always use `.env.local`.
- **Comments** — explain *why*, not *what*.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark mode toggle
fix: resolve session token expiry bug
docs: update README quick start
chore: upgrade next.js to 14.2
```

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/rithyskun/arduino-ide-tools/issues) and include:

- A clear title
- Steps to reproduce
- Expected vs. actual behavior
- Browser, OS, and Node.js version
- Any relevant console errors or screenshots

---

## Requesting Features

Open an issue with the label `enhancement` and describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

---

## Questions?

Open a [Discussion](https://github.com/rithyskun/arduino-ide-tools/discussions) or start a thread in Issues. We're happy to help!
