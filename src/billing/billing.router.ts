import express from 'express';
import { z } from 'zod';
import { billingService } from './billing.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

const createDueSchema = z.object({
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER']).optional(),
  paymentNotes: z.string().optional(),
  amountPaid: z.number().min(0).optional(),
  appointmentId: z.string().uuid().optional(),
  prescriptionId: z.string().uuid().optional(),
});

const paymentSchema = z.object({
  amount: z.number().min(0.01),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER']).optional(),
  notes: z.string().optional(),
});

const waiveSchema = z.object({
  reason: z.string().min(1),
});

const searchSchema = z.object({
  clinicId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(['PAID', 'PARTIAL', 'DUE', 'WAIVED']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
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

router.post('/dues', authenticate, loadUserRoles, checkPerm('dues:manage'), async (req, res, next) => {
  try {
    const due = await billingService.createDue({ ...createDueSchema.parse(req.body), recordedById: req.user!.id });
    res.status(201).json(due);
  } catch (e) { next(e); }
});

router.get('/dues', authenticate, loadUserRoles, checkPerm('dues:read'), async (req, res, next) => {
  try {
    const result = await billingService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/dues/:id', authenticate, loadUserRoles, checkPerm('dues:read'), async (req, res, next) => {
  try {
    const due = await billingService.getDue(req.params.id as string);
    if (!due) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    res.json(due);
  } catch (e) { next(e); }
});

router.get('/dues/patient/:patientId/balance', authenticate, loadUserRoles, checkPerm('dues:read'), async (req, res, next) => {
  try {
    const balance = await billingService.getPatientBalance(req.params.patientId as string);
    res.json(balance);
  } catch (e) { next(e); }
});

router.post('/dues/:id/pay', authenticate, loadUserRoles, checkPerm('dues:manage'), async (req, res, next) => {
  try {
    const due = await billingService.recordPayment(req.params.id as string, { ...paymentSchema.parse(req.body), recordedById: req.user!.id });
    res.json(due);
  } catch (e) { next(e); }
});

router.post('/dues/:id/waive', authenticate, loadUserRoles, checkPerm('dues:waive'), async (req, res, next) => {
  try {
    const due = await billingService.waiveDue(req.params.id as string, { ...waiveSchema.parse(req.body), waivedById: req.user!.id });
    res.json(due);
  } catch (e) { next(e); }
});

export default router;