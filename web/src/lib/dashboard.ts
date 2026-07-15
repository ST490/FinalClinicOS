import api from './api';

/**
 * Dashboard aggregation client.
 * The backend exposes per-domain report endpoints (/reports/revenue, /reports/patients, etc.).
 * We compose them client-side rather than adding a new composite endpoint — keeps the
 * backend surface stable. If any individual call fails, that field falls back to 0.
 */

export interface DashboardStats {
  totalPatients: number;
  totalAppointmentsToday: number;
  totalRevenue: string;
  totalDuesPending: string;
  staffOnDuty: number;
  lowStockItems: number;
  totalInventoryItems: number;
}

// Shapes mirror src/reports/reports.service.ts exactly.
interface RevenueReport {
  totalRevenue: string | number;
  totalDues?: string | number;
}
interface PatientReport {
  newPatients: number;
  returningPatients: number;
  totalVisits: number;
}
interface InventoryReport {
  lowStockItems: number;
  totalItems: number;
}
interface AttendanceRecord {
  status: 'PRESENT' | 'LATE' | 'ABSENT' | string;
}

const EMPTY: DashboardStats = {
  totalPatients: 0, totalAppointmentsToday: 0, totalRevenue: '0',
  totalDuesPending: '0', staffOnDuty: 0, lowStockItems: 0, totalInventoryItems: 0,
};

// Backend has no single /reports/dashboard endpoint. Compose in-browser from the
// per-domain report/list endpoints — every one is a real DB aggregate. Any single
// call that fails degrades only its own field(s) to 0, never the whole dashboard.
export const dashboardApi = {
  getStats: async (clinicId: string): Promise<DashboardStats> => {
    if (!clinicId) return { ...EMPTY };

    // Today's [start, end) for the appointments count.
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const [revenue, patients, inventory, attendance, appts] = await Promise.allSettled([
      api.get<RevenueReport>(`/reports/revenue/${clinicId}`),
      api.get<PatientReport>(`/reports/patients/${clinicId}`),
      api.get<InventoryReport>(`/reports/inventory/${clinicId}`),
      api.get<AttendanceRecord[]>(`/attendance/today/${clinicId}`),
      api.get<{ pagination?: { total?: number } }>('/appointments', {
        params: { clinicId, fromDate: start.toISOString(), toDate: end.toISOString(), limit: 1 },
      }),
    ]);

    const r = revenue.status === 'fulfilled' ? revenue.value.data : null;
    const p = patients.status === 'fulfilled' ? patients.value.data : null;
    const inv = inventory.status === 'fulfilled' ? inventory.value.data : null;
    const att = attendance.status === 'fulfilled' ? attendance.value.data : null;
    const ap = appts.status === 'fulfilled' ? appts.value.data : null;

    return {
      totalPatients: p?.totalVisits ?? 0,
      totalAppointmentsToday: ap?.pagination?.total ?? 0,
      totalRevenue: String(r?.totalRevenue ?? 0),
      totalDuesPending: String(r?.totalDues ?? 0),
      staffOnDuty: Array.isArray(att) ? att.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length : 0,
      lowStockItems: inv?.lowStockItems ?? 0,
      totalInventoryItems: inv?.totalItems ?? 0,
    };
  },
};
