import express from 'express';
import { z } from 'zod';
import { credentialsService } from './credentials.service.js';
import { CREDENTIAL_TYPES, type CredentialType } from './credentials.types.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';
import { withTenant } from '../config/tenant-session.js';

const router = express.Router();

function checkPerm(permission: Permission) {
  return (_req: any, _res: any, next: any): void => {
    if (!_req.user) {
      _res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    if (_req.user.isOrgOwner) {
      next();
      return;
    }
    if (!hasPermission(_req.user.roles.map((r: any) => r.role), permission)) {
      _res.status(403).json({ error: { code: 'FORBIDDEN' } });
      return;
    }
    next();
  };
}

const createSchema = z.object({
  clinicId: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(CREDENTIAL_TYPES as [CredentialType, ...CredentialType[]]),
  number: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  docUrl: z.string().url().optional(),
});

const updateSchema = z.object({
  type: z.enum(CREDENTIAL_TYPES as [CredentialType, ...CredentialType[]]).optional(),
  number: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  docUrl: z.string().url().optional(),
});

const listSchema = z.object({
  clinicId: z.union([z.string().uuid(), z.array(z.string().uuid())]).optional(),
  userId: z.string().uuid().optional(),
  type: z.enum(CREDENTIAL_TYPES as [CredentialType, ...CredentialType[]]).optional(),
  expiringWithinDays: z.coerce.number().min(0).max(365).optional(),
});

router.post('/credentials', authenticate, loadUserRoles, checkPerm('credential:manage'), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const cred = await credentialsService.create(body, {
      userId: req.user!.id,
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
    res.status(201).json(cred);
  } catch (err) {
    next(err);
  }
});

router.get('/credentials', authenticate, loadUserRoles, checkPerm('credential:read'), async (req, res, next) => {
  try {
    const q = listSchema.parse(req.query);
    // Tenant isolation: org owners get their org; staff are pinned to their clinics.
    const clinicIds = req.user!.roles.map((r) => r.clinicId).filter(Boolean) as string[];
    const creds = await withTenant(req, () => credentialsService.list({
      ...q,
      orgId: req.user!.orgId,
      clinicId: req.user!.isOrgOwner ? (q.clinicId ?? undefined) : (q.clinicId ?? clinicIds),
    }));
    res.json(creds);
  } catch (err) {
    next(err);
  }
});

router.patch('/credentials/:id', authenticate, loadUserRoles, checkPerm('credential:manage'), async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const cred = await credentialsService.update(String(req.params.id), body, {
      userId: req.user!.id,
      clinicId: req.body.clinicId ?? '',
      orgId: req.body.orgId ?? '',
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    res.json(cred);
  } catch (err) {
    next(err);
  }
});

router.delete('/credentials/:id', authenticate, loadUserRoles, checkPerm('credential:manage'), async (req, res, next) => {
  try {
    await credentialsService.delete(String(req.params.id), {
      userId: req.user!.id,
      clinicId: String(req.query.clinicId ?? ''),
      orgId: String(req.query.orgId ?? ''),
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
