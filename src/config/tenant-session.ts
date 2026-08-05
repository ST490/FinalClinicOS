// Tenant session context for PostgreSQL Row-Level Security (RLS).
//
// The DB enforces tenant isolation via RLS policies keyed on four session
// GUCs set per request: app.current_org_id, app.current_user_id,
// app.current_clinics (csv), app.is_org_owner. SET LOCAL only survives
// inside a transaction, so every tenant-scoped call goes through
// withTenant(), which wraps the work in an interactive transaction and
// sets the vars before executing.
//
// This is defense-in-depth: app-level clinicId/orgId filters remain in place.

import type { Request, Response, NextFunction } from 'express';
import { prisma } from './database.js';
import type { Tx } from './database.js';

export type { Tx };

/** Clinics the caller may see. Empty array + isOrgOwner = org-wide access. */
export interface TenantContext {
  orgId: string;
  userId: string;
  clinics: string[];
  isOrgOwner: boolean;
}

export function tenantContextFromReq(req: Request): TenantContext {
  const user = req.user;
  if (!user) throw new Error('tenantContextFromReq: no authenticated user');
  const clinics = (user.roles || [])
    .map((r) => r.clinicId)
    .filter((id): id is string => Boolean(id));
  // Guard: if non-org-owner has no clinics, the GUC would match nothing
  // and every query would return 0 rows. Fail loudly so the bug surfaces.
  if (clinics.length === 0 && !user.isOrgOwner) {
    throw new Error(
      'tenantContextFromReq: user has no clinic roles and is not org owner. ' +
      'Ensure loadUserRoles middleware ran before withTenant.',
    );
  }
  return { orgId: user.orgId, userId: user.id, clinics, isOrgOwner: user.isOrgOwner };
}

/**
 * Run `fn` with the request's tenant context applied at the DB layer.
 * `fn` receives the transaction client; all queries inside inherit RLS scope.
 */
export async function withTenant<T>(
  req: Request,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const { orgId, userId, clinics, isOrgOwner } = tenantContextFromReq(req);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', $1, false),
              set_config('app.current_user_id', $2, false),
              set_config('app.current_clinics', $3, false),
              set_config('app.is_org_owner', $4, false)`,
      orgId,
      userId,
      clinics.join(','),
      isOrgOwner ? 'true' : 'false',
    );
    return fn(tx);
  });
}

/**
 * Express middleware wrapper: authenticate → loadUserRoles → withTenantHandler.
 * The handler receives `next` and `tx` so services use the RLS-scoped connection
 * and handlers can still call next(error) for structured error propagation.
 */
export function withTenantHandler(
  handler: (req: Request, res: Response, next: NextFunction, tx: Tx) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) =>
    withTenant(req, (tx) => handler(req, res, next, tx)).catch(next);
}
