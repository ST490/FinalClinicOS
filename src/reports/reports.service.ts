import { prisma } from '../config/database.js';

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

export async function getRevenueReport(clinicId: string, fromDate: Date, toDate: Date): Promise<RevenueReport> {
  const dues = await prisma.due.findMany({
    where: { clinicId, createdAt: { gte: fromDate, lte: toDate } },
  });

  const totalRevenue = dues.reduce((sum, d) => sum + Number(d.totalAmount), 0);
  const totalDues = dues.reduce((sum, d) => sum + Number(d.amountDue), 0);
  const collectedAmount = dues.reduce((sum, d) => sum + Number(d.amountPaid), 0);

  // Group by payment method
  const byPaymentMethod: Record<string, number> = {};
  const paidDues = dues.filter(d => Number(d.amountPaid) > 0);
  for (const d of paidDues) {
    const method = d.paymentMethod || 'UNKNOWN';
    byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(d.amountPaid);
  }

  // Group by day
  const byDayMap = new Map<string, number>();
  for (const d of paidDues) {
    const day = d.createdAt.toISOString().split('T')[0];
    byDayMap.set(day, (byDayMap.get(day) || 0) + Number(d.amountPaid));
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRevenue: totalRevenue.toFixed(2),
    totalDues: totalDues.toFixed(2),
    collectedAmount: collectedAmount.toFixed(2),
    // ponytail: waived amount is the forgiven portion (billed minus what was paid),
    // not the full billed total.
    waivedAmount: dues.filter(d => d.status === 'WAIVED').reduce((sum, d) => sum + (Number(d.totalAmount) - Number(d.amountPaid)), 0).toFixed(2),
    byPaymentMethod,
    byDay,
  };
}

export async function getPatientReport(clinicId: string, fromDate: Date, toDate: Date): Promise<PatientReport> {
  const visits = await prisma.patientVisit.findMany({
    where: { clinicId, visitDate: { gte: fromDate, lte: toDate } },
    select: { visitDate: true, patientId: true },
  });

  // A patient is "new" only if their first-ever visit falls in the window —
  // not merely someone with a single visit inside it.
  const patientIds = Array.from(new Set(visits.map(v => v.patientId)));
  const earlierVisits = patientIds.length
    ? await prisma.patientVisit.findMany({
        where: {
          clinicId,
          patientId: { in: patientIds },
          visitDate: { lt: fromDate },
        },
        select: { patientId: true },
        distinct: ['patientId'],
      })
    : [];
  const returningIds = new Set(earlierVisits.map(v => v.patientId));

  const totalVisits = visits.length;
  const newPatients = patientIds.filter(id => !returningIds.has(id)).length;
  const returningPatients = patientIds.length - newPatients;

  // Group by day
  const byDayMap = new Map<string, number>();
  for (const v of visits) {
    const day = v.visitDate.toISOString().split('T')[0];
    byDayMap.set(day, (byDayMap.get(day) || 0) + 1);
  }
  const byDate = Array.from(byDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    newPatients,
    returningPatients,
    totalVisits,
    byDate,
  };
}

export async function getInventoryReport(clinicId: string): Promise<InventoryReport> {
  const [items, movements] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { clinicId, deletedAt: null },
    }),
    prisma.stockMovement.groupBy({
      by: ['inventoryItemId'],
      where: { clinicId, type: 'SALE', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _sum: { quantityDelta: true },
    }),
  ]);

  const totalItems = items.length;
  const lowStockItems = items.filter(i => i.quantity <= i.reorderThreshold).length;
  const outOfStock = items.filter(i => i.quantity <= 0).length;

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringItems = items.filter(i => i.expiryDate && i.expiryDate <= thirtyDaysFromNow).length;

  // Top movements
  const movMap = new Map<string, number>();
  for (const m of movements) {
    if (m._sum.quantityDelta) {
      movMap.set(m.inventoryItemId, Math.abs(m._sum.quantityDelta));
    }
  }

  const topMovements = Array.from(movMap.entries())
    .map(([itemId, sold]) => {
      const item = items.find(i => i.id === itemId);
      return { medicineName: item?.customName || 'Unknown', sold };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);

  return { lowStockItems, expiringItems, totalItems, outOfStock, topMovements };
}

