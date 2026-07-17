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
  // HR attributes (per clinic)
  designation?: string;
  wageType?: 'MONTHLY' | 'DAILY' | 'HOURLY';
  baseRate?: number | string; // maps to `salary` column
  shiftType?: 'DAY' | 'NIGHT' | 'ROTATIONAL';
  employmentType?: 'PERMANENT' | 'CONTRACT';
  joiningDate?: string;
  department?: string;
}

// Non-clinical support workers added directly as ACTIVE staff, no invite/login.
export type DirectAddRole = 'SUPPORT';

export interface DirectAddStaffInput {
  orgId: string;
  clinicId: string;
  name: string;
  email?: string;
  phone?: string;
  role: DirectAddRole;
  department?: string;
  wageType?: 'MONTHLY' | 'DAILY' | 'HOURLY';
  salary?: number | string;
  employmentType?: 'PERMANENT' | 'CONTRACT';
}

export interface StaffScheduleInput {
  clinicId: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  shiftType?: 'DAY' | 'NIGHT' | 'ROTATIONAL';
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
  dateOfBirth?: Date | null;
  clinicRoles?: ClinicRoleResponse[];
}

export interface ClinicRoleResponse {
  id: string;
  clinicId: string;
  clinicName?: string;
  role: UserRoleType;
  isPrimary: boolean;
  status: string;
  // HR attributes (per clinic)
  department?: string | null;
  designation?: string | null;
  wageType?: 'MONTHLY' | 'DAILY' | 'HOURLY' | null;
  baseRate?: number | null; // from `salary` column
  shiftType?: 'DAY' | 'NIGHT' | 'ROTATIONAL' | null;
  employmentType?: 'PERMANENT' | 'CONTRACT' | null;
  joiningDate?: string | null;
}

export interface InvitationResponse {
  inviteId: string;
  token?: string;
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
  shiftType?: 'DAY' | 'NIGHT' | 'ROTATIONAL' | null;
  specificDate: Date | null;
}