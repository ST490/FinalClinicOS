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
    waivedAmount: dues.filter(d => d.status === 'WAIVED').reduce((sum, d) => sum + Number(d.totalAmount), 0).toFixed(2),
    byPaymentMethod,
    byDay,
  };
}

export async function getPatientReport(clinicId: string, fromDate: Date, toDate: Date): Promise<PatientReport> {
  const visits = await prisma.patientVisit.findMany({
    where: { clinicId, visitDate: { gte: fromDate, lte: toDate } },
    select: { visitDate: true, patientId: true },
  });

  // Count unique patients, group by patient
  const firstVisits = await prisma.patientVisit.groupBy({
    by: ['patientId'],
    _count: true,
    where: { clinicId, visitDate: { gte: fromDate, lte: toDate } },
  });

  const totalVisits = visits.length;
  const newPatients = firstVisits.filter(f => f._count === 1).length;
  const returningPatients = totalVisits - newPatients;

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
    select: { status: true },
  });

  const present = records.filter(r => r.status === 'PRESENT').length;
  const late = records.filter(r => r.status === 'LATE').length;
  const absent = records.filter(r => r.status === 'ABSENT').length;
  const attendanceRate = records.length > 0 ? ((present + late) / records.length) * 100 : 0;

  return { attendanceRate: Math.round(attendanceRate * 100) / 100, present, absent, late };
}