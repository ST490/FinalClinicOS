import express from 'express';
import { z } from 'zod';
import { auditService } from './audit.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';

const router = express.Router();

const searchSchema = z.object({
  orgId: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(200).optional().default(50),
});

// Admin-only: view audit logs
router.get('/audit', authenticate, loadUserRoles, async (req, res, next) => {
  try {
    // Only org owners can view audit logs
    if (!req.user?.isOrgOwner) {
      res.status(403).json({ error: { code: 'FORBIDDEN' } }); return;
    }
    const result = await auditService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/audit/entity/:entityType/:entityId', authenticate, loadUserRoles, async (req, res, next) => {
  try {
    if (!req.user?.isOrgOwner) {
      res.status(403).json({ error: { code: 'FORBIDDEN' } }); return;
    }
    const entries = await auditService.getByEntity(req.params.entityType as string, req.params.entityId as string);
    res.json(entries);
  } catch (e) { next(e); }
});

export default router;