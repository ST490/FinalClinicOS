import { Prisma, UserRoleType, UserStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { ForbiddenError } from '../common/errors.js';
import { auditService } from '../audit/audit.service.js';
import {
  InviteStaffInput,
  AcceptInviteInput,
  UpdateStaffRoleInput,
  StaffScheduleInput,
  DirectAddStaffInput,
  StaffResponse,
  ClinicRoleResponse,
  InvitationResponse,
  ShiftScheduleResponse,
} from './types/staff.types.js';
import { generateToken, hashToken } from '../auth/utils/password.service.js';

export class StaffService {
  async invite(input: InviteStaffInput): Promise<InvitationResponse> {
    const token = generateToken(24);
    const tokenHash = hashToken(token);

    await prisma.invite.create({
      data: {
        orgId: input.orgId,
        clinicId: input.clinicId,
        email: input.email,
        phone: input.phone,
        tokenHash,
        token,
        role: input.role,
        invitedById: input.invitedById,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { inviteId: tokenHash, token, message: 'Invitation sent successfully' };
  }

  async acceptInvite(input: AcceptInviteInput): Promise<{ user: StaffResponse; clinicRole?: ClinicRoleResponse }> {
    const tokenHash = hashToken(input.token);
    const invite = await prisma.invite.findFirst({
      where: { tokenHash, status: 'pending', expiresAt: { gt: new Date() } },
      include: { clinic: true },
    });

    if (!invite) throw new Error('Invalid or expired invitation');

    const user = await prisma.user.create({
      data: {
        orgId: invite.orgId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        status: 'ACTIVE',
      },
    });

    if (input.password) {
      const { hashPassword } = await import('../auth/utils/password.service.js');
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(input.password) } });
    }

    let clinicRole: any;
    if (invite.clinicId) {
      clinicRole = await prisma.userClinicRole.create({
        data: {
          userId: user.id,
          clinicId: invite.clinicId,
          role: invite.role as UserRoleType,
          isPrimary: true,
          status: 'ACTIVE',
        },
        include: { clinic: { select: { name: true } } },
      });
    }

    await prisma.invite.update({ where: { id: invite.id }, data: { status: 'accepted', acceptedById: user.id } });

    return {
      user: this.formatUser(user),
      clinicRole: clinicRole ? this.formatRole(clinicRole) : undefined,
    };
  }

  // Direct-add support staff (SUPPORT) as ACTIVE with no invite/login.
  // RECEPTIONIST/HR still go through the invite flow.
  async directAdd(input: DirectAddStaffInput): Promise<{ user: StaffResponse; clinicRole?: ClinicRoleResponse }> {
    const user = await prisma.user.create({
      data: {
        orgId: input.orgId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        status: 'ACTIVE',
        // Intentionally no passwordHash — these workers are roster entries, not login accounts.
      },
    });

    const clinicRole = await prisma.userClinicRole.create({
      data: {
        userId: user.id,
        clinicId: input.clinicId,
        role: input.role as UserRoleType,
        isPrimary: true,
        status: 'ACTIVE',
        department: input.department || null,
        salary: input.salary != null ? new Prisma.Decimal(input.salary) : null,
        wageType: input.wageType ?? 'MONTHLY',
        employmentType: input.employmentType ?? 'PERMANENT',
      },
      include: { clinic: { select: { name: true } } },
    });

    return {
      user: this.formatUser(user),
      clinicRole: this.formatRole(clinicRole),
    };
  }

  async searchStaff(clinicId?: string, includeInactive = false, orgId?: string): Promise<StaffResponse[]> {
    const roleStatus: UserStatus | { in: UserStatus[] } = includeInactive
      ? { in: ['ACTIVE', 'DISABLED'] }
      : 'ACTIVE';
    const where = clinicId
      ? { clinicRoles: { some: { clinicId, status: roleStatus } } }
      // All-Branches (org owner): show the WHOLE org roster, not just members
      // with an active clinic role. Scope by orgId only so org owners (who have
      // no clinicRole) and any role-less members are included.
      : { orgId };

    const users = await prisma.user.findMany({
      where: { ...where, status: { not: 'PENDING' as const } },
      include: { clinicRoles: { include: { clinic: { select: { id: true, name: true } } } } },
    });

    return users.map((u: any) => ({
      ...this.formatUser(u),
      clinicRoles: u.clinicRoles.filter((r: any) => !clinicId || r.clinicId === clinicId).map((r: any) => this.formatRole(r)),
    }));
  }

  async getPendingInvites(orgId: string, clinicId?: string) {
    const invites = await prisma.invite.findMany({
      where: {
        orgId,
        ...(clinicId && { clinicId }),
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: { clinic: { select: { name: true } } },
    });
    return invites.map((inv: any) => ({
      id: inv.id,
      email: inv.email,
      phone: inv.phone,
      role: inv.role,
      status: inv.status,
      token: inv.token, // raw token for manual (dev) copy — verifiable by accept-invite
      clinicName: inv.clinic?.name || 'All Clinics',
      createdAt: inv.createdAt,
    }));
  }

  async cancelInvite(inviteId: string, orgId: string): Promise<void> {
    const invite = await prisma.invite.findFirst({ where: { id: inviteId, orgId } });
    if (!invite) throw new Error('Invitation not found');
    if (invite.status !== 'pending') throw new Error('Invitation can no longer be cancelled');
    await prisma.invite.update({ where: { id: inviteId }, data: { status: 'cancelled' } });
  }

  async getStaffById(userId: string): Promise<(StaffResponse & { orgId: string }) | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { clinicRoles: { include: { clinic: { select: { name: true } } } } },
    });
    if (!user) return null;
    return {
      ...this.formatUser(user),
      orgId: user.orgId,
      clinicRoles: user.clinicRoles.map((r: any) => this.formatRole(r)),
    };
  }

  private async assertSameOrg(userId: string, orgId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } });
    if (!user || user.orgId !== orgId) {
      throw new ForbiddenError('User does not belong to your organization');
    }
  }

  async updateRole(userId: string, input: UpdateStaffRoleInput, orgId: string, actorId?: string): Promise<ClinicRoleResponse> {
    await this.assertSameOrg(userId, orgId);
    const data: any = { role: input.role as UserRoleType, isPrimary: input.isPrimary };
    if (input.designation !== undefined) data.designation = input.designation;
    if (input.wageType !== undefined) data.wageType = input.wageType;
    if (input.baseRate !== undefined) data.salary = input.baseRate;
    if (input.shiftType !== undefined) data.shiftType = input.shiftType;
    if (input.employmentType !== undefined) data.employmentType = input.employmentType;
    if (input.joiningDate !== undefined) data.joiningDate = input.joiningDate;
    if (input.department !== undefined) data.department = input.department;

    const role = await prisma.userClinicRole.upsert({
      where: { userId_clinicId: { userId, clinicId: input.clinicId } },
      create: {
        userId,
        clinicId: input.clinicId,
        role: input.role as UserRoleType,
        isPrimary: input.isPrimary || false,
        status: 'ACTIVE',
        ...data,
      },
      update: data,
      include: { clinic: { select: { name: true } } },
    });

    await auditService.log({
      orgId,
      clinicId: input.clinicId,
      userId: actorId,
      action: 'UPDATE',
      entityType: 'STAFF_ROLE',
      entityId: `${userId}:${input.clinicId}`,
      after: this.formatRole(role),
    }).catch(() => {});

    return this.formatRole(role);
  }

  async deactivateStaff(userId: string, clinicId?: string, orgId?: string, actorId?: string): Promise<void> {
    if (orgId) await this.assertSameOrg(userId, orgId);
    if (clinicId) {
      await prisma.userClinicRole.updateMany({
        where: { userId, clinicId },
        data: { status: 'DISABLED' },
      });
    } else {
      await prisma.user.update({ where: { id: userId }, data: { status: 'DISABLED' } });
    }

    if (orgId) {
      await auditService.log({
        orgId,
        clinicId,
        userId: actorId,
        action: 'DEACTIVATE',
        entityType: 'STAFF',
        entityId: userId,
      }).catch(() => {});
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCHEDULES
  // ─────────────────────────────────────────────────────────────────────────────

  async setSchedule(input: StaffScheduleInput): Promise<ShiftScheduleResponse> {
    const schedule = await prisma.staffSchedule.upsert({
      where: { id: input.clinicId + '_' + input.userId + '_' + input.dayOfWeek } as any,
      create: {
        clinicId: input.clinicId,
        orgId: (await prisma.clinic.findUnique({ where: { id: input.clinicId } }))!.orgId,
        userId: input.userId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDuration: input.slotDuration || 30,
        shiftType: input.shiftType ?? null,
        isActive: input.isActive !== false,
      },
      update: {
        startTime: input.startTime,
        endTime: input.endTime,
        slotDuration: input.slotDuration || 30,
        shiftType: input.shiftType ?? null,
        isActive: input.isActive !== false,
      },
      include: { clinic: { select: { name: true } } },
    });
    return this.formatSchedule(schedule);
  }

  async getSchedules(userId: string, clinicId?: string): Promise<ShiftScheduleResponse[]> {
    const schedules = await prisma.staffSchedule.findMany({
      where: {
        userId,
        ...(clinicId && { clinicId }),
      },
      include: { clinic: { select: { name: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return schedules.map(s => this.formatSchedule(s));
  }

  // All schedules for a clinic, keyed for a weekly grid.
  async getClinicSchedules(clinicId: string): Promise<ShiftScheduleResponse[]> {
    const schedules = await prisma.staffSchedule.findMany({
      where: { clinicId },
      include: { clinic: { select: { name: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return schedules.map(s => this.formatSchedule(s));
  }

  private formatUser(user: any): StaffResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      isOrgOwner: user.isOrgOwner,
      createdAt: user.createdAt,
      dateOfBirth: user.dateOfBirth ?? null,
    };
  }

  private formatRole(role: any): ClinicRoleResponse {
    return {
      id: role.id,
      clinicId: role.clinicId,
      clinicName: role.clinic?.name,
      role: role.role,
      isPrimary: role.isPrimary,
      status: role.status,
      department: role.department ?? null,
      designation: role.designation ?? null,
      wageType: role.wageType ?? null,
      baseRate: role.salary != null ? Number(role.salary) : null,
      shiftType: role.shiftType ?? null,
      employmentType: role.employmentType ?? null,
      joiningDate: role.joiningDate ? role.joiningDate.toISOString() : null,
    };
  }

  private formatSchedule(schedule: any): ShiftScheduleResponse {
    return {
      id: schedule.id,
      clinicId: schedule.clinicId,
      clinicName: schedule.clinic?.name,
      userId: schedule.userId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotDuration: schedule.slotDuration,
      isActive: schedule.isActive,
      shiftType: schedule.shiftType ?? null,
      specificDate: schedule.specificDate,
    };
  }
}

export const staffService = new StaffService();