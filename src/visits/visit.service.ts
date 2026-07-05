import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { CreateVisitInput, UpdateVisitInput, VisitResponse, SearchVisitsInput, VisitStats } from './types/visit.types.js';

export class VisitService {
  async create(input: CreateVisitInput): Promise<VisitResponse> {
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const visit = await prisma.patientVisit.create({
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
        createdById: input.createdById,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        appointments: { select: { id: true, slotStart: true, slotEnd: true }, take: 1 },
      },
    });

    return this.formatVisit(visit);
  }

  async findById(id: string): Promise<VisitResponse | null> {
    const visit = await prisma.patientVisit.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        appointments: { select: { id: true, slotStart: true, slotEnd: true }, take: 1 },
      },
    });
    return visit ? this.formatVisit(visit) : null;
  }

  async update(id: string, input: UpdateVisitInput): Promise<VisitResponse> {
    const visit = await prisma.patientVisit.update({
      where: { id },
      data: {
        type: input.type,
        vitals: input.vitals,
        chiefComplaint: input.chiefComplaint,
        diagnosis: input.diagnosis,
        notes: input.notes,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        appointments: { select: { id: true, slotStart: true, slotEnd: true }, take: 1 },
      },
    });
    return this.formatVisit(visit);
  }

  async search(input: SearchVisitsInput): Promise<{ data: VisitResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PatientVisitWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.patientId && { patientId: input.patientId }),
      ...(input.doctorId && { doctorId: input.doctorId }),
      ...(input.fromDate && { visitDate: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { visitDate: { lte: new Date(input.toDate) } }),
    };

    const [visits, total] = await Promise.all([
      prisma.patientVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { visitDate: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } },
        },
      }),
      prisma.patientVisit.count({ where }),
    ]);

    return {
      data: visits.map(v => this.formatVisit(v)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPatientStats(patientId: string): Promise<VisitStats> {
    const visits = await prisma.patientVisit.findMany({
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