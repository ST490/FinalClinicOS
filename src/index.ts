import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { prisma } from './config/database.js';
import { getRedisClient } from './config/redis.js';
import authRouter from './auth/auth.router.js';
import patientRouter from './patients/patient.router.js';
import appointmentRouter from './appointments/appointment.router.js';
import inventoryRouter from './inventory/inventory.router.js';
import orgRouter from './org/org.router.js';
import prescriptionRouter from './prescriptions/prescription.router.js';
import billingRouter from './billing/billing.router.js';
import staffRouter from './staff/staff.router.js';
import visitRouter from './visits/visit.router.js';
import attendanceRouter from './attendance/attendance.router.js';
import auditRouter from './audit/audit.router.js';
import reminderRouter from './reminders/reminder.router.js';
import reportRouter from './reports/report.router.js';
import medicineRouter from './medicines/medicine.router.js';

// ─────────────────────────────────────────────────────────────────────────────
// APP SETUP
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api', patientRouter);
app.use('/api', appointmentRouter);
app.use('/api', inventoryRouter);
app.use('/api', orgRouter);
app.use('/api', prescriptionRouter);
app.use('/api', billingRouter);
app.use('/api', staffRouter);
app.use('/api', visitRouter);
app.use('/api', attendanceRouter);
app.use('/api', auditRouter);
app.use('/api', reminderRouter);
app.use('/api', reportRouter);
app.use('/api', medicineRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.errors },
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Token expired' } });
    return;
  }

  // Custom auth errors
  if (err.message === 'Invalid credentials') {
    res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
    return;
  }

  // Prisma errors
  if (err.code === 'P2002') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Resource already exists' } });
    return;
  }

  // Generic error
  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: (err as any).code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
};

app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// SERVER START
// ─────────────────────────────────────────────────────────────────────────────

async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log(`✓ Database connected`);

    // Initialize Redis (non-blocking - rate limiter will fail open if unavailable)
    getRedisClient().catch(err => {
      console.warn(`⚠ Redis not available - rate limiting disabled: ${err.message}`);
    });

    // Start server
    app.listen(config.port, () => {
      console.log(`✓ Server running on http://localhost:${config.port}`);
      console.log(`  Mode: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

start();

export default app;