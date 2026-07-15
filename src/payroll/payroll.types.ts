import type { PayrollStatus } from '@prisma/client';

export interface GeneratePayrollInput {
  clinicId: string;
  period: string; // "YYYY-MM"
  // Optional per-user overrides keyed by userId.
  adjustments?: Record<string, {
    bonus?: number;
    deduction?: number;
    advance?: number;
    arrears?: number;
  }>;
}

export interface ListPayrollInput {
  clinicId?: string;
  userId?: string;
  period?: string;
  status?: PayrollStatus;
  department?: string;
  page?: number;
  limit?: number;
}

export interface PayrollResponse {
  id: string;
  clinicId: string;
  orgId: string;
  userId: string;
  period: string;
  daysPresent: number;
  daysAbsent: number;
  daysLeave: number;
  daysHalfDay: number;
  basic: number;
  bonus: number;
  deduction: number;
  net: number;
  wageType?: string | null;
  overtimeHours: number;
  overtimePay: number;
  advance: number;
  arrears: number;
  status: PayrollStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  department?: string | null;
}

export interface MarkPaidInput {
  userId?: string;
}
