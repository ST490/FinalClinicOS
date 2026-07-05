import express from 'express';
import { z } from 'zod';
import { UserRoleType } from '@prisma/client';
import { staffService } from './staff.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

const inviteSchema = z.object({
  orgId: z.string().uuid(),
  clinicId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRoleType),
});

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
});

const roleSchema = z.object({
  clinicId: z.string().uuid(),
  role: z.nativeEnum(UserRoleType),
  isPrimary: z.boolean().optional(),
});

const scheduleSchema = z.object({
  clinicId: z.string().uuid(),
  userId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

function checkPerm(permission: Permission) {
  return (_req: any, _res: any, next: any): void => {
    if (!_req.user) { _res.status(401).json({ error: { code: 'UNAUTHORIZED' } }); return; }
    if (_req.user.isOrgOwner) { next(); return; }
    if (!hasPermission(_req.user.roles.map((r: any) => r.role), permission)) {
      _res.status(403).json({ error: { code: 'FORBIDDEN' } }); return;
    }
    next();
  };
}

// Invite
router.post('/staff/invite', authenticate, loadUserRoles, checkPerm('staff:invite'), async (req, res, next) => {
  try {
    const result = await staffService.invite({ ...inviteSchema.parse(req.body), invitedById: req.user!.id });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

// Accept invite (public)
router.post('/staff/accept', async (req, res, next) => {
  try {
    const result = await staffService.acceptInvite(acceptSchema.parse(req.body));
    res.status(201).json(result);
  } catch (e) { next(e); }
});

// List staff
router.get('/staff', authenticate, loadUserRoles, checkPerm('staff:read'), async (req, res, next) => {
  try {
    const staff = await staffService.searchStaff(req.query.clinicId as string);
    res.json(staff);
  } catch (e) { next(e); }
});

// Get one staff
router.get('/staff/:userId', authenticate, loadUserRoles, checkPerm('staff:read'), async (req, res, next) => {
  try {
    const staff = await staffService.getStaffById(req.params.userId as string);
    if (!staff) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    res.json(staff);
  } catch (e) { next(e); }
});

// Update role
router.patch('/staff/:userId/role', authenticate, loadUserRoles, checkPerm('staff:manage'), async (req, res, next) => {
  try {
    const role = await staffService.updateRole(req.params.userId as string, roleSchema.parse(req.body));
    res.json(role);
  } catch (e) { next(e); }
});

// Deactivate
router.delete('/staff/:userId', authenticate, loadUserRoles, checkPerm('staff:delete'), async (req, res, next) => {
  try {
    await staffService.deactivateStaff(req.params.userId as string, req.query.clinicId as string);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Schedules
router.post('/staff/schedules', authenticate, loadUserRoles, checkPerm('staff:manage'), async (req, res, next) => {
  try {
    const schedule = await staffService.setSchedule(scheduleSchema.parse(req.body));
    res.status(201).json(schedule);
  } catch (e) { next(e); }
});

router.get('/staff/:userId/schedules', authenticate, loadUserRoles, checkPerm('staff:read'), async (req, res, next) => {
  try {
    const schedules = await staffService.getSchedules(req.params.userId as string, req.query.clinicId as string);
    res.json(schedules);
  } catch (e) { next(e); }
});

export default router;