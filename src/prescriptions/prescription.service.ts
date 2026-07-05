import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreatePrescriptionInput,
  PrescriptionResponse,
  PrescriptionItemResponse,
  SearchPrescriptionsInput,
  DispensePrescriptionInput,
} from './types/prescription.types.js';

export class PrescriptionService {
  async create(input: CreatePrescriptionInput): Promise<PrescriptionResponse> {
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const prescription = await prisma.prescription.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        visitId: input.visitId,
        notes: input.notes,
        signature: input.signature,
        status: 'active',
        items: {
          create: input.items.map(item => ({
            medicineId: item.medicineId,
            customName: item.customName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        items: {
          include: { medicine: { select: { id: true, genericName: true, brandNames: true } } },
        },
      },
    });

    return this.formatPrescription(prescription);
  }

  async findById(id: string): Promise<PrescriptionResponse | null> {
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        items: {
          include: { medicine: { select: { id: true, genericName: true, brandNames: true } } },
        },
      },
    });
    return prescription ? this.formatPrescription(prescription) : null;
  }

  async search(input: SearchPrescriptionsInput): Promise<{ data: PrescriptionResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PrescriptionWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.patientId && { patientId: input.patientId }),
      ...(input.doctorId && { doctorId: input.doctorId }),
      ...(input.visitId && { visitId: input.visitId }),
      ...(input.status && { status: input.status }),
    };

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return {
      data: prescriptions.map(p => this.formatPrescription(p)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async cancel(id: string, cancelledById: string): Promise<PrescriptionResponse> {
    const prescription = await prisma.prescription.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelledById },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        items: true,
      },
    });
    return this.formatPrescription(prescription);
  }

  async dispensePrescription(id: string, input: DispensePrescriptionInput): Promise<PrescriptionResponse> {
    // Use transaction to atomically mark items as dispensed
    const prescription = await prisma.$transaction(async (tx) => {
      // Mark each item as dispensed
      for (const item of input.items) {
        await tx.prescriptionItem.update({
          where: { id: item.prescriptionItemId },
          data: {
            dispensed: true,
            dispensedQty: { increment: item.quantity },
          },
        });
      }
      return tx.prescription.findUnique({
        where: { id },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } },
          items: {
            include: { medicine: { select: { id: true, genericName: true, brandNames: true } } },
          },
        },
      });
    });

    return this.formatPrescription(prescription!);
  }

  private formatPrescription(prescription: any): PrescriptionResponse {
    return {
      id: prescription.id,
      clinicId: prescription.clinicId,
      orgId: prescription.orgId,
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      visitId: prescription.visitId,
      notes: prescription.notes,
      signature: prescription.signature,
      status: prescription.status,
      cancelledAt: prescription.cancelledAt,
      cancelledById: prescription.cancelledById,
      createdAt: prescription.createdAt,
      updatedAt: prescription.updatedAt,
      patient: prescription.patient,
      doctor: prescription.doctor,
      items: prescription.items?.map((i: any) => this.formatItem(i)),
    };
  }

  private formatItem(item: any): PrescriptionItemResponse {
    return {
      id: item.id,
      prescriptionId: item.prescriptionId,
      medicineId: item.medicineId,
      customName: item.customName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      dispensed: item.dispensed,
      dispensedQty: item.dispensedQty,
      createdAt: item.createdAt,
      medicine: item.medicine,
    };
  }
}

export const prescriptionService = new PrescriptionService();