import { UserRoleType } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  InviteStaffInput,
  AcceptInviteInput,
  UpdateStaffRoleInput,
  StaffScheduleInput,
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
        role: input.role,
        invitedById: input.invitedById,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { inviteId: tokenHash, message: 'Invitation sent successfully' };
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

  async searchStaff(clinicId?: string): Promise<StaffResponse[]> {
    const where = clinicId
      ? { clinicRoles: { some: { clinicId, status: 'ACTIVE' as const } } }
      : undefined;

    const users = await prisma.user.findMany({
      where: { ...where, status: { not: 'PENDING' as const } },
      include: { clinicRoles: { include: { clinic: { select: { id: true, name: true } } } } },
    });

    return users.map((u: any) => ({
      ...this.formatUser(u),
      clinicRoles: u.clinicRoles.filter((r: any) => !clinicId || r.clinicId === clinicId).map((r: any) => this.formatRole(r)),
    }));
  }

  async getStaffById(userId: string): Promise<StaffResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { clinicRoles: { include: { clinic: { select: { name: true } } } } },
    });
    return user ? this.formatUser(user) : null;
  }

  async updateRole(userId: string, input: UpdateStaffRoleInput): Promise<ClinicRoleResponse> {
    const role = await prisma.userClinicRole.upsert({
      where: { userId_clinicId: { userId, clinicId: input.clinicId } },
      create: {
        userId,
        clinicId: input.clinicId,
        role: input.role as UserRoleType,
        isPrimary: input.isPrimary || false,
        status: 'ACTIVE',
      },
      update: { role: input.role as UserRoleType, isPrimary: input.isPrimary },
      include: { clinic: { select: { name: true } } },
    });
    return this.formatRole(role);
  }

  async deactivateStaff(userId: string, clinicId?: string): Promise<void> {
    if (clinicId) {
      await prisma.userClinicRole.updateMany({
        where: { userId, clinicId },
        data: { status: 'DISABLED' },
      });
    } else {
      await prisma.user.update({ where: { id: userId }, data: { status: 'DISABLED' } });
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
        isActive: input.isActive !== false,
      },
      update: {
        startTime: input.startTime,
        endTime: input.endTime,
        slotDuration: input.slotDuration || 30,
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

  private formatUser(user: any): StaffResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      isOrgOwner: user.isOrgOwner,
      createdAt: user.createdAt,
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
      specificDate: schedule.specificDate,
    };
  }
}

export const staffService = new StaffService();