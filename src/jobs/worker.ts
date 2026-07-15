import { startReminderWorker } from './queue.js';
import { reminderProcessor } from '../notifications/reminder-processor.js';

console.log('[Worker] starting reminder worker...');

const worker = startReminderWorker((reminderId) =>
  reminderProcessor.processOneReminder(reminderId)
);

const shutdown = async (signal: string) => {
  console.log(`[Worker] received ${signal}, draining in-flight jobs...`);
  // ponytail: guard close — if Redis is down the connection close can reject
  try { await worker.close(); } catch (e) { console.warn('[Worker] close error:', (e as Error)?.message); }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
