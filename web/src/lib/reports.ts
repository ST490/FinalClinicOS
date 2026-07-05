import api from './api';

export interface RevenueReport {
  totalRevenue: string;
  totalDues: string;
  collectedAmount: string;
  waivedAmount: string;
  byPaymentMethod: Record<string, number>;
  byDay: { date: string; amount: number }[];
}

export interface PatientReport {
  newPatients: number;
  returningPatients: number;
  totalVisits: number;
  byDate: { date: string; count: number }[];
}

export interface InventoryReport {
  lowStockItems: number;
  expiringItems: number;
  totalItems: number;
  outOfStock: number;
  topMovements: { medicineName: string; sold: number }[];
}

export interface StaffReport {
  attendanceRate: number;
  present: number;
  absent: number;
  late: number;
}

export const reportsApi = {
  revenue: async (clinicId: string, params?: { fromDate?: string; toDate?: string }) => {
    const res = await api.get<RevenueReport>(`/reports/revenue/${clinicId}`, { params });
    return res.data;
  },

  patients: async (clinicId: string, params?: { fromDate?: string; toDate?: string }) => {
    const res = await api.get<PatientReport>(`/reports/patients/${clinicId}`, { params });
    return res.data;
  },

  inventory: async (clinicId: string) => {
    const res = await api.get<InventoryReport>(`/reports/inventory/${clinicId}`);
    return res.data;
  },

  staff: async (clinicId: string, params?: { fromDate?: string; toDate?: string }) => {
    const res = await api.get<StaffReport>(`/reports/staff/${clinicId}`, { params });
    return res.data;
  },
};