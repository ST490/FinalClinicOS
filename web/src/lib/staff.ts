import api from './api';
import type { UserRole } from '../types';

export interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING';
  isOrgOwner: boolean;
  clinicRoles: {
    id: string;
    clinicId: string;
    clinicName?: string;
    role: UserRole;
    isPrimary: boolean;
    status: string;
    department?: string | null;
    salary?: number | null;
    designation?: string | null;
    wageType?: 'MONTHLY' | 'DAILY' | 'HOURLY' | null;
    baseRate?: number | null;
    shiftType?: 'DAY' | 'NIGHT' | 'ROTATIONAL' | null;
    employmentType?: 'PERMANENT' | 'CONTRACT' | null;
    joiningDate?: string | null;
  }[];
  createdAt: string;
  dateOfBirth?: string | null;
}

export interface StaffInvite {
  id: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  clinicName: string;
  createdAt: string;
}

export const staffApi = {
  list: async (params?: { clinicId?: string; includeInactive?: boolean }): Promise<StaffMember[]> => {
    const res = await api.get<StaffMember[]>('/staff', { params });
    return res.data;
  },

  listInvites: async (params?: { clinicId?: string }): Promise<StaffInvite[]> => {
    const res = await api.get<StaffInvite[]>('/staff/invites', { params });
    return res.data;
  },

  invite: async (data: {
    orgId: string;
    clinicId?: string;
    email?: string;
    phone?: string;
    role: UserRole;
  }): Promise<{ inviteId: string; token?: string; message: string }> => {
    const res = await api.post<{ inviteId: string; token?: string; message: string }>('/staff/invite', data);
    return res.data;
  },

  deactivate: async (userId: string, clinicId?: string): Promise<{ success: boolean }> => {
    const res = await api.delete<{ success: boolean }>(`/staff/${userId}`, { params: { clinicId } });
    return res.data;
  },

  cancelInvite: async (inviteId: string): Promise<{ success: boolean }> => {
    const res = await api.delete<{ success: boolean }>(`/staff/invites/${inviteId}`);
    return res.data;
  },

  // Support staff (SUPPORT) added directly as ACTIVE — no invite/login.
  directAdd: async (data: {
    clinicId: string;
    name: string;
    email?: string;
    phone?: string;
    role: 'SUPPORT';
    department?: string;
    wageType?: 'MONTHLY' | 'DAILY' | 'HOURLY';
    salary?: number;
    employmentType?: 'PERMANENT' | 'CONTRACT';
  }): Promise<{ user: StaffMember; clinicRole?: any }> => {
    const res = await api.post<{ user: StaffMember; clinicRole?: any }>('/staff/direct-add', data);
    return res.data;
  },

  // Weekly staff schedules (clinic-wide grid)
  schedules: async (clinicId: string): Promise<StaffSchedule[]> => {
    const res = await api.get<StaffSchedule[]>('/staff/schedules', { params: { clinicId } });
    return res.data;
  },

  // Update a staff member's clinic role + HR attributes.
  updateRole: async (userId: string, data: {
    clinicId: string;
    role: UserRole;
    isPrimary?: boolean;
    designation?: string;
    wageType?: 'MONTHLY' | 'DAILY' | 'HOURLY';
    baseRate?: number;
    shiftType?: 'DAY' | 'NIGHT' | 'ROTATIONAL';
    employmentType?: 'PERMANENT' | 'CONTRACT';
    joiningDate?: string;
    department?: string;
  }): Promise<any> => {
    const res = await api.patch<any>(`/staff/${userId}/role`, data);
    return res.data;
  },

  setSchedule: async (data: {
    clinicId: string;
    userId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration?: number;
    shiftType?: 'DAY' | 'NIGHT' | 'ROTATIONAL';
  }): Promise<StaffSchedule> => {
    const res = await api.post<StaffSchedule>('/staff/schedules', data);
    return res.data;
  },
};

// A staff member is offboarded when their clinic role is DISABLED (or all clinic roles are DISABLED in All Branches mode).
export function isOffboarded(m: StaffMember, clinicId?: string): boolean {
  if (!clinicId) {
    return m.status === 'DISABLED' || (m.clinicRoles?.length ? m.clinicRoles.every(r => r.status === 'DISABLED') : false);
  }
  const role = m.clinicRoles?.find((r) => r.clinicId === clinicId);
  return role ? role.status === 'DISABLED' : m.status === 'DISABLED';
}

// Stable sort that keeps offboarded staff at the end (preserving input order within each group).
export function sortOffboardedLast<T extends StaffMember>(list: T[], clinicId?: string): T[] {
  return [...list].sort((a, b) => Number(isOffboarded(a, clinicId)) - Number(isOffboarded(b, clinicId)));
}

export interface StaffSchedule {
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
  specificDate: string | null;
}