export async function getStaffReport(clinicId: string, fromDate: Date, toDate: Date): Promise<StaffReport> {
  const records = await prisma.staffAttendance.findMany({
    where: { clinicId, date: { gte: fromDate, lte: toDate } },
    select: { date: true, status: true },
  });

  const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const late = records.filter(r => r.status === 'LATE').length;
  const absent = records.filter(r => r.status === 'ABSENT').length;
  const attendanceRate = records.length > 0 ? ((present) / records.length) * 100 : 0;

  const byDayMap = new Map<string, { present: number; total: number }>();
  for (const r of records) {
    const day = r.date.toISOString().slice(0, 10);
    const bucket = byDayMap.get(day) || { present: 0, total: 0 };
    bucket.total++;
    if (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY') bucket.present++;
    byDayMap.set(day, bucket);
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, b]) => ({
      date,
      present: b.present,
      total: b.total,
      rate: b.total > 0 ? Math.round((b.present / b.total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    present,
    absent,
    late,
    byDay,
  };
}

// Shared payroll aggregation (used by payroll + labour-cost reports).
async function aggregatePayroll(clinicId: string, period?: string) {
  const rows = await prisma.payroll.findMany({
    where: { clinicId, ...(period && { period }) },
    include: { user: { select: { clinicRoles: true } } },
  });

  const withMeta = rows.map(r => {
    const role = (r.user?.clinicRoles || []).find((cr: any) => cr.clinicId === clinicId);
    return {
      ...r,
      department: role?.department ?? null,
      employmentType: role?.employmentType ?? 'PERMANENT',
    };
  });
  return withMeta;
}

export async function getPayrollReport(clinicId: string, period?: string): Promise<PayrollReport> {
  const rows = await aggregatePayroll(clinicId, period);
  const periodVal = rows[0]?.period ?? null;

  const byDepartmentMap = new Map<string | null, { net: number; count: number }>();
  const byWageTypeMap = new Map<string | null, { net: number; count: number }>();
  for (const r of rows) {
    const d = byDepartmentMap.get(r.department) || { net: 0, count: 0 };
    d.net += Number(r.net); d.count++;
    byDepartmentMap.set(r.department, d);

    const w = byWageTypeMap.get(r.wageType ?? null) || { net: 0, count: 0 };
    w.net += Number(r.net); w.count++;
    byWageTypeMap.set(r.wageType ?? null, w);
  }

  return {
    period: periodVal,
    totalNet: Math.round(rows.reduce((s, r) => s + Number(r.net), 0) * 100) / 100,
    totalBasic: Math.round(rows.reduce((s, r) => s + Number(r.basic), 0) * 100) / 100,
    totalOvertime: Math.round(rows.reduce((s, r) => s + Number(r.overtimePay), 0) * 100) / 100,
    totalDeduction: Math.round(rows.reduce((s, r) => s + Number(r.deduction) + Number(r.advance), 0) * 100) / 100,
    headcount: rows.length,
    byDepartment: Array.from(byDepartmentMap.entries()).map(([department, v]) => ({
      department, net: Math.round(v.net * 100) / 100, count: v.count,
    })),
    byWageType: Array.from(byWageTypeMap.entries()).map(([wageType, v]) => ({
      wageType, net: Math.round(v.net * 100) / 100, count: v.count,
    })),
  };
}

export async function getLabourCostReport(clinicId: string, period?: string): Promise<LabourCostReport> {
  const rows = await aggregatePayroll(clinicId, period);
  const periodVal = rows[0]?.period ?? null;

  const byDeptMap = new Map<string | null, { cost: number; headcount: number }>();
  const byEmpMap = new Map<string, { cost: number; headcount: number }>();
  for (const r of rows) {
    const d = byDeptMap.get(r.department) || { cost: 0, headcount: 0 };
    d.cost += Number(r.net); d.headcount++;
    byDeptMap.set(r.department, d);

    const e = byEmpMap.get(r.employmentType) || { cost: 0, headcount: 0 };
    e.cost += Number(r.net); e.headcount++;
    byEmpMap.set(r.employmentType, e);
  }

  return {
    period: periodVal,
    totalCost: Math.round(rows.reduce((s, r) => s + Number(r.net), 0) * 100) / 100,
    byDepartment: Array.from(byDeptMap.entries()).map(([department, v]) => ({
      department, cost: Math.round(v.cost * 100) / 100, headcount: v.headcount,
    })),
    byEmploymentType: Array.from(byEmpMap.entries()).map(([employmentType, v]) => ({
      employmentType, cost: Math.round(v.cost * 100) / 100, headcount: v.headcount,
    })),
  };
}

export async function getLeaveReport(clinicId: string, fromDate: Date, toDate: Date): Promise<LeaveReport> {
  const leaves = await prisma.leaveRequest.findMany({
    where: { clinicId, fromDate: { gte: fromDate }, toDate: { lte: toDate } },
  });

  const byTypeMap = new Map<string, number>();
  let pending = 0, approved = 0, rejected = 0;
  for (const l of leaves) {
    byTypeMap.set(l.type, (byTypeMap.get(l.type) || 0) + 1);
    if (l.status === 'PENDING') pending++;
    else if (l.status === 'APPROVED') approved++;
    else if (l.status === 'REJECTED') rejected++;
  }
  const resolved = approved + rejected;
  const resolutionRate = resolved > 0 ? Math.round((approved / resolved) * 10000) / 100 : 0;

  return {
    total: leaves.length,
    pending,
    approved,
    rejected,
    resolutionRate,
    byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count })),
  };
}