import express from 'express';
import { z } from 'zod';
import { attendanceService } from './attendance.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

const clockInSchema = z.object({
  clinicId: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().optional(),
  checkIn: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: z.enum(['PRESENT', 'LATE', 'HALF_DAY', 'LEAVE']).optional(),
  notes: z.string().optional(),
});

const clockOutSchema = z.object({
  checkOut: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const searchSchema = z.object({
  clinicId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  status: z.enum(['PRESENT', 'LATE', 'HALF_DAY', 'LEAVE', 'ABSENT']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
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

router.post('/attendance/clock-in', authenticate, loadUserRoles, checkPerm('attendance:manage'), async (req, res, next) => {
  try {
    const attendance = await attendanceService.clockIn({ ...clockInSchema.parse(req.body), recordedById: req.user!.id });
    res.status(201).json(attendance);
  } catch (e) { next(e); }
});

router.post('/attendance/:id/clock-out', authenticate, loadUserRoles, checkPerm('attendance:manage'), async (req, res, next) => {
  try {
    const attendance = await attendanceService.clockOut(req.params.id as string, { ...clockOutSchema.parse(req.body), recordedById: req.user!.id });
    res.json(attendance);
  } catch (e) { next(e); }
});

router.get('/attendance', authenticate, loadUserRoles, checkPerm('attendance:read'), async (req, res, next) => {
  try {
    const result = await attendanceService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/attendance/today/:clinicId', authenticate, loadUserRoles, checkPerm('attendance:read'), async (req, res, next) => {
  try {
    const records = await attendanceService.getTodayAttendance(req.params.clinicId as string);
    res.json(records);
  } catch (e) { next(e); }
});

export default router;