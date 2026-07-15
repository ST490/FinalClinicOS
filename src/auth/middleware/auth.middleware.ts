import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.service.js';
import { AuthenticatedUser } from '../types/auth.types.js';
import { UserRoleType } from '@prisma/client';
import { Permission } from '../types/permissions.js';
import { prisma } from '../../config/database.js';

export type { UserRoleType };
export type { Permission };

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT MIDDLEWARE — Verify access token, attach user to request
// ─────────────────────────────────────────────────────────────────────────────

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Access token required' } });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      orgId: payload.orgId ?? '',
      activeClinicId: payload.activeClinicId,
      roles: (payload.roles || []).map((r: UserRoleType) => ({ clinicId: '', role: r })),
      isOrgOwner: payload.isOrgOwner ?? false,
      is2FAEnabled: payload.is2FAEnabled ?? false,
    };
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' } });
    } else {
      res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid access token' } });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC MIDDLEWARE — Check if user has required role(s)
// ─────────────────────────────────────────────────────────────────────────────

export function requireRole(...allowedRoles: (UserRoleType | 'MASTER')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    if (req.user.isOrgOwner) {
      next();
      return;
    }

    const userRoles = req.user.roles.map(r => r.role);
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINIC ACCESS MIDDLEWARE — Verify user can access a specific clinic
// ─────────────────────────────────────────────────────────────────────────────

export async function requireClinicAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  let clinicId = req.params.clinicId || req.body.clinicId || req.query.clinicId;
  if (!clinicId && req.user.activeClinicId) {
    clinicId = req.user.activeClinicId;
    req.query.clinicId = clinicId;
    req.body.clinicId = clinicId;
  }

  if (!clinicId) {
    res.status(400).json({ error: { code: 'CLINIC_ID_REQUIRED', message: 'clinicId is required' } });
    return;
  }

  // ORG OWNER can access any clinic in their org
  if (req.user.isOrgOwner) {
    try {
      const clinic = await prisma.clinic.findUnique({ where: { id: clinicId as string } });
      if (!clinic || clinic.orgId !== req.user.orgId) {
        res.status(403).json({
          error: {
            code: 'CLINIC_ACCESS_DENIED',
            message: 'You do not have access to this clinic',
          },
        });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
    return;
  }

  // Check if user has a role for this clinic
  const hasAccess = req.user.roles.some(r => r.clinicId === clinicId);

  if (!hasAccess) {
    res.status(403).json({
      error: {
        code: 'CLINIC_ACCESS_DENIED',
        message: 'You do not have access to this clinic',
      },
    });
    return;
  }

  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD USER ROLES — Enrich request with user's full role information
// ─────────────────────────────────────────────────────────────────────────────

export async function loadUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        clinicRoles: {
          where: { status: 'ACTIVE' },
          include: { clinic: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    // Enrich user with role info
    req.user.roles = user.clinicRoles
      .filter(cr => cr.status === 'ACTIVE')
      .map(cr => ({
        clinicId: cr.clinicId,
        clinicName: cr.clinic.name,
        role: cr.role,
      }));

    // If no active clinic, try to set primary
    if (!req.user.activeClinicId && user.clinicRoles.length > 0) {
      const primary = user.clinicRoles.find(cr => cr.isPrimary) || user.clinicRoles[0];
      req.user.activeClinicId = primary.clinicId;
    }

    next();
  } catch (error) {
    next(error);
  }
}