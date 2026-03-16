/**
 * scripts/ensure-indexes.ts
 *
 * Run once after deploying to a new environment, or add to your CI post-deploy step:
 *   npm run db:indexes
 *
 * Ensures all required MongoDB indexes exist. Safe to re-run — createIndex is idempotent.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');

async function ensureIndexes() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  console.log('📦 Ensuring indexes...\n');

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true, background: true });
  await users.createIndex({ username: 1 }, { unique: true, background: true });
  await users.createIndex({ role: 1, isActive: 1 }, { background: true });
  console.log('✅ users indexes ensured');

  // ── Projects ──────────────────────────────────────────────────────────────
  const projects = db.collection('projects');
  // Primary query pattern: list projects for a user, sorted by recent activity
  await projects.createIndex(
    { owner: 1, lastOpenedAt: -1 },
    { background: true }
  );
  await projects.createIndex(
    { owner: 1, updatedAt: -1 },
    { background: true }
  );
  // Name uniqueness per user (application-level check + DB-level guarantee)
  await projects.createIndex(
    { owner: 1, name: 1 },
    { unique: true, background: true }
  );
  // Public project discovery
  await projects.createIndex(
    { isPublic: 1, starCount: -1 },
    { background: true }
  );
  // Tag filtering
  await projects.createIndex({ tags: 1 }, { background: true });
  console.log('✅ projects indexes ensured');

  // ── Sessions ──────────────────────────────────────────────────────────────
  const sessions = db.collection('sessions');
  // TTL index: MongoDB auto-deletes expired sessions
  await sessions.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true }
  );
  // Auth lookup: find active sessions by userId
  await sessions.createIndex(
    { userId: 1, isRevoked: 1 },
    { background: true }
  );
  // Token lookup (hashed jti)
  await sessions.createIndex({ token: 1 }, { unique: true, background: true });
  console.log('✅ sessions indexes ensured');

  console.log('\n🎉 All indexes ensured successfully.');
  await mongoose.disconnect();
}

ensureIndexes().catch((err) => {
  console.error('❌ Failed to ensure indexes:', err);
  process.exit(1);
});