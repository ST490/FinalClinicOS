import { AppointmentType, AppointmentCategory, Prisma } from '@prisma/client';
import { defaultTx } from '../config/database.js';
import type { Tx } from '../config/database.js';
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentSearchInput,
  DoctorAvailabilityInput,
  SlotAvailability,
  AppointmentResponse,
  PaginatedAppointmentsResponse,
} from './types/appointment.types.js';
import { AppError, ForbiddenError } from '../common/errors.js';
import { reminderService } from '../reminders/reminder.service.js';
import { auditService } from '../audit/audit.service.js';

export class AppointmentService {
  async create(input: CreateAppointmentInput, tx: Tx = defaultTx): Promise<AppointmentResponse> {
    // Lookup clinic for orgId
    const clinic = await tx.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    // ponytail: tenant scoping â€” referenced patient must belong to this org,
    // referenced doctor must be active at this clinic.
    let patientConsent: { phone: string | null; whatsappConsent: boolean; smsConsent: boolean } | null = null;
    if (input.patientId) {
      const patient = await tx.patient.findUnique({
        where: { id: input.patientId },
        select: { orgId: true, phone: true, whatsappConsent: true, smsConsent: true },
      });
      if (!patient || patient.orgId !== clinic.orgId) throw new ForbiddenError('Patient does not belong to this organization');
      patientConsent = { phone: patient.phone, whatsappConsent: patient.whatsappConsent, smsConsent: patient.smsConsent };
    }
    if (input.doctorId) {
      const role = await tx.userClinicRole.findFirst({ where: { userId: input.doctorId, clinicId: input.clinicId, status: 'ACTIVE' } });
      if (!role) throw new ForbiddenError('Doctor is not active at this clinic');
    }

    const slotStart = new Date(input.slotStart);
    const slotEnd = new Date(input.slotEnd);

    // Double-booking prevention: check if doctor has active appointment at this time
    // Uses raw SQL partial index (see migration 00003) for DB-level enforcement
    const conflicting = await tx.appointment.findFirst({
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

    // Category drives the isNewPatient flag: FIRST_TIME implies a new patient.
    const category = input.category || AppointmentCategory.RETURNING;
    const isNewPatient =
      input.isNewPatient !== undefined
        ? input.isNewPatient
        : category === AppointmentCategory.FIRST_TIME;

    const appointment = await tx.appointment.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        slotStart,
        slotEnd,
        type: input.type || AppointmentType.SCHEDULED,
        notes: input.notes,
        isNewPatient,
        category,
        createdById: input.createdById,
      },
      include: {
        clinic: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    // ponytail: auto-bridge â€” schedule an appointment reminder on booking. Best-effort:
    // never fail the booking if reminder creation fails. Channel is chosen by consent
    // (WhatsApp preferred, SMS fallback); consent is re-verified at dispatch too.
    if (input.patientId && patientConsent?.phone) {
      const channel = patientConsent.whatsappConsent ? 'WHATSAPP' : patientConsent.smsConsent ? 'SMS' : null;
      if (channel) {
        const remindAt = new Date(slotStart.getTime() - 24 * 60 * 60 * 1000);
        const scheduledAt = remindAt.getTime() > Date.now() ? remindAt : new Date();
        try {
          await reminderService.create({
            clinicId: input.clinicId,
            patientId: input.patientId,
            appointmentId: appointment.id,
            channel,
            templateId: 'APPOINTMENT_REMINDER',
            scheduledAt: scheduledAt.toISOString(),
          }, tx);
        } catch (e) {
          console.error('[AppointmentService] auto-reminder scheduling failed:', e);
        }
      }
    }

    await auditService.log({
      orgId: clinic.orgId,
      clinicId: input.clinicId,
      userId: input.createdById,
      action: 'CREATE',
      entityType: 'APPOINTMENT',
      entityId: appointment.id,
      after: this.formatAppointment(appointment),
    }, tx).catch(() => {});

    return this.formatAppointment(appointment);
  }

  async update(id: string, input: UpdateAppointmentInput, tx: Tx = defaultTx): Promise<AppointmentResponse> {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) throw new Error('Appointment not found');

    // If rescheduling, check for conflicts at new time
    if (input.slotStart || input.slotEnd) {
      const newStart = input.slotStart ? new Date(input.slotStart) : existing.slotStart;
      const newEnd = input.slotEnd ? new Date(input.slotEnd) : existing.slotEnd;

      const conflicting = await tx.appointment.findFirst({
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

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        ...(input.slotStart && { slotStart: new Date(input.slotStart) }),
        ...(input.slotEnd && { slotEnd: new Date(input.slotEnd) }),
        ...(input.status && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.queuePosition !== undefined && { queuePosition: input.queuePosition }),
        ...(input.type && { type: input.type }),
        ...(input.category && {
          category: input.category,
          isNewPatient: input.category === AppointmentCategory.FIRST_TIME,
        }),
      },
      include: {
        clinic: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    return this.formatAppointment(appointment);
  }

  async cancel(id: string, cancelledById: string, tx: Tx = defaultTx): Promise<AppointmentResponse> {
    const appointment = await tx.appointment.update({
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

    await auditService.log({
      orgId: appointment.orgId,
      clinicId: appointment.clinicId,
      userId: cancelledById,
      action: 'CANCEL',
      entityType: 'APPOINTMENT',
      entityId: id,
      after: this.formatAppointment(appointment),
    }, tx).catch(() => {});

    return this.formatAppointment(appointment);
  }

  async findById(id: string, tx: Tx = defaultTx): Promise<AppointmentResponse | null> {
    const appointment = await tx.appointment.findUnique({
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

  async search(input: AppointmentSearchInput, tx: Tx = defaultTx): Promise<PaginatedAppointmentsResponse> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.doctorId && { doctorId: input.doctorId }),
      ...(input.patientId && { patientId: input.patientId }),
      ...(input.status && (Array.isArray(input.status) ? { status: { in: input.status } } : { status: input.status })),
      ...(input.type && { type: input.type }),
      ...(input.category && { category: input.category }),
      ...(input.fromDate && { slotStart: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { slotStart: { lte: new Date(input.toDate) } }),
    };

    const [appointments, total] = await Promise.all([
      tx.appointment.findMany({
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
      tx.appointment.count({ where }),
    ]);

    return {
      data: appointments.map((a) => this.formatAppointment(a)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // AVAILABILITY & SLOT MANAGEMENT
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getDoctorAvailability(input: DoctorAvailabilityInput, tx: Tx = defaultTx): Promise<SlotAvailability[]> {
    const doctorSchedule = await tx.staffSchedule.findFirst({
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
    const existingAppointments = await tx.appointment.findMany({
      where: {
        doctorId: input.doctorId,
        clinicId: input.clinicId,
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

  async getDoctorSchedule(clinicId: string, doctorId: string, tx: Tx = defaultTx) {
    return tx.staffSchedule.findMany({
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
      category: appointment.category,
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