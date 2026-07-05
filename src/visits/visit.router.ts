import express from 'express';
import { z } from 'zod';
import { visitService } from './visit.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

const createSchema = z.object({
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  visitDate: z.string().optional(),
  type: z.string().optional(),
  vitals: z.any().optional(),
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ clinicId: true, patientId: true, doctorId: true });

const searchSchema = z.object({
  clinicId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
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

router.post('/visits', authenticate, loadUserRoles, checkPerm('patient:create'), async (req, res, next) => {
  try {
    const visit = await visitService.create({ ...createSchema.parse(req.body), createdById: req.user!.id });
    res.status(201).json(visit);
  } catch (e) { next(e); }
});

router.get('/visits', authenticate, loadUserRoles, checkPerm('patient:read'), async (req, res, next) => {
  try {
    const result = await visitService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/visits/:id', authenticate, loadUserRoles, checkPerm('patient:read'), async (req, res, next) => {
  try {
    const visit = await visitService.findById(req.params.id as string);
    if (!visit) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    res.json(visit);
  } catch (e) { next(e); }
});

router.patch('/visits/:id', authenticate, loadUserRoles, checkPerm('patient:update'), async (req, res, next) => {
  try {
    const visit = await visitService.update(req.params.id as string, updateSchema.parse(req.body));
    res.json(visit);
  } catch (e) { next(e); }
});

router.get('/visits/patient/:patientId/stats', authenticate, loadUserRoles, checkPerm('patient:read'), async (req, res, next) => {
  try {
    const stats = await visitService.getPatientStats(req.params.patientId as string);
    res.json(stats);
  } catch (e) { next(e); }
});

export default router;