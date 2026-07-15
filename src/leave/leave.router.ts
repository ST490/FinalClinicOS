import express from 'express';
import { z } from 'zod';
import { leaveService } from './leave.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

const createSchema = z.object({
  clinicId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string().min(1),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().positive(),
  reason: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

const listSchema = z.object({
  clinicId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  type: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

const balancesSchema = z.object({
  clinicId: z.string().uuid(),
  year: z.coerce.number().optional(),
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

router.post('/leave', authenticate, loadUserRoles, checkPerm('leave:manage'), async (req, res, next) => {
  try {
    const leave = await leaveService.create(createSchema.parse(req.body));
    res.status(201).json(leave);
  } catch (e) { next(e); }
});

// Self-service: any authenticated user requests leave for themselves.
const selfRequestSchema = z.object({
  clinicId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string().min(1),
  reason: z.string().optional(),
});
router.post('/leave/request', authenticate, loadUserRoles, async (req, res, next) => {
  try {
    const body = selfRequestSchema.parse(req.body);
    const userId = req.user!.id;
    const leave = await leaveService.create({
      clinicId: body.clinicId,
      userId,
      type: body.type,
      fromDate: body.fromDate,
      toDate: body.toDate,
      days: Math.max(1, Math.round((new Date(body.toDate).getTime() - new Date(body.fromDate).getTime()) / 86400000) + 1),
      reason: body.reason,
    });
    res.status(201).json(leave);
  } catch (e) { next(e); }
});

router.get('/leave', authenticate, loadUserRoles, checkPerm('leave:read'), async (req, res, next) => {
  try {
    const result = await leaveService.list(listSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/leave/:id/status', authenticate, loadUserRoles, checkPerm('leave:manage'), async (req, res, next) => {
  try {
    const leave = await leaveService.updateStatus(req.params.id as string, {
      ...statusSchema.parse(req.body),
      reviewedById: req.user!.id,
    });
    res.json(leave);
  } catch (e) { next(e); }
});

router.get('/leave/balances', authenticate, loadUserRoles, checkPerm('leave:read'), async (req, res, next) => {
  try {
    const { clinicId, year } = balancesSchema.parse(req.query);
    const balances = await leaveService.balances(clinicId, year);
    res.json(balances);
  } catch (e) { next(e); }
});

export default router;
