# ArduinoSim — Next.js IDE + Simulator

A full-stack in-browser Arduino IDE with AVR simulation, **MongoDB** user accounts, session management, and persistent projects.

---

## Stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Framework  | Next.js 14 App Router                            |
| Database   | MongoDB + Mongoose                               |
| Auth       | NextAuth.js v4 (Credentials) + JWT + DB sessions |
| Editor     | Monaco (`@monaco-editor/react`)                  |
| State      | Zustand + Immer + localStorage                   |
| Styling    | Tailwind CSS                                     |
| Validation | Zod                                              |
| Simulation | Interpreted JS engine + avr8js hook              |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/arduino-ide
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=<run: openssl rand -base64 32>
```

### 3. Start MongoDB

**Option A — Local MongoDB:**

```bash
# macOS
brew services start mongodb-community
# Ubuntu
sudo systemctl start mongod
# Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

**Option B — MongoDB Atlas (free):**

1. https://cloud.mongodb.com → create free cluster
2. Create DB user, get connection string
3. Set MONGODB_URI in .env.local

### 4. Seed test data

```bash
npx ts-node --skip-project scripts/seed.ts
```

| Email                | Password | Role  |
| -------------------- | -------- | ----- |
| admin@arduinosim.dev | Admin123 | admin |
| demo@arduinosim.dev  | Demo1234 | user  |

### 5. Run

```bash
npm run dev
# open http://localhost:3000
```

---

## MongoDB Schema

### Users

```
email (unique), username (unique), passwordHash (bcrypt, select:false),
displayName, bio, preferences{defaultBoard, fontSize, theme, autoSave},
stats{projectCount, lastActiveAt}, role, emailVerified, isActive
```

### Projects

```
owner→User, name, description, boardId,
files[{name, content, language, readonly}],
devices[{instanceId, deviceType, label, config, pinMapping, values}],
tags, isPublic, forkCount, starCount, lastOpenedAt
```

### Sessions

```
userId→User, token (hashed jti), userAgent, ipAddress,
expiresAt (TTL auto-delete), lastUsedAt, isRevoked
```

---

## API Routes

| Method | Path                    | Auth | Description                           |
| ------ | ----------------------- | ---- | ------------------------------------- |
| POST   | /api/auth/register      | ✗    | Create account + starter project      |
| POST   | /api/auth/[...nextauth] | ✗    | Login (NextAuth credentials)          |
| POST   | /api/auth/logout        | ✓    | Revoke session + clear cookie         |
| GET    | /api/user               | ✓    | Current user profile                  |
| PATCH  | /api/user               | ✓    | Update profile / change password      |
| GET    | /api/user/sessions      | ✓    | List active sessions                  |
| DELETE | /api/user/sessions      | ✓    | Revoke all sessions                   |
| GET    | /api/projects           | ✓    | List projects (paginated, searchable) |
| POST   | /api/projects           | ✓    | Create project                        |
| GET    | /api/projects/:id       | ✓    | Get full project with files           |
| PATCH  | /api/projects/:id       | ✓    | Save project (files + metadata)       |
| DELETE | /api/projects/:id       | ✓    | Delete project                        |
| GET    | /api/health             | ✗    | DB connection health check            |

---

## Auth Flow

```
Register → bcrypt hash → JWT + DB Session → HttpOnly cookie → /dashboard
Login    → comparePassword → JWT + Session → cookie → /dashboard
IDE      → auth guard → load project → auto-save every 3s
Logout   → revoke DB session → clear cookie → /login
```

Security: bcrypt(12), JWT HS256 HttpOnly, jti stored as SHA-256 hash,
Zod validation on all inputs, passwordHash never returned by default.
