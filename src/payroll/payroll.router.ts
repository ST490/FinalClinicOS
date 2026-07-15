import express from 'express';
import { z } from 'zod';
import { payrollService } from './payroll.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

const generateSchema = z.object({
  clinicId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM'),
  adjustments: z.record(z.object({
    bonus: z.number().nonnegative().optional(),
    deduction: z.number().nonnegative().optional(),
  })).optional(),
});

const listSchema = z.object({
  clinicId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'PAID']).optional(),
  department: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
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

router.post('/payroll/generate', authenticate, loadUserRoles, checkPerm('payroll:manage'), async (req, res, next) => {
  try {
    const payslips = await payrollService.generate(generateSchema.parse(req.body));
    res.status(201).json(payslips);
  } catch (e) { next(e); }
});

router.get('/payroll', authenticate, loadUserRoles, checkPerm('payroll:read'), async (req, res, next) => {
  try {
    const result = await payrollService.list(listSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/payroll/:id/pay', authenticate, loadUserRoles, checkPerm('payroll:manage'), async (req, res, next) => {
  try {
    const payslip = await payrollService.markPaid(req.params.id as string);
    res.json(payslip);
  } catch (e) { next(e); }
});

router.post('/payroll/:id/approve', authenticate, loadUserRoles, checkPerm('payroll:manage'), async (req, res, next) => {
  try {
    const payslip = await payrollService.approve(req.params.id as string);
    res.json(payslip);
  } catch (e) { next(e); }
});

export default router;
