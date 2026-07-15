import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreateLeaveInput, ListLeaveInput, LeaveBalance, LeaveResponse,
  UpdateLeaveStatusInput, LEAVE_ALLOTTED,
} from './types/leave.types.js';

const leaveInclude = {
  user: { select: { name: true, clinicRoles: true } },
} as const;

function departmentFor(record: any): string | null | undefined {
  const role = (record.user?.clinicRoles || []).find((r: any) => r.clinicId === record.clinicId);
  return role?.department ?? null;
}

function toResponse(record: any): LeaveResponse {
  return {
    id: record.id,
    clinicId: record.clinicId,
    orgId: record.orgId,
    userId: record.userId,
    userName: record.user?.name,
    department: departmentFor(record),
    type: record.type,
    fromDate: record.fromDate.toISOString().slice(0, 10),
    toDate: record.toDate.toISOString().slice(0, 10),
    days: record.days,
    reason: record.reason,
    status: record.status,
    appliedOn: record.appliedOn.toISOString(),
    reviewedById: record.reviewedById ?? null,
    reviewedAt: record.reviewedAt ? record.reviewedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class LeaveService {
  async create(input: CreateLeaveInput): Promise<LeaveResponse> {
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error('User not found');

    const record = await prisma.leaveRequest.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        userId: input.userId,
        type: input.type,
        fromDate: new Date(input.fromDate),
        toDate: new Date(input.toDate),
        days: input.days,
        reason: input.reason ?? null,
        status: 'PENDING',
      },
      include: leaveInclude,
    });
    return toResponse(record);
  }

  async list(input: ListLeaveInput): Promise<{ data: LeaveResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveRequestWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.userId && { userId: input.userId }),
      ...(input.status && { status: input.status }),
      ...(input.type && { type: input.type }),
      ...((input.fromDate || input.toDate) && {
        fromDate: {
          ...(input.fromDate && { gte: new Date(input.fromDate) }),
          ...(input.toDate && { lte: new Date(input.toDate) }),
        },
      }),
    };

    const [records, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appliedOn: 'desc' }],
        include: leaveInclude,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: records.map(toResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: string, input: UpdateLeaveStatusInput): Promise<LeaveResponse> {
    const existing = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new Error('Leave request not found');
    if (existing.status !== 'PENDING') throw new Error('Leave request already reviewed');

    const record = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: input.status,
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
      },
      include: leaveInclude,
    });
    return toResponse(record);
  }

  async balances(clinicId: string, year: number = new Date().getUTCFullYear()): Promise<LeaveBalance[]> {
    const roles = await prisma.userClinicRole.findMany({
      where: { clinicId },
      include: { user: { select: { name: true } } },
    });

    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const approved = await prisma.leaveRequest.findMany({
      where: { clinicId, status: 'APPROVED', fromDate: { gte: start, lt: end } },
      select: { userId: true, days: true },
    });

    const usedByUser = new Map<string, number>();
    for (const l of approved) usedByUser.set(l.userId, (usedByUser.get(l.userId) || 0) + l.days);

    return roles.map((r) => {
      const used = usedByUser.get(r.userId) || 0;
      return {
        userId: r.userId,
        name: r.user.name,
        department: r.department ?? null,
        allotted: LEAVE_ALLOTTED,
        used,
        balance: LEAVE_ALLOTTED - used,
      };
    });
  }
}

export const leaveService = new LeaveService();
