import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreateDueInput,
  RecordPaymentInput,
  WaiveDueInput,
  DueResponse,
  PatientBalanceResponse,
  SearchDuesInput,
} from './types/billing.types.js';

export class BillingService {
  async createDue(input: CreateDueInput): Promise<DueResponse> {
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const amountPaid = input.amountPaid || 0;
    const amountDue = input.totalAmount - amountPaid;

    const due = await prisma.due.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        patientId: input.patientId,
        totalAmount: input.totalAmount,
        amountPaid,
        amountDue,
        paymentMethod: input.paymentMethod,
        paymentNotes: input.paymentNotes,
        status: amountDue <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'DUE',
        appointmentId: input.appointmentId,
        prescriptionId: input.prescriptionId,
        recordedById: input.recordedById,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return this.formatDue(due);
  }

  async recordPayment(id: string, input: RecordPaymentInput): Promise<DueResponse> {
    const existing = await prisma.due.findUnique({ where: { id } });
    if (!existing) throw new Error('Due not found');

    const newAmountPaid = Number(existing.amountPaid) + input.amount;
    const newAmountDue = Math.max(0, Number(existing.totalAmount) - newAmountPaid);

    const due = await prisma.due.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        paymentMethod: input.paymentMethod || existing.paymentMethod,
        status: newAmountDue <= 0 ? 'PAID' : 'PARTIAL',
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return this.formatDue(due);
  }

  async waiveDue(id: string, input: WaiveDueInput): Promise<DueResponse> {
    const due = await prisma.due.update({
      where: { id },
      data: {
        amountDue: 0,
        amountPaid: 0,
        status: 'WAIVED',
        waivedAt: new Date(),
        waivedById: input.waivedById,
        waiveReason: input.reason,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return this.formatDue(due);
  }

  async getDue(id: string): Promise<DueResponse | null> {
    const due = await prisma.due.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });
    return due ? this.formatDue(due) : null;
  }

  async search(input: SearchDuesInput): Promise<{ data: DueResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.DueWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.patientId && { patientId: input.patientId }),
      ...(input.status && { status: input.status as any }),
      ...(input.fromDate && { createdAt: { gte: new Date(input.fromDate) } }),
      ...(input.toDate && { createdAt: { lte: new Date(input.toDate) } }),
    };

    const [dues, total] = await Promise.all([
      prisma.due.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          recordedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.due.count({ where }),
    ]);

    return {
      data: dues.map(d => this.formatDue(d)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPatientBalance(patientId: string): Promise<PatientBalanceResponse> {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error('Patient not found');

    const pendingDues = await prisma.due.findMany({
      where: { patientId, status: { in: ['DUE', 'PARTIAL'] } },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPending = pendingDues.reduce((sum, d) => sum + Number(d.amountDue), 0);
    const totalPaid = pendingDues.reduce((sum, d) => sum + Number(d.amountPaid), 0);
    const totalDues = pendingDues.reduce((sum, d) => sum + Number(d.totalAmount), 0);

    return {
      patientId,
      patientName: patient.name,
      totalDues: totalDues.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      balance: totalPending.toFixed(2),
      pendingDues: pendingDues.map(d => this.formatDue(d)),
    };
  }

  private formatDue(due: any): DueResponse {
    return {
      id: due.id,
      clinicId: due.clinicId,
      orgId: due.orgId,
      patientId: due.patientId,
      totalAmount: due.totalAmount,
      amountPaid: due.amountPaid,
      amountDue: due.amountDue,
      paymentMethod: due.paymentMethod,
      paymentNotes: due.paymentNotes,
      status: due.status,
      appointmentId: due.appointmentId,
      prescriptionId: due.prescriptionId,
      createdAt: due.createdAt,
      updatedAt: due.updatedAt,
      patient: due.patient,
      recordedBy: due.recordedBy,
    };
  }
}

export const billingService = new BillingService();