import { AppointmentType, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentSearchInput,
  DoctorAvailabilityInput,
  SlotAvailability,
  AppointmentResponse,
  PaginatedAppointmentsResponse,
} from './types/appointment.types.js';
import { AppError } from '../common/errors.js';

export class AppointmentService {
  async create(input: CreateAppointmentInput): Promise<AppointmentResponse> {
    // Lookup clinic for orgId
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const slotStart = new Date(input.slotStart);
    const slotEnd = new Date(input.slotEnd);

    // Double-booking prevention: check if doctor has active appointment at this time
    // Uses raw SQL partial index (see migration 00003) for DB-level enforcement
    const conflicting = await prisma.appointment.findFirst({
      where: {
        doctorId: input.doctorId,
        status: { not: 'CANCELLED' },
        OR: [
          // New slot overlaps with existing
          { slotStart: { lte: slotStart }, slotEnd: { gt: slotStart } },
          { slotStart: { lt: slotEnd }, slotEnd: { gte: slotEnd } },
          // New slot contains existing
          { slotStart: { gte: slotStart }, slotEnd: { lte: slotEnd } },
        ],
      },
    });

    if (conflicting) {
      throw new AppError('DOUBLE_BOOKING', 'This time slot is already booked for this doctor', 409);
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        slotStart,
        slotEnd,
        type: input.type || AppointmentType.SCHEDULED,
        notes: input.notes,
        isNewPatient: input.isNewPatient || false,
        createdById: input.createdById,
      },
      include: {
        clinic: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    return this.formatAppointment(appointment);
  }

  async update(id: string, input: UpdateAppointmentInput): Promise<AppointmentResponse> {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw new Error('Appointment not found');

    // If rescheduling, check for conflicts at new time
    if (input.slotStart || input.slotEnd) {
      const newStart = input.slotStart ? new Date(input.slotStart) : existing.slotStart;
      const newEnd = input.slotEnd ? new Date(input.slotEnd) : existing.slotEnd;

      const conflicting = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: existing.doctorId,
          status: { not: 'CANCELLED' },
          OR: [
            { slotStart: { lte: newStart }, slotEnd: { gt: newStart } },
            { slotStart: { lt: newEnd }, slotEnd: { gte: newEnd } },
            { slotStart: { gte: newStart }, slotEnd: { lte: newEnd } },
          ],
        },
      });

      if (conflicting) {
        throw new AppError('DOUBLE_BOOKING', 'This time slot is already booked for this doctor', 409);
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(input.slotStart && { slotStart: new Date(input.slotStart) }),
        ...(input.slotEnd && { slotEnd: new Date(input.slotEnd) }),
        ...(input.status && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.queuePosition !== undefined && { queuePosition: input.queuePosition }),
        ...(input.type && { type: input.type }),
      },
      include: {
        clinic: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    return this.formatAppointment(appointment);
  }

  async cancel(id: string, cancelledById: string): Promise<AppointmentResponse> {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById,
      },
      include: {
        clinic: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    return this.formatAppointment(appointment);
  }

  async findById(id: string): Promise<AppointmentResponse | null> {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        clinic: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        visit: { select: { id: true, visitDate: true } },
      },
    });

    return appointment ? this.formatAppointment(appointment) : null;
  }

  async search(input: AppointmentSearchInput): Promise<PaginatedAppointmentsResponse> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.doctorId && { doctorId: input.doctorId }),
      ...(input.patientId && { patientId: input.patientId }),
      ...(input.status && (Array.isArray(input.status) ? { status: { in: input.status } } : { status: input.status })),
      ...(input.type && { type: input.type }),
      ...(input.fromDate && { slotStart: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { slotStart: { lte: new Date(input.toDate) } }),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [input.sortBy || 'slotStart']: input.sortOrder || 'asc' },
        include: {
          clinic: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments.map((a) => this.formatAppointment(a)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AVAILABILITY & SLOT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  async getDoctorAvailability(input: DoctorAvailabilityInput): Promise<SlotAvailability[]> {
    const doctorSchedule = await prisma.staffSchedule.findFirst({
      where: {
        userId: input.doctorId,
        clinicId: input.clinicId,
        isActive: true,
        OR: [{ dayOfWeek: new Date(input.date).getDay() }, { specificDate: new Date(input.date) }],
      },
    });

    if (!doctorSchedule) {
      return []; // No schedule = not available
    }

    const dateStr = input.date;
    const slots: SlotAvailability[] = [];
    const slotDuration = doctorSchedule.slotDuration || 30;

    let current = new Date(`${dateStr}T${doctorSchedule.startTime}:00`);
    const dayEnd = new Date(`${dateStr}T${doctorSchedule.endTime}:00`);

    // Get existing appointments for this doctor on this date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: input.doctorId,
        status: { not: 'CANCELLED' },
        slotStart: { gte: new Date(`${dateStr}T00:00:00`), lt: new Date(`${dateStr}T23:59:59`) },
      },
      select: { slotStart: true, slotEnd: true, id: true },
    });

    // Generate slots
    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);
      if (slotEnd > dayEnd) break;

      const overlapping = existingAppointments.find(
        (a) => a.slotStart < slotEnd && a.slotStart >= current
      );

      slots.push({
        slotStart: new Date(current),
        slotEnd: slotEnd,
        available: !overlapping,
        existingAppointmentId: overlapping?.id,
      });

      current = slotEnd;
    }

    return slots;
  }

  async getDoctorSchedule(clinicId: string, doctorId: string) {
    return prisma.staffSchedule.findMany({
      where: { clinicId, userId: doctorId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  private formatAppointment(appointment: any): AppointmentResponse {
    return {
      id: appointment.id,
      clinicId: appointment.clinicId,
      orgId: appointment.orgId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      slotStart: appointment.slotStart,
      slotEnd: appointment.slotEnd,
      type: appointment.type,
      status: appointment.status,
      visitId: appointment.visitId,
      notes: appointment.notes,
      isNewPatient: appointment.isNewPatient,
      queuePosition: appointment.queuePosition,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      clinic: appointment.clinic,
      patient: appointment.patient,
      doctor: appointment.doctor,
    };
  }
}

export const appointmentService = new AppointmentService();