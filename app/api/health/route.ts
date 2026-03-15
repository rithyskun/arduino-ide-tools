import { connectDB, isConnected } from '@/lib/db/mongoose';

export async function GET() {
  try {
    await connectDB();
    return Response.json({
      success: true,
      db: isConnected() ? 'connected' : 'disconnected',
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { success: false, db: 'error', error: (err as Error).message },
      { status: 503 }
    );
  }
}
