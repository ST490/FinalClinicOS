import api from './api';

export interface AttendanceRecord {
  id: string;
  clinicId: string;
  orgId: string;
  userId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  notes: string | null;
  clinicName?: string;
  userName?: string;
  department?: string | null;
}

export interface AttendanceSearchResult {
  data: AttendanceRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  attendanceRate: number;
  byDay: { date: string; rate: number; present: number; total: number }[];
}

export const attendanceApi = {
  today: async (clinicId: string): Promise<AttendanceRecord[]> => {
    const res = await api.get<AttendanceRecord[]>(`/attendance/today/${clinicId}`);
    return res.data;
  },

  search: async (params: {
    clinicId?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    department?: string;
    page?: number;
    limit?: number;
  }): Promise<AttendanceSearchResult> => {
    const res = await api.get<AttendanceSearchResult>('/attendance', { params });
    return res.data;
  },

  clockIn: async (data: {
    clinicId: string;
    userId: string;
    date?: string;
    checkIn?: string;
    status?: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'ABSENT';
    notes?: string;
  }): Promise<AttendanceRecord> => {
    const res = await api.post<AttendanceRecord>('/attendance/clock-in', data);
    return res.data;
  },

  clockOut: async (id: string, data?: { checkOut?: string }): Promise<AttendanceRecord> => {
    const res = await api.post<AttendanceRecord>(`/attendance/${id}/clock-out`, data || {});
    return res.data;
  },

  summary: async (clinicId: string, params?: { fromDate?: string; toDate?: string }): Promise<AttendanceSummary> => {
    const res = await api.get<AttendanceSummary>(`/attendance/summary/${clinicId}`, { params });
    return res.data;
  },
};
