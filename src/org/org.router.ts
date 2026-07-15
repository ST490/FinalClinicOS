import express from 'express';
import { z } from 'zod';
import { orgService } from './org.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

// Schemas
const createOrgSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(2).max(3),
  plan: z.string().optional(),
});

const createClinicSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().max(3).optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  locale: z.string().optional(),
  workingHours: z.any().optional(),
});

const updateClinicSchema = createClinicSchema.partial().omit({ timezone: true, currency: true, locale: true });

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  accentColor: z.string().optional().nullable(),
  landingPageSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional().nullable(),
});

const searchSchema = z.object({
  orgId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED']).optional(),
  clinicIds: z.array(z.string()).optional(),
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

// Organization routes
router.post('/orgs', authenticate, loadUserRoles, checkPerm('org:manage'), async (req, res, next) => {
  try {
    const org = await orgService.createOrg({ ...createOrgSchema.parse(req.body), createdById: req.user!.id });
    res.status(201).json(org);
  } catch (e) { next(e); }
});

router.get('/orgs/:id', authenticate, loadUserRoles, checkPerm('org:read'), async (req, res, next) => {
  try {
    const org = await orgService.getOrg(req.params.id as string);
    if (!org) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    res.json(org);
  } catch (e) { next(e); }
});

router.patch('/orgs/:id', authenticate, loadUserRoles, checkPerm('org:manage'), async (req, res, next) => {
  try {
    const org = await orgService.updateOrg(req.params.id as string, req.body);
    res.json(org);
  } catch (e) { next(e); }
});

router.delete('/orgs/:id', authenticate, loadUserRoles, checkPerm('org:manage'), async (req, res, next) => {
  try {
    await orgService.deleteOrg(req.params.id as string);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/clinics', authenticate, loadUserRoles, checkPerm('clinic:manage'), async (req, res, next) => {
  try {
    const orgId = req.user!.orgId;
    const clinic = await orgService.createClinic(orgId, { ...createClinicSchema.parse(req.body), createdById: req.user!.id });
    res.status(201).json(clinic);
  } catch (e) { next(e); }
});

router.get('/clinics', authenticate, loadUserRoles, checkPerm('clinic:read'), async (req, res, next) => {
  try {
    const query = searchSchema.parse(req.query);
    // Enforce tenant isolation
    query.orgId = req.user!.orgId;
    // Non-org-owners only ever see the clinics they hold an active role in,
    // so the client's default clinic context resolves to one they can access.
    if (!req.user!.isOrgOwner) {
      const myClinicIds = req.user!.roles.map((r) => r.clinicId).filter(Boolean);
      query.clinicIds = myClinicIds;
    }
    const result = await orgService.searchClinics(query);
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/clinics/:id', authenticate, loadUserRoles, checkPerm('clinic:read'), async (req, res, next) => {
  try {
    const clinic = await orgService.getClinic(req.params.id as string);
    if (!clinic) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    // Enforce tenant isolation
    if (clinic.orgId !== req.user!.orgId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return;
    }
    res.json(clinic);
  } catch (e) { next(e); }
});

router.patch('/clinics/:id', authenticate, loadUserRoles, checkPerm('clinic:manage'), async (req, res, next) => {
  try {
    const clinic = await orgService.getClinic(req.params.id as string);
    if (!clinic) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    // Enforce tenant isolation
    if (clinic.orgId !== req.user!.orgId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return;
    }
    const updated = await orgService.updateClinic(req.params.id as string, updateClinicSchema.parse(req.body));
    res.json(updated);
  } catch (e) { next(e); }
});

router.patch('/clinics/:id/branding', authenticate, loadUserRoles, checkPerm('clinic:manage'), async (req, res, next) => {
  try {
    const clinic = await orgService.getClinic(req.params.id as string);
    if (!clinic) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    // Enforce tenant isolation
    if (clinic.orgId !== req.user!.orgId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return;
    }
    const updated = await orgService.updateBranding(req.params.id as string, brandingSchema.parse(req.body));
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/clinics/:id', authenticate, loadUserRoles, checkPerm('clinic:manage'), async (req, res, next) => {
  try {
    const clinic = await orgService.getClinic(req.params.id as string);
    if (!clinic) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    // Enforce tenant isolation
    if (clinic.orgId !== req.user!.orgId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return;
    }
    await orgService.deleteClinic(req.params.id as string);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;