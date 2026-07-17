// Tenant session context for PostgreSQL Row-Level Security (RLS).
//
// The DB enforces tenant isolation via RLS policies keyed on three session
// GUCs set per request: app.current_org_id, app.current_clinics (csv),
// app.is_org_owner. SET LOCAL only survives inside a transaction, so every
// tenant-scoped call goes through withTenant(), which wraps the work in an
// interactive transaction and sets the vars before executing.
//
// This is defense-in-depth: app-level clinicId/orgId filters remain in place.
// ponytail: GUCs over a dedicated role/connection pool for simplicity.

import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from './database.js';

/** Clinics the caller may see. Empty array + isOrgOwner = org-wide access. */
export interface TenantContext {
  orgId: string;
  clinics: string[];
  isOrgOwner: boolean;
}

export function tenantContextFromReq(req: Request): TenantContext {
  const user = req.user;
  if (!user) throw new Error('tenantContextFromReq: no authenticated user');
  const clinics = (user.roles || [])
    .map((r) => r.clinicId)
    .filter((id): id is string => Boolean(id));
  return { orgId: user.orgId, clinics, isOrgOwner: user.isOrgOwner };
}

/**
 * Run `fn` with the request's tenant context applied at the DB layer.
 * `fn` receives the same prisma client; all queries inside inherit RLS scope.
 */
export async function withTenant<T>(
  req: Request,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const { orgId, clinics, isOrgOwner } = tenantContextFromReq(req);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', $1, true),
              set_config('app.current_clinics', $2, true),
              set_config('app.is_org_owner', $3, true)`,
      orgId,
      clinics.join(','),
      isOrgOwner ? 'true' : 'false',
    );
    return fn(tx);
  });
}
