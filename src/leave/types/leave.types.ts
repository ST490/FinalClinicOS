import type { LeaveStatus } from '@prisma/client';

// Default annual leave allotment per staff member (inspiration: 18 days).
export const LEAVE_ALLOTTED = 18;

export interface CreateLeaveInput {
  clinicId: string;
  userId: string; // applicant
  type: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  days: number;
  reason?: string;
}

export interface UpdateLeaveStatusInput {
  status: 'APPROVED' | 'REJECTED';
  reviewedById: string;
}

export interface ListLeaveInput {
  clinicId?: string;
  userId?: string;
  status?: LeaveStatus;
  type?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface LeaveResponse {
  id: string;
  clinicId: string;
  orgId: string;
  userId: string;
  userName?: string;
  department?: string | null;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  appliedOn: string;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  userId: string;
  name: string;
  department: string | null;
  allotted: number;
  used: number;
  balance: number;
}
