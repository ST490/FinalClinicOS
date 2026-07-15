import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { ClockInInput, ClockOutInput, AttendanceResponse, SearchAttendanceInput, AttendanceSummary } from './types/attendance.types.js';

export class AttendanceService {
  // Shared include so department (from the worker's clinic role) rides along.
  private attendanceInclude = {
    clinic: { select: { name: true } },
    user: { select: { name: true, clinicRoles: true } },
  } as const;

  private departmentFor(record: any): string | null | undefined {
    const role = (record.user?.clinicRoles || []).find((r: any) => r.clinicId === record.clinicId);
    return role?.department ?? null;
  }

  async clockIn(input: ClockInInput): Promise<AttendanceResponse> {
    // Check if already clocked in today
    const date = new Date(input.date || new Date().toISOString().split('T')[0]);
    const existing = await prisma.staffAttendance.findFirst({
      where: { userId: input.userId, date },
    });

    // Department is copied from the worker's clinic role at clock-in time.
    const role = await prisma.userClinicRole.findFirst({
      where: { userId: input.userId, clinicId: input.clinicId },
    });

    if (existing) {
      const updated = await prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          checkIn: input.checkIn ? new Date(`${input.date}T${input.checkIn}:00`) : new Date(),
          status: input.status as any || 'PRESENT',
          notes: input.notes,
          department: role?.department ?? null,
        },
        include: this.attendanceInclude,
      });
      return this.formatAttendance(updated);
    }

    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const record = await prisma.staffAttendance.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        userId: input.userId,
        date,
        checkIn: input.checkIn ? new Date(`${input.date}T${input.checkIn}:00`) : new Date(),
        status: input.status as any || 'PRESENT',
        notes: input.notes,
        department: role?.department ?? null,
      },
      include: this.attendanceInclude,
    });

    return this.formatAttendance(record);
  }

  async clockOut(attendanceId: string, input: ClockOutInput): Promise<AttendanceResponse> {
    const record = await prisma.staffAttendance.update({
      where: { id: attendanceId },
      data: {
        checkOut: input.checkOut ? new Date(input.checkOut) : new Date(),
      },
      include: this.attendanceInclude,
    });
    return this.formatAttendance(record);
  }

  async search(input: SearchAttendanceInput): Promise<{ data: AttendanceResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.StaffAttendanceWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.userId && { userId: input.userId }),
      ...(input.status && { status: input.status as any }),
      ...(input.department && { department: input.department }),
      ...(input.fromDate && { date: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { date: { lte: new Date(input.toDate) } }),
    };

    const [records, total] = await Promise.all([
      prisma.staffAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: this.attendanceInclude,
      }),
      prisma.staffAttendance.count({ where }),
    ]);

    return {
      data: records.map(r => this.formatAttendance(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTodayAttendance(clinicId: string): Promise<AttendanceResponse[]> {
    const today = new Date();
    const records = await prisma.staffAttendance.findMany({
      where: { clinicId, date: today },
      include: this.attendanceInclude,
      orderBy: { checkIn: 'asc' },
    });
    return records.map(r => this.formatAttendance(r));
  }

  // Aggregate attendance for a date range + per-day trend (for HR dashboard).
  async getSummary(clinicId: string, from: Date, to: Date): Promise<AttendanceSummary> {
    const records = await prisma.staffAttendance.findMany({
      where: { clinicId, date: { gte: from, lte: to } },
      select: { date: true, status: true },
    });

    let present = 0, absent = 0, late = 0, halfDay = 0, leave = 0;
    const byDayMap = new Map<string, { present: number; total: number }>();
    for (const r of records) {
      const day = r.date.toISOString().slice(0, 10);
      const bucket = byDayMap.get(day) || { present: 0, total: 0 };
      bucket.total++;
      const isPresent = r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY';
      if (isPresent) bucket.present++;
      if (r.status === 'PRESENT' || r.status === 'LATE') present++;
      else if (r.status === 'ABSENT') absent++;
      else if (r.status === 'LATE') late++;
      else if (r.status === 'HALF_DAY') halfDay++;
      else if (r.status === 'LEAVE') leave++;
      byDayMap.set(day, bucket);
    }

    const total = records.length;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 10000) / 100 : 0;
    const byDay = Array.from(byDayMap.entries())
      .map(([date, b]) => ({
        date,
        present: b.present,
        total: b.total,
        rate: b.total > 0 ? Math.round((b.present / b.total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { total, present, absent, late, halfDay, leave, attendanceRate, byDay };
  }

  private formatAttendance(record: any): AttendanceResponse {
    return {
      id: record.id,
      clinicId: record.clinicId,
      orgId: record.orgId,
      userId: record.userId,
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      notes: record.notes,
      createdAt: record.createdAt,
      clinicName: record.clinic?.name,
      userName: record.user?.name,
      department: this.departmentFor(record),
    };
  }
}

export const attendanceService = new AttendanceService();