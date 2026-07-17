import express, { Request, Response } from 'express';
import { z } from 'zod';
import { billingService } from './billing.service.js';
import { patientService } from '../patients/patient.service.js';
import { authenticate, loadUserRoles, requireClinicAccess } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

async function verifyDueAccess(req: Request, res: Response): Promise<any> {
  const due = await billingService.getDue(req.params.id as string);
  if (!due) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Due record not found' } });
    return null;
  }

  // Tenant check
  if (req.user!.isOrgOwner) {
    if (due.orgId !== req.user!.orgId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return null;
    }
  } else {
    const hasAccess = req.user!.roles.some(r => r.clinicId === due.clinicId);
    if (!hasAccess) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return null;
    }
  }
  return due;
}

const createDueSchema = z.object({
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER']).optional(),
  paymentNotes: z.string().optional(),
  amountPaid: z.number().min(0).optional(),
  appointmentId: z.string().uuid().optional(),
  prescriptionId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string().optional(),
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
  limit: z.coerce.number().min(1).max(1000).optional().default(20),
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

router.post('/dues', authenticate, loadUserRoles, checkPerm('dues:manage'), requireClinicAccess, async (req, res, next) => {
  try {
    const due = await billingService.createDue({ ...createDueSchema.parse(req.body), recordedById: req.user!.id });
    res.status(201).json(due);
  } catch (e) { next(e); }
});

router.get('/dues', authenticate, loadUserRoles, checkPerm('dues:read'), requireClinicAccess, async (req, res, next) => {
  try {
    const result = await billingService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/dues/:id', authenticate, loadUserRoles, checkPerm('dues:read'), async (req, res, next) => {
  try {
    const due = await verifyDueAccess(req, res);
    if (!due) return;
    res.json(due);
  } catch (e) { next(e); }
});

router.get('/dues/patient/:patientId/balance', authenticate, loadUserRoles, checkPerm('dues:read'), async (req, res, next) => {
  try {
    const patient = await patientService.findById(req.params.patientId as string);
    if (!patient) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    if (req.user!.isOrgOwner) {
      if (patient.orgId !== req.user!.orgId) { res.status(403).json({ error: { code: 'FORBIDDEN' } }); return; }
    } else {
      if (!req.user!.roles.some(r => r.clinicId === patient.clinicId)) { res.status(403).json({ error: { code: 'FORBIDDEN' } }); return; }
    }
    const balance = await billingService.getPatientBalance(req.params.patientId as string);
    res.json(balance);
  } catch (e) { next(e); }
});

router.post('/dues/:id/pay', authenticate, loadUserRoles, checkPerm('dues:manage'), async (req, res, next) => {
  try {
    const due = await verifyDueAccess(req, res);
    if (!due) return;
    const result = await billingService.recordPayment(req.params.id as string, { ...paymentSchema.parse(req.body), recordedById: req.user!.id });
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/dues/:id/waive', authenticate, loadUserRoles, checkPerm('dues:waive'), async (req, res, next) => {
  try {
    const due = await verifyDueAccess(req, res);
    if (!due) return;
    const result = await billingService.waiveDue(req.params.id as string, { ...waiveSchema.parse(req.body), waivedById: req.user!.id });
    res.json(result);
  } catch (e) { next(e); }
});

export default router;