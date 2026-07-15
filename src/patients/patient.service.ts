import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreatePatientInput,
  UpdatePatientInput,
  PatientSearchInput,
  PatientResponse,
  PaginatedPatientsResponse,
} from './types/patient.types.js';

export class PatientService {
  async create(input: CreatePatientInput): Promise<PatientResponse> {
    // Lookup clinic to get orgId
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const patient = await prisma.patient.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        allergies: input.allergies || [],
        medicalHistory: input.medicalHistory,
        address: input.address,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country || 'IN',
        tags: input.tags || [],
        whatsappConsent: input.whatsappConsent || false,
        smsConsent: input.smsConsent || false,
        createdById: input.createdById,
        // orgId is derived from clinic in a transaction
      },
      include: {
        _count: {
          select: { visits: true, appointments: true },
        },
      },
    });

    return this.formatPatient(patient);
  }

  async update(id: string, input: UpdatePatientInput): Promise<PatientResponse> {
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.bloodGroup !== undefined && { bloodGroup: input.bloodGroup }),
        ...(input.allergies !== undefined && { allergies: input.allergies }),
        ...(input.medicalHistory !== undefined && { medicalHistory: input.medicalHistory }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.state !== undefined && { state: input.state }),
        ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.whatsappConsent !== undefined && { whatsappConsent: input.whatsappConsent }),
        ...(input.smsConsent !== undefined && { smsConsent: input.smsConsent }),
      },
      include: {
        _count: {
          select: { visits: true, appointments: true },
        },
      },
    });

    return this.formatPatient(patient);
  }

  async findById(id: string): Promise<PatientResponse | null> {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        visits: { take: 10, orderBy: { visitDate: 'desc' } },
        _count: {
          select: { visits: true, appointments: true },
        },
      },
    });

    return patient ? this.formatPatient(patient) : null;
  }

  async search(input: PatientSearchInput): Promise<PaginatedPatientsResponse> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PatientWhereInput = {
      deletedAt: null, // Exclude soft-deleted
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.gender && { gender: input.gender }),
      ...(input.bloodGroup && { bloodGroup: input.bloodGroup }),
      ...(input.tags && input.tags.length > 0 && {
        tags: { hasSome: input.tags },
      }),
      ...(input.fromDate && { createdAt: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { createdAt: { lte: new Date(input.toDate) } }),
    };

    // Full-text search on name, email, phone
    if (input.query) {
      where.OR = [
        { name: { contains: input.query, mode: 'insensitive' } },
        { email: { contains: input.query, mode: 'insensitive' } },
        { phone: { contains: input.query, mode: 'insensitive' } },
      ];
    }

    // Execute query
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [input.sortBy || 'createdAt']: input.sortOrder || 'desc' },
        include: {
          _count: {
            select: { visits: true, appointments: true },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      data: patients.map((p) => this.formatPatient(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async delete(id: string): Promise<void> {
    // Soft delete
    await prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addTag(id: string, tag: string): Promise<PatientResponse> {
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        tags: { push: tag },
      },
      include: {
        _count: { select: { visits: true, appointments: true } },
      },
    });
    return this.formatPatient(patient);
  }

  async removeTag(id: string, tag: string): Promise<PatientResponse> {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new Error('Patient not found');

    const updatedTags = patient.tags.filter((t) => t !== tag);
    const updated = await prisma.patient.update({
      where: { id },
      data: { tags: updatedTags },
      include: {
        _count: { select: { visits: true, appointments: true } },
      },
    });
    return this.formatPatient(updated);
  }

  async getPatientStats(id: string) {
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            visits: true,
            appointments: true,
            prescriptions: true,
            dues: true,
          },
        },
      },
    });

    if (!patient) throw new Error('Patient not found');

    const [recentVisits, recentAppointments, dueAmount] = await Promise.all([
      prisma.patientVisit.count({
        where: { patientId: id },
      }),
      prisma.appointment.count({
        where: { patientId: id },
      }),
      prisma.due.aggregate({
        where: { patientId: id, status: { in: ['DUE', 'PARTIAL'] } },
        _sum: { amountDue: true, amountPaid: true },
      }),
    ]);

    return {
      ...patient,
      recentVisits,
      upcomingAppointments: recentAppointments,
      outstandingAmount: dueAmount._sum.amountDue
        ? Number(dueAmount._sum.amountDue) - Number(dueAmount._sum.amountPaid || 0)
        : 0,
    };
  }

  private formatPatient(patient: any): PatientResponse {
    const { _count, ...rest } = patient;
    return {
      ...rest,
      _count,
    };
  }
}

export const patientService = new PatientService();