# ArduinoSim — In-Browser Arduino IDE + Simulator

> A full-stack web IDE with AVR simulation, Monaco editor, MongoDB user accounts, and persistent projects — all running in the browser.

[![CI](https://github.com/rithyskun/arduino-ide-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/rithyskun/arduino-ide-tools/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Deploy](https://img.shields.io/badge/Live-Vercel-black?logo=vercel)](https://arduino-ide-tools.vercel.app)

---

## ✨ Features

- 🖥️ **Monaco Editor** — VS Code-quality syntax highlighting for C/C++ Arduino sketches
- ⚡ **AVR Simulation** — Run sketches in-browser via `avr8js`
- 👤 **User Accounts** — Register, login, manage sessions with full JWT + DB session auth
- 💾 **Persistent Projects** — Auto-saves every 3 seconds to MongoDB
- 🔌 **Device Simulation** — Wire up virtual sensors and components
- 🌙 **Theme & Preferences** — Per-user font size, board defaults, and theme settings

---

## 🖼️ Screenshots

> *(Add screenshots here — e.g., editor view, simulator running, project dashboard)*

| Editor | Simulator | Dashboard |
|--------|-----------|-----------|
| ![editor](docs/screenshots/editor.png) | ![simulator](docs/screenshots/simulator.png) | ![dashboard](docs/screenshots/dashboard.png) |

---

## 🛠️ Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | MongoDB + Mongoose |
| Auth | NextAuth.js v4 (Credentials) + JWT + DB sessions |
| Editor | Monaco (`@monaco-editor/react`) |
| State | Zustand + Immer + localStorage |
| Styling | Tailwind CSS |
| Validation | Zod |
| Simulation | Interpreted JS engine + avr8js |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/rithyskun/arduino-ide-tools.git
cd arduino-ide-tools
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/arduino-ide
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=<run: openssl rand -base64 32>
```

### 3. Start MongoDB

**Option A — Local:**

```bash
# macOS
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

**Option B — MongoDB Atlas (free tier):**

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → create a free cluster
2. Create a DB user and get your connection string
3. Set `MONGODB_URI` in `.env.local`

### 4. Seed Test Data (Optional)

> ⚠️ **For development only. Never run this against a production database.**

```bash
npx ts-node --skip-project scripts/seed.ts
```

| Email | Password | Role |
|---|---|---|
| admin@arduinosim.dev | Admin123 | admin |
| demo@arduinosim.dev | Demo1234 | user |

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
arduino-ide-tools/
├── app/                  # Next.js App Router pages & API routes
│   └── api/              # REST API handlers
├── components/           # Reusable React components
├── lib/                  # Shared utilities (db connection, auth helpers)
├── types/                # TypeScript type definitions
├── scripts/              # Dev scripts (seed, migrations)
├── test-project-files/   # Sample Arduino sketches
└── docs/                 # Guides and documentation
```

---

## 🔌 API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ✗ | Create account + starter project |
| POST | `/api/auth/[...nextauth]` | ✗ | Login (NextAuth credentials) |
| POST | `/api/auth/logout` | ✓ | Revoke session + clear cookie |
| GET | `/api/user` | ✓ | Current user profile |
| PATCH | `/api/user` | ✓ | Update profile / change password |
| GET | `/api/user/sessions` | ✓ | List active sessions |
| DELETE | `/api/user/sessions` | ✓ | Revoke all sessions |
| GET | `/api/projects` | ✓ | List projects (paginated, searchable) |
| POST | `/api/projects` | ✓ | Create project |
| GET | `/api/projects/:id` | ✓ | Get full project with files |
| PATCH | `/api/projects/:id` | ✓ | Save project (files + metadata) |
| DELETE | `/api/projects/:id` | ✓ | Delete project |
| GET | `/api/health` | ✗ | DB connection health check |

---

## 🔐 Auth Flow

```
Register → bcrypt hash → JWT + DB Session → HttpOnly cookie → /dashboard
Login    → comparePassword → JWT + Session → cookie → /dashboard
IDE      → auth guard → load project → auto-save every 3s
Logout   → revoke DB session → clear cookie → /login
```

**Security highlights:** bcrypt(12), JWT HS256 HttpOnly, jti stored as SHA-256 hash, Zod validation on all inputs, `passwordHash` never returned by default.

---

## 🗄️ MongoDB Schema

**Users** — `email` (unique), `username` (unique), `passwordHash` (bcrypt, `select:false`), `displayName`, `bio`, `preferences { defaultBoard, fontSize, theme, autoSave }`, `stats { projectCount, lastActiveAt }`, `role`, `emailVerified`, `isActive`

**Projects** — `owner → User`, `name`, `description`, `boardId`, `files [{ name, content, language, readonly }]`, `devices [{ instanceId, deviceType, label, config, pinMapping, values }]`, `tags`, `isPublic`, `forkCount`, `starCount`, `lastOpenedAt`

**Sessions** — `userId → User`, `token` (hashed jti), `userAgent`, `ipAddress`, `expiresAt` (TTL auto-delete), `lastUsedAt`, `isRevoked`

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

---

## 📄 License

[MIT](./LICENSE) © 2026 rithyskun