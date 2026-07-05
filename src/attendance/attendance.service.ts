import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { ClockInInput, ClockOutInput, AttendanceResponse, SearchAttendanceInput } from './types/attendance.types.js';

export class AttendanceService {
  async clockIn(input: ClockInInput): Promise<AttendanceResponse> {
    // Check if already clocked in today
    const date = new Date(input.date || new Date().toISOString().split('T')[0]);
    const existing = await prisma.staffAttendance.findFirst({
      where: { userId: input.userId, date },
    });

    if (existing) {
      const updated = await prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          checkIn: input.checkIn ? new Date(`${input.date}T${input.checkIn}:00`) : new Date(),
          status: input.status as any || 'PRESENT',
          notes: input.notes,
        },
        include: { clinic: { select: { name: true } }, user: { select: { name: true } } },
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
      },
      include: { clinic: { select: { name: true } }, user: { select: { name: true } } },
    });

    return this.formatAttendance(record);
  }

  async clockOut(attendanceId: string, input: ClockOutInput): Promise<AttendanceResponse> {
    const record = await prisma.staffAttendance.update({
      where: { id: attendanceId },
      data: {
        checkOut: input.checkOut ? new Date(input.checkOut) : new Date(),
      },
      include: { clinic: { select: { name: true } }, user: { select: { name: true } } },
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
      ...(input.fromDate && { date: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { date: { lte: new Date(input.toDate) } }),
    };

    const [records, total] = await Promise.all([
      prisma.staffAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { clinic: { select: { name: true } }, user: { select: { name: true } } },
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
      include: { clinic: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { checkIn: 'asc' },
    });
    return records.map(r => this.formatAttendance(r));
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
    };
  }
}

export const attendanceService = new AttendanceService();