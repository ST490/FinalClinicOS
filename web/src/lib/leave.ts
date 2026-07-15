import api from './api';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  clinicId: string;
  orgId: string;
  userId: string;
  userName?: string;
  department?: string | null;
  type: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
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

export interface LeaveListResult {
  data: LeaveRequest[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateLeaveInput {
  clinicId: string;
  userId: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason?: string;
}

export const leaveApi = {
  list: async (params: {
    clinicId?: string;
    userId?: string;
    status?: LeaveStatus;
    type?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<LeaveListResult> => {
    const res = await api.get<LeaveListResult>('/leave', { params });
    return res.data;
  },

  create: async (data: CreateLeaveInput): Promise<LeaveRequest> => {
    const res = await api.post<LeaveRequest>('/leave', data);
    return res.data;
  },

  updateStatus: async (id: string, status: 'APPROVED' | 'REJECTED'): Promise<LeaveRequest> => {
    const res = await api.post<LeaveRequest>(`/leave/${id}/status`, { status });
    return res.data;
  },

  // Self-service: the logged-in user requests leave for themselves.
  request: async (data: {
    clinicId: string;
    type: string;
    fromDate: string;
    toDate: string;
    reason?: string;
  }): Promise<LeaveRequest> => {
    const res = await api.post<LeaveRequest>('/leave/request', data);
    return res.data;
  },

  balances: async (clinicId: string, year?: number): Promise<LeaveBalance[]> => {
    const res = await api.get<LeaveBalance[]>('/leave/balances', { params: { clinicId, year } });
    return res.data;
  },
};
