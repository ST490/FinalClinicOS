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
  byDay: { date: string; rate: number; present: number; total: number }[];
}

export interface PayrollReport {
  period: string | null;
  totalNet: number;
  totalBasic: number;
  totalOvertime: number;
  totalDeduction: number;
  headcount: number;
  byDepartment: { department: string | null; net: number; count: number }[];
  byWageType: { wageType: string | null; net: number; count: number }[];
}

export interface LeaveReport {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  resolutionRate: number;
  byType: { type: string; count: number }[];
}

export interface LabourCostReport {
  period: string | null;
  totalCost: number;
  byDepartment: { department: string | null; cost: number; headcount: number }[];
  byEmploymentType: { employmentType: string; cost: number; headcount: number }[];
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

  payroll: async (clinicId: string, params?: { period?: string }) => {
    const res = await api.get<PayrollReport>(`/reports/payroll/${clinicId}`, { params });
    return res.data;
  },

  leave: async (clinicId: string, params?: { fromDate?: string; toDate?: string }) => {
    const res = await api.get<LeaveReport>(`/reports/leave/${clinicId}`, { params });
    return res.data;
  },

  labourCost: async (clinicId: string, params?: { period?: string }) => {
    const res = await api.get<LabourCostReport>(`/reports/labour-cost/${clinicId}`, { params });
    return res.data;
  },
};