import api from './api';

export interface Due {
  id: string;
  clinicId: string;
  patientId: string;
  patientName?: string;
  totalAmount: string;
  amountDue: string;
  amountPaid: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'WAIVED';
  paymentMethod: string | null;
  notes: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const billingApi = {
  list: async (params?: { clinicId?: string; patientId?: string; status?: string; page?: number; limit?: number }) => {
    const res = await api.get<PageResponse<Due>>('/dues', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<Due>(`/dues/${id}`);
    return res.data;
  },

  create: async (data: { clinicId: string; patientId: string; amountDue: number; dueDate?: string; notes?: string }) => {
    const res = await api.post<Due>('/dues', data);
    return res.data;
  },

  recordPayment: async (id: string, data: { amount: number; paymentMethod: string }) => {
    const res = await api.post<Due>(`/dues/${id}/pay`, data);
    return res.data;
  },

  waive: async (id: string, data: { reason: string }) => {
    const res = await api.post<Due>(`/dues/${id}/waive`, data);
    return res.data;
  },

  getPatientBalance: async (patientId: string) => {
    const res = await api.get<{ patientId: string; totalDue: string; totalPaid: string; balance: string; pendingCount: number }>(`/dues/patient/${patientId}/balance`);
    return res.data;
  },
};