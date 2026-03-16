#!/usr/bin/env tsx

import { logger } from '../lib/logger';

async function cleanupLogs() {
  try {
    console.log('Starting log cleanup...');
    await logger.cleanupOldLogs(7); // Keep logs for 7 days
    console.log('Log cleanup completed successfully.');
  } catch (error) {
    console.error('Log cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupLogs();
}

export { cleanupLogs };
