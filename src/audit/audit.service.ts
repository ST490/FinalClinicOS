import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { CreateAuditInput, AuditResponse, SearchAuditInput } from './types/audit.types.js';

export class AuditService {
  async log(input: CreateAuditInput): Promise<AuditResponse> {
    const entry = await prisma.auditLog.create({
      data: {
        orgId: input.orgId,
        clinicId: input.clinicId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before,
        after: input.after,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
      },
    });
    return this.formatEntry(entry);
  }

  async search(input: SearchAuditInput): Promise<{ data: AuditResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(input.orgId && { orgId: input.orgId }),
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.userId && { userId: input.userId }),
      ...(input.action && { action: input.action }),
      ...(input.entityType && { entityType: input.entityType }),
      ...(input.entityId && { entityId: input.entityId }),
      ...(input.fromDate && { createdAt: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { createdAt: { lte: new Date(input.toDate) } }),
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: entries.map(e => this.formatEntry(e)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getByEntity(entityType: string, entityId: string): Promise<AuditResponse[]> {
    const entries = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    return entries.map(e => this.formatEntry(e));
  }

  private formatEntry(entry: any): AuditResponse {
    return {
      id: entry.id,
      orgId: entry.orgId,
      clinicId: entry.clinicId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      userName: entry.user?.name,
    };
  }
}

export const auditService = new AuditService();