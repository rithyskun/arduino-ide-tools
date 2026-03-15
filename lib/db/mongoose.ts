import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI is not defined. Add it to .env.local:\n' +
      '  MONGODB_URI=mongodb://localhost:27017/arduino-ide'
  );
}

// Silence Mongoose 7 strictQuery deprecation
mongoose.set('strictQuery', true);

// ── Module-level cache — survives Next.js hot reloads ─────────────
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__mongooseCache ?? {
  conn: null,
  promise: null,
};
if (!global.__mongooseCache) global.__mongooseCache = cache;

// ── Connect ───────────────────────────────────────────────────────
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI as string, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // allow retry on next request
    throw err;
  }

  return cache.conn;
}

// ── Health ────────────────────────────────────────────────────────
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
