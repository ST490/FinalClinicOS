import express from 'express';
import { z } from 'zod';
import { prescriptionService } from './prescription.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

const createSchema = z.object({
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  notes: z.string().optional(),
  signature: z.string().optional(),
  items: z.array(z.object({
    medicineId: z.string().uuid().optional(),
    customName: z.string().optional(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    instructions: z.string().optional(),
    quantity: z.number().int().optional(),
    unitPrice: z.number().optional(),
    totalPrice: z.number().optional(),
  })).min(1),
});

const searchSchema = z.object({
  clinicId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  visitId: z.string().uuid().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const dispenseSchema = z.object({
  items: z.array(z.object({
    prescriptionItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })),
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

router.post('/prescriptions', authenticate, loadUserRoles, checkPerm('prescription:create'), async (req, res, next) => {
  try {
    const prescription = await prescriptionService.create({ ...createSchema.parse(req.body), createdById: req.user!.id });
    res.status(201).json(prescription);
  } catch (e) { next(e); }
});

router.get('/prescriptions', authenticate, loadUserRoles, checkPerm('prescription:read'), async (req, res, next) => {
  try {
    const result = await prescriptionService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/prescriptions/:id', authenticate, loadUserRoles, checkPerm('prescription:read'), async (req, res, next) => {
  try {
    const prescription = await prescriptionService.findById(req.params.id as string);
    if (!prescription) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    res.json(prescription);
  } catch (e) { next(e); }
});

router.post('/prescriptions/:id/cancel', authenticate, loadUserRoles, checkPerm('prescription:cancel'), async (req, res, next) => {
  try {
    const prescription = await prescriptionService.cancel(req.params.id as string, req.user!.id);
    res.json(prescription);
  } catch (e) { next(e); }
});

router.post('/prescriptions/:id/dispense', authenticate, loadUserRoles, checkPerm('inventory:manage'), async (req, res, next) => {
  try {
    const prescription = await prescriptionService.dispensePrescription(req.params.id as string, { ...dispenseSchema.parse(req.body), performedById: req.user!.id });
    res.json(prescription);
  } catch (e) { next(e); }
});

export default router;