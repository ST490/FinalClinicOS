import express from 'express';
import { z } from 'zod';
import { reminderService } from './reminder.service.js';
import { authenticate, loadUserRoles, requireClinicAccess } from '../auth/middleware/index.js';
import twilio from 'twilio';
import { config } from '../config/index.js';

const router = express.Router();

const createSchema = z.object({
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL']),
  templateId: z.string().min(1),
  templateData: z.record(z.string()).optional(),
  scheduledAt: z.string().datetime(),
});

const searchSchema = z.object({
  clinicId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  status: z.string().optional(),
  channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const webhookSchema = z.object({
  messageId: z.string().min(1),
  status: z.enum(['SENT', 'DELIVERED', 'READ', 'FAILED']),
  timestamp: z.string().optional(),
  error: z.string().optional(),
});

// Twilio signs every webhook request with an HMAC over the URL + POST params.
// Reject anything that doesn't verify — the old endpoint trusted any caller.
function verifyTwilioWebhook(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const signature = req.headers['x-twilio-signature'] as string | undefined;
  const authToken = config.twilio.authToken;
  if (!authToken || !signature) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Webhook signature required' } });
    return;
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const url = `${proto}://${req.headers.host}${req.originalUrl}`;
  if (!twilio.validateRequest(authToken, signature, url, req.body as Record<string, string>)) {
    res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } });
    return;
  }
  next();
}

// Create reminder (staff trigger)
router.post('/reminders', authenticate, loadUserRoles, async (req, res, next) => {
  try {
    const reminder = await reminderService.create(createSchema.parse(req.body));
    res.status(201).json(reminder);
  } catch (e) { next(e); }
});

// Search reminders
router.get('/reminders', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const result = await reminderService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

// Get pending reminders (for queue processor)
router.get('/reminders/pending/:clinicId', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const reminders = await reminderService.getPendingReminders(req.params.clinicId as string);
    res.json(reminders);
  } catch (e) { next(e); }
});

// WhatsApp BSP webhook
router.post('/webhooks/whatsapp-status', verifyTwilioWebhook, async (req, res, next) => {
  try {
    const { messageId, status, error } = webhookSchema.parse(req.body);
    await reminderService.updateStatus(messageId, status, error);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;