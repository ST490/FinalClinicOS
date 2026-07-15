import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { appointmentService } from './appointment.service.js';
import { authenticate, loadUserRoles, requireClinicAccess } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';
import express from 'express';

const router = express.Router();

async function verifyAppointmentAccess(req: Request, res: Response): Promise<any> {
  const appt = await appointmentService.findById(req.params.id as string);
  if (!appt) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    return null;
  }

  // Tenant check
  if (req.user!.isOrgOwner) {
    if (appt.orgId !== req.user!.orgId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return null;
    }
  } else {
    const hasAccess = req.user!.roles.some(r => r.clinicId === appt.clinicId);
    if (!hasAccess) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return null;
    }
  }
  return appt;
}

const createSchema = z.object({
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  type: z.enum(['SCHEDULED', 'WALK_IN']).optional().default('SCHEDULED'),
  notes: z.string().optional(),
  isNewPatient: z.boolean().optional(),
  category: z.enum(['FIRST_TIME', 'RETURNING', 'FREE_CHECKUP']).optional().default('RETURNING'),
});

const updateSchema = z.object({
  slotStart: z.string().datetime().optional(),
  slotEnd: z.string().datetime().optional(),
  status: z.enum(['BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  queuePosition: z.number().int().positive().optional(),
  type: z.enum(['SCHEDULED', 'WALK_IN']).optional(),
  category: z.enum(['FIRST_TIME', 'RETURNING', 'FREE_CHECKUP']).optional(),
});

const searchSchema = z.object({
  clinicId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(['BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  type: z.enum(['SCHEDULED', 'WALK_IN']).optional(),
  category: z.enum(['FIRST_TIME', 'RETURNING', 'FREE_CHECKUP']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(1000).optional().default(20),
});

function checkPerm(permission: Permission) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!_req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    if (_req.user.isOrgOwner) { next(); return; }
    const roles = _req.user.roles.map(r => r.role);
    if (!hasPermission(roles, permission)) {
      res.status(403).json({ error: { code: 'FORBIDDEN' } });
      return;
    }
    next();
  };
}

// POST /appointments
router.post('/appointments', authenticate, loadUserRoles, checkPerm('appointment:create'), requireClinicAccess, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const appt = await appointmentService.create({ ...data, createdById: req.user!.id });
    res.status(201).json(appt);
  } catch (e) { next(e); }
});

// GET /appointments
router.get('/appointments', authenticate, loadUserRoles, checkPerm('appointment:read'), requireClinicAccess, async (req, res, next) => {
  try {
    const data = searchSchema.parse(req.query);
    const result = await appointmentService.search(data);
    res.json(result);
  } catch (e) { next(e); }
});

// GET /appointments/:id
router.get('/appointments/:id', authenticate, loadUserRoles, checkPerm('appointment:read'), async (req, res, next) => {
  try {
    const appt = await verifyAppointmentAccess(req, res);
    if (!appt) return;
    res.json(appt);
  } catch (e) { next(e); }
});

// PATCH /appointments/:id
router.patch('/appointments/:id', authenticate, loadUserRoles, checkPerm('appointment:update'), async (req, res, next) => {
  try {
    const appt = await verifyAppointmentAccess(req, res);
    if (!appt) return;
    const data = updateSchema.parse(req.body);
    const updated = await appointmentService.update(req.params.id as string, data);
    res.json(updated);
  } catch (e) { next(e); }
});

// DELETE /appointments/:id (cancel)
router.delete('/appointments/:id', authenticate, loadUserRoles, checkPerm('appointment:cancel'), async (req, res, next) => {
  try {
    const appt = await verifyAppointmentAccess(req, res);
    if (!appt) return;
    const cancelled = await appointmentService.cancel(req.params.id as string, req.user!.id);
    res.json(cancelled);
  } catch (e) { next(e); }
});

// GET /appointments/availability/:clinicId/:doctorId?date=YYYY-MM-DD
router.get('/appointments/availability/:clinicId/:doctorId', authenticate, loadUserRoles, checkPerm('appointment:read'), requireClinicAccess, async (req, res, next) => {
  try {
    const { clinicId, doctorId } = req.params as { clinicId: string; doctorId: string };
    const date = req.query.date as string;
    if (!date) { res.status(400).json({ error: { code: 'DATE_REQUIRED' } }); return; }
    const slots = await appointmentService.getDoctorAvailability({ clinicId, doctorId, date });
    res.json(slots);
  } catch (e) { next(e); }
});

// GET /appointments/schedule/:clinicId/:doctorId
router.get('/appointments/schedule/:clinicId/:doctorId', authenticate, loadUserRoles, checkPerm('appointment:read'), requireClinicAccess, async (req, res, next) => {
  try {
    const schedule = await appointmentService.getDoctorSchedule(req.params.clinicId as string, req.params.doctorId as string);
    res.json(schedule);
  } catch (e) { next(e); }
});

export default router;