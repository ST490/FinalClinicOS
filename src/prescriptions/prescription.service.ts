import { Prisma } from '@prisma/client';
import { defaultTx } from '../config/database.js';
import type { Tx } from '../config/database.js';
import { ForbiddenError } from '../common/errors.js';
import { auditService } from '../audit/audit.service.js';
import {
  CreatePrescriptionInput,
  PrescriptionResponse,
  PrescriptionItemResponse,
  SearchPrescriptionsInput,
  DispensePrescriptionInput,
  UpdatePrescriptionStatusInput,
  PrescriptionStatus,
  PRESCRIPTION_STATUSES,
} from './types/prescription.types.js';

export class PrescriptionService {
  async create(input: CreatePrescriptionInput, tx: Tx = defaultTx): Promise<PrescriptionResponse> {
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

    // ponytail: every Rx line must identify the drug â€” catalogued or free-text.
    for (const item of input.items) {
      if (!item.medicineId && !item.customName) {
        throw new Error('Each prescription item requires medicineId or customName');
      }
    }

    const prescription = await tx.prescription.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        visitId: input.visitId,
        notes: input.notes,
        signature: input.signature,
        status: 'ACTIVE',
        items: {
          create: input.items.map(item => ({
            orgId: clinic.orgId,
            clinicId: input.clinicId,
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

    await auditService.log({
      orgId: clinic.orgId,
      clinicId: input.clinicId,
      userId: input.createdById,
      action: 'CREATE',
      entityType: 'PRESCRIPTION',
      entityId: prescription.id,
      after: this.formatPrescription(prescription),
    }, tx).catch(() => {});

    return this.formatPrescription(prescription);
  }

  async findById(id: string, tx: Tx = defaultTx): Promise<PrescriptionResponse | null> {
    const prescription = await tx.prescription.findUnique({
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

  // Delete a single Rx line. Dispensed lines are locked (stock already left inventory).
  async deleteItem(prescriptionItemId: string, actorId?: string, tx: Tx = defaultTx): Promise<void> {
    const item = await tx.prescriptionItem.findUnique({
      where: { id: prescriptionItemId },
      select: { dispensed: true, prescriptionId: true },
    });
    if (!item) throw new Error('Prescription item not found');
    if (item.dispensed) throw new Error('Cannot delete a dispensed item');
    const prescription = await tx.prescription.findUnique({
      where: { id: item.prescriptionId },
      select: { orgId: true, clinicId: true },
    });
    await tx.prescriptionItem.delete({ where: { id: prescriptionItemId } });
    if (prescription) {
      await auditService.log({
        orgId: prescription.orgId,
        clinicId: prescription.clinicId,
        userId: actorId,
        action: 'DELETE',
        entityType: 'PRESCRIPTION_ITEM',
        entityId: prescriptionItemId,
      }, tx).catch(() => {});
    }
  }

  async search(input: SearchPrescriptionsInput, tx: Tx = defaultTx): Promise<{ data: PrescriptionResponse[]; pagination: any }> {
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
      tx.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } },
          items: {
            include: { medicine: { select: { id: true, genericName: true, brandNames: true } } },
          },
        },
      }),
      tx.prescription.count({ where }),
    ]);

    return {
      data: prescriptions.map(p => this.formatPrescription(p)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async cancel(id: string, cancelledById: string, tx: Tx = defaultTx): Promise<PrescriptionResponse> {
    const prescription = await tx.prescription.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        items: true,
      },
    });
    return this.formatPrescription(prescription);
  }

  async updateStatus(input: UpdatePrescriptionStatusInput, tx: Tx = defaultTx): Promise<PrescriptionResponse> {
    if (!PRESCRIPTION_STATUSES.includes(input.status)) {
      throw new Error(`Invalid prescription status: ${input.status}`);
    }
    const data: Prisma.PrescriptionUpdateInput = { status: input.status };
    if (input.status === 'CANCELLED') {
      data.cancelledAt = new Date();
      data.cancelledById = input.actorId;
    }
    const prescription = await tx.prescription.update({
      where: { id: input.id },
      data,
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

  async dispensePrescription(id: string, input: DispensePrescriptionInput, tx: Tx = defaultTx): Promise<PrescriptionResponse> {
    const { inventoryService } = await import('../inventory/inventory.service.js');

    // When called from withTenantHandler, tx already has GUCs set.
    // Find the prescription to get clinicId + current status
    const rx = await tx.prescription.findUnique({
      where: { id },
      select: { clinicId: true, orgId: true, status: true },
    });
    if (!rx) throw new Error('Prescription not found');

    // Mark each item as dispensed
    for (const item of input.items) {
      // Fetch the prescriptionItem to get medicineId or customName
      const rxItem = await tx.prescriptionItem.findUnique({
        where: { id: item.prescriptionItemId },
        select: { medicineId: true, customName: true },
      });
      if (!rxItem) throw new Error(`Prescription item ${item.prescriptionItemId} not found`);

      // Find matching inventory item in the clinic
      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          clinicId: rx.clinicId,
          deletedAt: null,
          ...(rxItem.medicineId ? { medicineId: rxItem.medicineId } : { customName: rxItem.customName }),
        },
        select: { id: true },
      });

      // If a matching inventory item exists, deduct its stock!
      if (inventoryItem) {
        await inventoryService.deductStockTx(
          tx,
          inventoryItem.id,
          item.quantity,
          input.performedById,
          'PRESCRIPTION',
          id,
          input.secondSignatoryId
        );
      }

      await tx.prescriptionItem.update({
        where: { id: item.prescriptionItemId },
        data: {
          dispensed: true,
          dispensedQty: { increment: item.quantity },
        },
      });
    }

    // Mark the prescription dispensed once items are handed out
    if (String(rx.status).toUpperCase() === 'ACTIVE') {
      await tx.prescription.update({ where: { id }, data: { status: 'DISPENSED' } });
    }

    const prescription = await tx.prescription.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        items: {
          include: { medicine: { select: { id: true, genericName: true, brandNames: true } } },
        },
      },
    });

    await auditService.log({
      orgId: prescription!.orgId,
      clinicId: prescription!.clinicId,
      userId: input.performedById,
      action: 'DISPENSE',
      entityType: 'PRESCRIPTION',
      entityId: id,
      after: this.formatPrescription(prescription!),
    }, tx).catch(() => {});

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
      // ponytail: tolerate legacy lowercase rows until normalized
      status: (String(prescription.status).toUpperCase() as PrescriptionStatus),
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