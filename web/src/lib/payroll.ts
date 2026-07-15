import api from './api';

export interface Payslip {
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
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  department?: string | null;
}

export interface PayrollListResult {
  data: Payslip[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const payrollApi = {
  generate: async (data: {
    clinicId: string;
    period: string;
    adjustments?: Record<string, { bonus?: number; deduction?: number }>;
  }): Promise<Payslip[]> => {
    const res = await api.post<Payslip[]>('/payroll/generate', data);
    return res.data;
  },

  list: async (params: {
    clinicId?: string;
    period?: string;
    status?: string;
    department?: string;
    page?: number;
    limit?: number;
  }): Promise<PayrollListResult> => {
    const res = await api.get<PayrollListResult>('/payroll', { params });
    return res.data;
  },

  markPaid: async (id: string): Promise<Payslip> => {
    const res = await api.post<Payslip>(`/payroll/${id}/pay`, {});
    return res.data;
  },
};
