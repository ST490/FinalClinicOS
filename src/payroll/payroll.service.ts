import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  GeneratePayrollInput, ListPayrollInput, PayrollResponse,
} from './payroll.types.js';

const payrollInclude = {
  user: { select: { name: true, clinicRoles: true } },
  clinic: { select: { name: true } },
} as const;

function periodRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

function daysInMonth(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function departmentFor(record: any): string | null | undefined {
  const role = (record.user?.clinicRoles || []).find((r: any) => r.clinicId === record.clinicId);
  return role?.department ?? null;
}

function toResponse(record: any): PayrollResponse {
  return {
    id: record.id,
    clinicId: record.clinicId,
    orgId: record.orgId,
    userId: record.userId,
    period: record.period,
    daysPresent: record.daysPresent,
    daysAbsent: record.daysAbsent,
    daysLeave: record.daysLeave,
    daysHalfDay: record.daysHalfDay,
    basic: Number(record.basic),
    bonus: Number(record.bonus),
    deduction: Number(record.deduction),
    net: Number(record.net),
    wageType: record.wageType ?? null,
    overtimeHours: Number(record.overtimeHours ?? 0),
    overtimePay: Number(record.overtimePay ?? 0),
    advance: Number(record.advance ?? 0),
    arrears: Number(record.arrears ?? 0),
    status: record.status,
    paidAt: record.paidAt ? record.paidAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    userName: record.user?.name,
    department: departmentFor(record),
  };
}

// Hours between two ISO datetimes, or 0 if either is missing.
function hoursBetween(checkIn?: string | Date | null, checkOut?: string | Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return ms > 0 ? ms / (1000 * 60 * 60) : 0;
}

export class PayrollService {
  // Generate (or refresh) payslips for all SUPPORT staff in a clinic for a month.
  async generate(input: GeneratePayrollInput): Promise<PayrollResponse[]> {
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const { start, end } = periodRange(input.period);
    const workingDays = daysInMonth(input.period);

    // Scheduled daily hours per user (from active weekly shifts), default 8.
    const schedules = await prisma.staffSchedule.findMany({
      where: { clinicId: input.clinicId, isActive: true },
      select: { userId: true, startTime: true, endTime: true },
    });
    const scheduledHours = new Map<string, number>();
    for (const s of schedules) {
      const h = hoursBetween(`2000-01-01T${s.startTime}:00`, `2000-01-01T${s.endTime}:00`);
      if (!scheduledHours.has(s.userId)) scheduledHours.set(s.userId, h || 8);
    }

    // All staff with a base rate set — across every role (not just SUPPORT).
    const roles = await prisma.userClinicRole.findMany({
      where: { clinicId: input.clinicId, salary: { not: null } },
      include: {
        user: {
          select: {
            name: true,
            clinicRoles: true,
            attendance: {
              where: { date: { gte: start, lt: end } },
            },
          },
        },
      },
    });

    const results: PayrollResponse[] = [];
    for (const role of roles) {
      const baseRate = Number(role.salary ?? 0);
      const wageType = (role.wageType ?? 'MONTHLY') as 'MONTHLY' | 'DAILY' | 'HOURLY';
      const attendance = role.user.attendance as any[];
      const dailyHours = scheduledHours.get(role.userId) ?? 8;

      const days = new Set<string>();
      let daysPresent = 0;
      let daysHalfDay = 0;
      let daysLeave = 0;
      let overtimeHours = 0;
      for (const a of attendance) {
        days.add(a.date.toISOString().slice(0, 10));
        if (a.status === 'PRESENT' || a.status === 'LATE') daysPresent++;
        else if (a.status === 'HALF_DAY') daysHalfDay++;
        else if (a.status === 'LEAVE') daysLeave++;
        // Overtime = hours worked beyond the scheduled shift.
        overtimeHours += Math.max(0, hoursBetween(a.checkIn, a.checkOut) - dailyHours);
      }
      overtimeHours = Math.round(overtimeHours * 100) / 100;
      const daysWorked = daysPresent + 0.5 * daysHalfDay;
      const daysAbsent = Math.max(0, workingDays - days.size);

      // Hourly-equivalent rate for overtime (1.5×).
      const hourlyEquiv =
        wageType === 'MONTHLY' ? baseRate / workingDays / 8
        : wageType === 'DAILY' ? baseRate / 8
        : baseRate;
      const overtimePay = Math.round(overtimeHours * hourlyEquiv * 1.5 * 100) / 100;

      // Earned base by wage type (excluding overtime).
      let basic: number;
      if (wageType === 'MONTHLY') basic = (baseRate / workingDays) * daysWorked;
      else if (wageType === 'DAILY') basic = baseRate * daysPresent;
      else basic = baseRate * daysPresent * dailyHours; // HOURLY
      basic = Math.round(basic * 100) / 100;

      const adj = input.adjustments?.[role.userId] ?? {};
      const bonus = Number(adj.bonus ?? 0);
      const deduction = Number(adj.deduction ?? 0);
      const advance = Number(adj.advance ?? 0);
      const arrears = Number(adj.arrears ?? 0);
      const net = Math.round((basic + overtimePay + arrears + bonus - deduction - advance) * 100) / 100;

      const record = await prisma.payroll.upsert({
        where: { userId_period: { userId: role.userId, period: input.period } },
        create: {
          clinicId: input.clinicId,
          orgId: clinic.orgId,
          userId: role.userId,
          period: input.period,
          daysPresent, daysAbsent, daysLeave, daysHalfDay,
          basic, bonus, deduction, net,
          wageType, overtimeHours, overtimePay, advance, arrears,
          status: 'DRAFT',
        },
        update: {
          daysPresent, daysAbsent, daysLeave, daysHalfDay,
          basic, bonus, deduction, net,
          wageType, overtimeHours, overtimePay, advance, arrears,
        },
        include: payrollInclude,
      });
      results.push(toResponse(record));
    }
    return results;
  }

  async approve(id: string): Promise<PayrollResponse> {
    const record = await prisma.payroll.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: payrollInclude,
    });
    return toResponse(record);
  }

  async list(input: ListPayrollInput): Promise<{ data: PayrollResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PayrollWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.userId && { userId: input.userId }),
      ...(input.period && { period: input.period }),
      ...(input.status && { status: input.status }),
    };

    const [records, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ period: 'desc' }, { user: { name: 'asc' } }],
        include: payrollInclude,
      }),
      prisma.payroll.count({ where }),
    ]);

    const data = records
      .map(toResponse)
      .filter((r) => !input.department || r.department === input.department);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async markPaid(id: string): Promise<PayrollResponse> {
    const record = await prisma.payroll.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
      include: payrollInclude,
    });
    return toResponse(record);
  }
}

export const payrollService = new PayrollService();
