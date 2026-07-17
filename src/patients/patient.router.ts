import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { patientService } from './patient.service.js';
import { authenticate, loadUserRoles, requireClinicAccess } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

async function verifyPatientAccess(req: Request, res: Response): Promise<any> {
  const patient = await patientService.findById(req.params.patientId as string);
  if (!patient) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Patient not found' } });
    return null;
  }

  // Tenant check
  if (req.user!.isOrgOwner) {
    if (patient.orgId !== req.user!.orgId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return null;
    }
  } else {
    const hasAccess = req.user!.roles.some(r => r.clinicId === patient.clinicId);
    if (!hasAccess) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return null;
    }
  }

  return patient;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const createPatientSchema = z.object({
  clinicId: z.string().uuid(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  bloodGroup: z.string().max(5).optional(),
  allergies: z.array(z.string()).optional().default([]),
  medicalHistory: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().max(2).optional().default('IN'),
  tags: z.array(z.string()).optional().default([]),
  whatsappConsent: z.boolean().optional().default(false),
  smsConsent: z.boolean().optional().default(false),
});
// ponytail: only name is required; email/phone/address/etc. are optional.

const updatePatientSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  bloodGroup: z.string().max(5).optional(),
  allergies: z.array(z.string()).optional(),
  medicalHistory: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().max(2).optional(),
  tags: z.array(z.string()).optional(),
  whatsappConsent: z.boolean().optional(),
  smsConsent: z.boolean().optional(),
});

const searchSchema = z.object({
  query: z.string().optional(),
  // ponytail: clinicId is a string PK — seed data uses non-uuid ids (e.g. "demo-clinic"),
  // so do NOT enforce uuid here or every query scoped to those clinics 400s.
  clinicId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  bloodGroup: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(1000).optional().default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function checkPermission(permission: Permission) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!_req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    if (_req.user.isOrgOwner) {
      next();
      return;
    }

    const userRoles = _req.user.roles.map(r => r.role);
    if (!hasPermission(userRoles, permission)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Permission required: ${permission}`,
        },
      });
      return;
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /patients — Create patient (clinicId in body)
router.post(
  '/patients',
  authenticate,
  loadUserRoles,
  checkPermission('patient:create'),
  requireClinicAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createPatientSchema.parse(req.body);
      const clinicId = data.clinicId as string || req.body.clinicId;

      const patient = await patientService.create({
        ...data,
        clinicId,
        createdById: req.user!.id,
      });

      res.status(201).json(patient);
    } catch (error) {
      next(error);
    }
  }
);

// GET /patients — List/search patients
// Scoped to the caller's tenant: org owners see every patient in their org,
// clinic-scoped users see patients across all clinics they hold a role in.
// (No single clinicId is required, so MASTER/owners with no "active clinic"
// still get results, and multi-clinic staff see all their patients.)
router.get(
  '/patients',
  authenticate,
  loadUserRoles,
  checkPermission('patient:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = searchSchema.parse(req.query);
      const clinicIdFromQuery = req.query.clinicId as string | undefined;

      const scope: { orgId?: string; clinicId?: string | { in: string[] } } = {};
      if (req.user!.isOrgOwner) {
        scope.orgId = req.user!.orgId;
        // Org owners may optionally narrow to one of their clinics.
        if (clinicIdFromQuery) scope.clinicId = clinicIdFromQuery;
      } else {
        // Clinic-scoped users see patients across ALL clinics they hold a role
        // in (not just the one passed in), so the picker is never empty just
        // because their "active" clinic differs from where patients live.
        const roleClinicIds = req.user!.roles.map(r => r.clinicId).filter(Boolean);
        if (roleClinicIds.length > 0) {
          scope.clinicId = { in: roleClinicIds };
        }
      }

      // Non-org-owner with no clinic roles → nothing to show (no cross-org leak).
      if (!scope.orgId && !scope.clinicId) {
        res.json({ data: [], pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 0 } });
        return;
      }

      const result = await patientService.search({ ...params, ...scope });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /patients/:patientId — Get single patient
router.get(
  '/patients/:patientId',
  authenticate,
  loadUserRoles,
  checkPermission('patient:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await verifyPatientAccess(req, res);
      if (!patient) return;
      res.json(patient);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /patients/:patientId — Update patient
router.patch(
  '/patients/:patientId',
  authenticate,
  loadUserRoles,
  checkPermission('patient:update'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await verifyPatientAccess(req, res);
      if (!patient) return;
      const data = updatePatientSchema.parse(req.body);
      const updated = await patientService.update(req.params.patientId as string, data, req.user!.id);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /patients/:patientId — Soft delete patient
router.delete(
  '/patients/:patientId',
  authenticate,
  loadUserRoles,
  checkPermission('patient:delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await verifyPatientAccess(req, res);
      if (!patient) return;
      await patientService.delete(req.params.patientId as string);
      res.json({ success: true, message: 'Patient deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /patients/:patientId/tags — Add tag
router.post(
  '/patients/:patientId/tags',
  authenticate,
  loadUserRoles,
  checkPermission('patient:update'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await verifyPatientAccess(req, res);
      if (!patient) return;
      const { tag } = req.body;
      if (!tag || typeof tag !== 'string') {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Tag is required' } });
        return;
      }
      const updated = await patientService.addTag(req.params.patientId as string, tag);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /patients/:patientId/tags/:tag — Remove tag
router.delete(
  '/patients/:patientId/tags/:tag',
  authenticate,
  loadUserRoles,
  checkPermission('patient:update'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await verifyPatientAccess(req, res);
      if (!patient) return;
      const updated = await patientService.removeTag(
        req.params.patientId as string,
        decodeURIComponent(req.params.tag as string)
      );
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// GET /patients/:patientId/stats — Patient statistics
router.get(
  '/patients/:patientId/stats',
  authenticate,
  loadUserRoles,
  checkPermission('patient:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await verifyPatientAccess(req, res);
      if (!patient) return;
      const stats = await patientService.getPatientStats(req.params.patientId as string);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

export default router;