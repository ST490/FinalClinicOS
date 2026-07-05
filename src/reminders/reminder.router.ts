import express from 'express';
import { z } from 'zod';
import { reminderService } from './reminder.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';

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

// Create reminder (staff trigger)
router.post('/reminders', authenticate, loadUserRoles, async (req, res, next) => {
  try {
    const reminder = await reminderService.create(createSchema.parse(req.body));
    res.status(201).json(reminder);
  } catch (e) { next(e); }
});

// Search reminders
router.get('/reminders', authenticate, loadUserRoles, async (req, res, next) => {
  try {
    const result = await reminderService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

// Get pending reminders (for queue processor)
router.get('/reminders/pending/:clinicId', authenticate, async (req, res, next) => {
  try {
    const reminders = await reminderService.getPendingReminders(req.params.clinicId as string);
    res.json(reminders);
  } catch (e) { next(e); }
});

// WhatsApp BSP webhook
router.post('/webhooks/whatsapp-status', async (req, res, next) => {
  try {
    const { messageId, status, error } = webhookSchema.parse(req.body);
    await reminderService.updateStatus(messageId, status, error);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;