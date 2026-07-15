import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/index.js';

export const REMINDER_QUEUE_NAME = 'reminders';

function buildConnection(maxRetriesPerRequest: number | null, enableOfflineQueue: boolean): IORedis {
  // ponytail: ioredis is BullMQ's expected client — separate from the node-redis singleton used elsewhere.
  // Worker uses maxRetriesPerRequest=null (required by BullMQ for blocking commands BLPOP/BRPOPLPUSH)
  // and the offline queue enabled, so it resumes automatically once Redis returns.
  // Queue disables the offline queue (enableOfflineQueue:false) so .add() REJECTS IMMEDIATELY when
  // Redis is down instead of sitting in ioredis's offline buffer forever (which would otherwise
  // stall reminder creation). The catch in enqueueReminderSend turns that into a clean `false`.
  const conn = new IORedis(config.redisUrl, {
    maxRetriesPerRequest,
    enableOfflineQueue,
    ...(maxRetriesPerRequest === null ? {} : { connectTimeout: 1500 }),
  });
  // Swallow connection errors so a missing/down Redis never crashes the process;
  // ioredis retries automatically and the worker resumes once Redis is back.
  conn.on('error', (err) => console.warn('[ReminderQueue] Redis connection error:', err.message));
  return conn;
}

let queueConnection: IORedis | null = null;
function getQueueConnection(): IORedis {
  if (!queueConnection) queueConnection = buildConnection(2, false);
  return queueConnection;
}

let workerConnection: IORedis | null = null;
function getWorkerConnection(): IORedis {
  if (!workerConnection) workerConnection = buildConnection(null, true);
  return workerConnection;
}

let queue: Queue | null = null;
export function getQueue() {
  if (!queue) {
    queue = new Queue(REMINDER_QUEUE_NAME, {
      connection: getQueueConnection() as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return queue;
}

// ponytail: returns false (not throws) when Redis is unavailable so reminder
// creation never 500s on a queue blip — the reminder stays PENDING and the
// worker/sweep flushes it once Redis is back.
const ENQUEUE_TIMEOUT_MS = 2000;
let queueDownWarned = false;
export async function enqueueReminderSend(reminderId: string, sendAt: Date): Promise<boolean> {
  const delayMs = Math.max(0, sendAt.getTime() - Date.now());
  try {
    // ponytail: race the enqueue against a hard timeout. BullMQ's Queue.add()
    // waits for the connection to become ready and does NOT honour ioredis's
    // enableOfflineQueue, so with Redis down it would otherwise hang forever and
    // stall reminder creation. The timeout guarantees a bounded, non-blocking path.
    await Promise.race([
      getQueue().add('send', { reminderId }, { delay: delayMs }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`enqueue timed out after ${ENQUEUE_TIMEOUT_MS}ms`)), ENQUEUE_TIMEOUT_MS)
      ),
    ]);
    return true;
  } catch (err) {
    if (!queueDownWarned) {
      console.warn('[ReminderQueue] Redis unavailable — reminder left PENDING for sweep:', (err as Error).message);
      queueDownWarned = true;
    }
    return false;
  }
}

export function startReminderWorker(handler: (reminderId: string) => Promise<unknown>) {
  const worker = new Worker(
    REMINDER_QUEUE_NAME,
    async (job) => handler(job.data.reminderId),
    { connection: getWorkerConnection() as any, concurrency: 5 }
  );

  worker.on('ready', () => console.log('[ReminderWorker] ready, draining queue'));
  worker.on('completed', (job) => console.log(`[ReminderWorker] job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[ReminderWorker] job ${job?.id} failed:`, err.message));
  worker.on('error', (err) => console.error('[ReminderWorker] error:', err.message));

  return worker;
}
