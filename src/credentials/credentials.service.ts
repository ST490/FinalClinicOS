import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { auditService } from '../audit/audit.service.js';
import {
  CreateCredentialInput,
  ListCredentialsInput,
  StaffCredential,
  UpdateCredentialInput,
} from './credentials.types.js';

function toCredential(row: any): StaffCredential {
  return {
    id: row.id,
    clinicId: row.clinicId,
    orgId: row.orgId,
    userId: row.userId,
    type: row.type,
    number: row.number,
    issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    docUrl: row.docUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class CredentialsService {
  async create(input: CreateCredentialInput, actor: { userId: string; ip?: string; ua?: string }): Promise<StaffCredential> {
    const row = await prisma.staffCredential.create({
      data: {
        clinicId: input.clinicId,
        orgId: input.orgId,
        userId: input.userId,
        type: input.type,
        number: input.number ?? null,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        docUrl: input.docUrl ?? null,
      },
    });
    await auditService.log({
      orgId: input.orgId,
      clinicId: input.clinicId,
      userId: actor.userId,
      action: 'credential:create',
      entityType: 'StaffCredential',
      entityId: row.id,
      after: { type: input.type },
      ipAddress: actor.ip,
      userAgent: actor.ua,
    });
    return toCredential(row);
  }

  async list(input: ListCredentialsInput): Promise<StaffCredential[]> {
    const where: Prisma.StaffCredentialWhereInput = {};
    if (input.orgId) where.orgId = input.orgId;
    if (input.clinicId) where.clinicId = Array.isArray(input.clinicId) ? { in: input.clinicId } : input.clinicId;
    if (input.userId) where.userId = input.userId;
    if (input.type) where.type = input.type;
    if (input.expiringWithinDays != null) {
      const horizon = new Date(Date.now() + input.expiringWithinDays * 24 * 3600 * 1000);
      where.expiresAt = { lte: horizon, gte: new Date() };
    }
    const rows = await prisma.staffCredential.findMany({ where, orderBy: { expiresAt: 'asc' } });
    return rows.map(toCredential);
  }

  async update(
    id: string,
    input: UpdateCredentialInput,
    actor: { userId: string; clinicId: string; orgId: string; ip?: string; ua?: string },
  ): Promise<StaffCredential> {
    const row = await prisma.staffCredential.update({
      where: { id },
      data: {
        ...(input.type ? { type: input.type } : {}),
        ...(input.number !== undefined ? { number: input.number } : {}),
        ...(input.issuedAt !== undefined ? { issuedAt: input.issuedAt ? new Date(input.issuedAt) : null } : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
        ...(input.docUrl !== undefined ? { docUrl: input.docUrl } : {}),
      },
    });
    await auditService.log({
      orgId: actor.orgId,
      clinicId: actor.clinicId,
      userId: actor.userId,
      action: 'credential:update',
      entityType: 'StaffCredential',
      entityId: id,
      after: input,
      ipAddress: actor.ip,
      userAgent: actor.ua,
    });
    return toCredential(row);
  }

  async delete(id: string, actor: { userId: string; clinicId: string; orgId: string; ip?: string; ua?: string }): Promise<void> {
    await prisma.staffCredential.delete({ where: { id } });
    await auditService.log({
      orgId: actor.orgId,
      clinicId: actor.clinicId,
      userId: actor.userId,
      action: 'credential:delete',
      entityType: 'StaffCredential',
      entityId: id,
      ipAddress: actor.ip,
      userAgent: actor.ua,
    });
  }
}

export const credentialsService = new CredentialsService();
