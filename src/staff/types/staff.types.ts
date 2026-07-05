import { UserRoleType } from '@prisma/client';

export interface InviteStaffInput {
  orgId: string;
  clinicId?: string;
  email?: string;
  phone?: string;
  role: UserRoleType;
  invitedById: string;
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
}

export interface UpdateStaffRoleInput {
  clinicId: string;
  role: UserRoleType;
  isPrimary?: boolean;
}

export interface StaffScheduleInput {
  clinicId: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  isActive?: boolean;
}

export interface StaffResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  isOrgOwner: boolean;
  createdAt: Date;
  clinicRoles?: ClinicRoleResponse[];
}

export interface ClinicRoleResponse {
  id: string;
  clinicId: string;
  clinicName?: string;
  role: UserRoleType;
  isPrimary: boolean;
  status: string;
}

export interface InvitationResponse {
  inviteId: string;
  message: string;
}

export interface ShiftScheduleResponse {
  id: string;
  clinicId: string;
  clinicName?: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  specificDate: Date | null;
}