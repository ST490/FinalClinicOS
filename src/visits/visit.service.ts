import { Prisma } from '@prisma/client';
import { defaultTx } from '../config/database.js';
import type { Tx } from '../config/database.js';
import { ForbiddenError } from '../common/errors.js';
import { auditService } from '../audit/audit.service.js';
import { CreateVisitInput, UpdateVisitInput, VisitResponse, SearchVisitsInput, VisitStats } from './types/visit.types.js';

export class VisitService {
  async create(input: CreateVisitInput, tx: Tx = defaultTx): Promise<VisitResponse> {
    const clinic = await tx.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    // ponytail: tenant scoping â€” patient must belong to this org, doctor active at this clinic.
    if (input.patientId) {
      const patient = await tx.patient.findUnique({ where: { id: input.patientId }, select: { orgId: true } });
      if (!patient || patient.orgId !== clinic.orgId) throw new ForbiddenError('Patient does not belong to this organization');
    }
    if (input.doctorId) {
      const role = await tx.userClinicRole.findFirst({ where: { userId: input.doctorId, clinicId: input.clinicId, status: 'ACTIVE' } });
      if (!role) throw new ForbiddenError('Doctor is not active at this clinic');
    }

    const visit = await tx.patientVisit.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        visitDate: input.visitDate ? new Date(input.visitDate) : new Date(),
        type: input.type,
        vitals: input.vitals,
        chiefComplaint: input.chiefComplaint,
        diagnosis: input.diagnosis,
        notes: input.notes,
        status: (input.status as any) ?? 'COMPLETED',
        createdById: input.createdById,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        appointments: { select: { id: true, slotStart: true, slotEnd: true }, take: 1 },
      },
    });

    // Link the visit back to its appointment so Appointment.visitId (which was
    // never written before) is populated â€” closes the appointmentâ†”visit gap.
    if (input.appointmentId) {
      const appt = await tx.appointment.findUnique({ where: { id: input.appointmentId }, select: { clinicId: true } });
      if (!appt) throw new Error('Appointment not found');
      if (appt.clinicId !== input.clinicId) throw new ForbiddenError('Appointment does not belong to this clinic');
      await tx.appointment.update({ where: { id: input.appointmentId }, data: { visitId: visit.id } });
    }

    return this.formatVisit(visit);
  }

  async findById(id: string, tx: Tx = defaultTx): Promise<VisitResponse | null> {
    const visit = await tx.patientVisit.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        appointments: { select: { id: true, slotStart: true, slotEnd: true }, take: 1 },
      },
    });
    return visit ? this.formatVisit(visit) : null;
  }

  async update(id: string, input: UpdateVisitInput, tx: Tx = defaultTx): Promise<VisitResponse> {
    const visit = await tx.patientVisit.update({
      where: { id },
      data: {
        type: input.type,
        vitals: input.vitals,
        chiefComplaint: input.chiefComplaint,
        diagnosis: input.diagnosis,
        notes: input.notes,
        ...(input.status ? { status: input.status as any } : {}),
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        appointments: { select: { id: true, slotStart: true, slotEnd: true }, take: 1 },
      },
    });
    return this.formatVisit(visit);
  }

  // Soft-delete: mark archived + set deletedAt so it drops out of listings.
  async delete(id: string, actorId?: string, tx: Tx = defaultTx): Promise<void> {
    const visit = await tx.patientVisit.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
    await auditService.log({
      orgId: visit.orgId,
      clinicId: visit.clinicId,
      userId: actorId,
      action: 'DELETE',
      entityType: 'PATIENT_VISIT',
      entityId: id,
    }, tx).catch(() => {});
  }

  async search(input: SearchVisitsInput, tx: Tx = defaultTx): Promise<{ data: VisitResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PatientVisitWhereInput = {
      deletedAt: null,
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.patientId && { patientId: input.patientId }),
      ...(input.doctorId && { doctorId: input.doctorId }),
      ...(input.fromDate && { visitDate: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { visitDate: { lte: new Date(input.toDate) } }),
    };

    const [visits, total] = await Promise.all([
      tx.patientVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { visitDate: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } },
        },
      }),
      tx.patientVisit.count({ where }),
    ]);

    return {
      data: visits.map(v => this.formatVisit(v)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPatientStats(patientId: string, tx: Tx = defaultTx): Promise<VisitStats> {
    const visits = await tx.patientVisit.findMany({
      where: { patientId },
      orderBy: { visitDate: 'desc' },
      select: { visitDate: true, diagnosis: true },
    });

    const diagnoses = [...new Set(visits.map(v => v.diagnosis).filter((d): d is string => !!d))];

    return {
      patientId,
      totalVisits: visits.length,
      lastVisit: visits[0]?.visitDate || null,
      diagnoses: diagnoses as string[],
    };
  }

  private formatVisit(visit: any): VisitResponse {
    return {
      id: visit.id,
      clinicId: visit.clinicId,
      orgId: visit.orgId,
      patientId: visit.patientId,
      doctorId: visit.doctorId,
      status: visit.status,
      visitDate: visit.visitDate,
      type: visit.type,
      vitals: visit.vitals,
      chiefComplaint: visit.chiefComplaint,
      diagnosis: visit.diagnosis,
      notes: visit.notes,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
      patient: visit.patient,
      doctor: visit.doctor,
      appointment: visit.appointments?.[0] || null,
    };
  }
}

export const visitService = new VisitService();