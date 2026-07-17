import { StockMovementType, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { auditService } from '../audit/audit.service.js';
import {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  StockAdjustmentInput,
  InventorySearchInput,
  InventoryViewer,
  InventoryItemResponse,
  StockMovementResponse,
  LowStockAlert,
  FEFO_THRESHOLD_DAYS,
} from './types/inventory.types.js';

export class InventoryService {
  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  async create(input: CreateInventoryItemInput): Promise<InventoryItemResponse> {
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    // Lot/batch-tracked items are expiry-sensitive — they MUST carry a batch + expiry.
    if (input.trackingType === 'LOT_BATCH' && (!input.batchNo || !input.expiryDate)) {
      throw new Error('Lot/batch-tracked items require batchNo and expiryDate');
    }

    // An item must be identifiable: linked to a medicine OR given a custom name.
    // The schema comment requires this at the service layer (no DB CHECK exists).
    if (!input.medicineId && !input.customName) {
      throw new Error('Inventory item requires medicineId or customName');
    }

    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          clinicId: input.clinicId,
          orgId: clinic.orgId,
          medicineId: input.medicineId,
          customName: input.customName,
          customBrand: input.customBrand,
          batchNo: input.batchNo,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          quantity: input.quantity,
          reorderThreshold: input.reorderThreshold || 10,
          unitPrice: input.unitPrice,
          mrp: input.mrp,
          sellingPrice: input.sellingPrice,
          ingredients: input.ingredients,
          dosageForm: input.dosageForm,
          strength: input.strength,
          trackingType: input.trackingType ?? 'BULK',
          regulatoryClass: input.regulatoryClass ?? 'STANDARD',
          costType: input.costType ?? 'OVERHEAD',
          stockingLevel: input.stockingLevel ?? 'CENTRAL',
          clinicalCategory: input.clinicalCategory ?? 'PHARMA',
          serialNo: input.serialNo,
          consignmentOwner: input.consignmentOwner,
          createdById: input.createdById,
        },
        include: {
          medicine: { select: { id: true, genericName: true, brandNames: true, composition: true } },
        },
      });

      // Create initial stock movement (RESTOCK)
      await tx.stockMovement.create({
        data: {
          clinicId: input.clinicId,
          orgId: clinic.orgId,
          inventoryItemId: item.id,
          type: StockMovementType.RESTOCK,
          quantityDelta: input.quantity,
          performedById: input.createdById,
          newBatchNo: input.batchNo,
          newExpiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          notes: 'Initial stock',
        },
      });

      await auditService.log({
        orgId: clinic.orgId,
        clinicId: input.clinicId,
        userId: input.createdById,
        action: 'CREATE',
        entityType: 'INVENTORY_ITEM',
        entityId: item.id,
        after: this.formatItem(item),
      }).catch(() => {});

      return this.formatItem(item);
    });
  }

  async update(id: string, input: UpdateInventoryItemInput): Promise<InventoryItemResponse> {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: input,
      include: {
        medicine: { select: { id: true, genericName: true, brandNames: true, composition: true } },
      },
    });
    return this.formatItem(item);
  }

  async findById(id: string): Promise<InventoryItemResponse | null> {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        medicine: { select: { id: true, genericName: true, brandNames: true, composition: true } },
        stockMovements: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    return item ? this.formatItem(item) : null;
  }

  async search(input: InventorySearchInput & { viewer?: InventoryViewer }): Promise<{ data: InventoryItemResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null,
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.medicineId && { medicineId: input.medicineId }),
      // ponytail: low-stock means at/below the item's own reorderThreshold,
      // not a hardcoded 10. Prisma can't compare two columns in `where`, so use raw.
      ...(input.lowStock && ({
        AND: [Prisma.raw('quantity <= reorder_threshold')],
      } as Prisma.InventoryItemWhereInput)),
      ...(input.expiringBefore && {
        expiryDate: { lte: new Date(input.expiringBefore) },
      }),
      ...(input.ingredients && {
        OR: [
          {
            ingredients: { contains: input.ingredients, mode: 'insensitive' },
          },
          {
            medicine: {
              composition: { contains: input.ingredients, mode: 'insensitive' },
            },
          },
        ],
      }),
      // Classification filters
      ...(input.trackingType && { trackingType: input.trackingType }),
      ...(input.regulatoryClass && { regulatoryClass: input.regulatoryClass }),
      ...(input.costType && { costType: input.costType }),
      ...(input.stockingLevel && { stockingLevel: input.stockingLevel }),
      ...(input.clinicalCategory && { clinicalCategory: input.clinicalCategory }),
      // Role scope: pharmacist sees pharmaceuticals only.
      ...this.scopeWhere(input.viewer),
    };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [input.sortBy || 'createdAt']: input.sortOrder || 'desc' },
        include: {
          medicine: { select: { id: true, genericName: true, brandNames: true, composition: true } },
        },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items.map(i => this.formatItem(i)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async delete(id: string): Promise<void> {
    // Soft delete
    await prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STOCK OPERATIONS — FEFO (First Expiry, First Out)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Deduct stock using FEFO: always consume from batches expiring soonest first.
   * Returns the batches that were consumed from.
   */
  async deductStock(
    inventoryItemId: string,
    quantityRequested: number,
    performedById: string,
    referenceType?: string,
    referenceId?: string,
    secondSignatoryId?: string
  ): Promise<{ success: boolean; shortage: number; batches: { batchNo: string | null; quantityTaken: number; expiryDate: Date | null }[] }> {
    return await prisma.$transaction(async (tx) => {
      return this.deductStockTx(tx, inventoryItemId, quantityRequested, performedById, referenceType, referenceId, secondSignatoryId);
    });
  }

  async deductStockTx(
    tx: any,
    inventoryItemId: string,
    quantityRequested: number,
    performedById: string,
    referenceType?: string,
    referenceId?: string,
    secondSignatoryId?: string
  ): Promise<{ success: boolean; shortage: number; batches: { batchNo: string | null; quantityTaken: number; expiryDate: Date | null }[] }> {
    const stockMap = await this.getCurrentStockMapByItemTx(tx, inventoryItemId);
    const totalAvailable = Object.values(stockMap).reduce((sum, q) => sum + q, 0);

    const clinicInfo = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: { clinicId: true, orgId: true, regulatoryClass: true },
    });
    if (!clinicInfo) throw new Error('Inventory item not found');

    // Controlled substances require a second signatory (dual sign-off).
    if (clinicInfo.regulatoryClass === 'CONTROLLED' && !secondSignatoryId) {
      throw new Error('CONTROLLED items require a second signatory (dual sign-off)');
    }

    if (totalAvailable < quantityRequested) {
      // Partial fulfillment allowed — deduct what we have
      const shortage = quantityRequested - totalAvailable;
      const batches: { batchNo: string | null; quantityTaken: number; expiryDate: Date | null }[] = [];
      let remaining = totalAvailable;

      for (const entry of Object.entries(stockMap)) {
        const key = entry[0];
        const qty = entry[1] as number;
        const [batchNo, expiryDateStr] = key.split('|||');
        if (remaining <= 0) break;
        const taken = Math.min(remaining, qty);
        remaining -= taken;

        const expDate = expiryDateStr !== 'null' && expiryDateStr ? new Date(expiryDateStr) : null;
        const bNo = batchNo !== 'null' && batchNo ? batchNo : null;
        batches.push({ batchNo: bNo, quantityTaken: taken, expiryDate: expDate });

        // Record deduction (one movement per batch)
        await tx.stockMovement.create({
          data: {
            inventoryItemId,
            clinicId: clinicInfo.clinicId,
            orgId: clinicInfo.orgId,
            type: StockMovementType.SALE,
            quantityDelta: -taken,
            referenceType,
            referenceId,
            performedById,
            secondSignatoryId: secondSignatoryId ?? null,
            newBatchNo: bNo,
            newExpiryDate: expDate,
            notes: bNo ? `FEFO: Batch ${bNo}` : 'FEFO deduction',
          },
        });
      }

      // Update InventoryItem quantity
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: { decrement: totalAvailable } },
      });

      return { success: false, shortage, batches };
    }

    // Full fulfillment — FEFO
    const batches: { batchNo: string | null; quantityTaken: number; expiryDate: Date | null }[] = [];
    let remaining = quantityRequested;

    for (const [key, qty] of Object.entries(stockMap)) {
      if (remaining <= 0) break;

      const [batchNo, expiryDateStr] = key.split('|||');
      const taken = Math.min(remaining, qty);
      remaining -= taken;

      const expDate = expiryDateStr && expiryDateStr !== 'null' ? new Date(expiryDateStr) : null;
      const bNo = batchNo !== 'null' && batchNo ? batchNo : null;
      batches.push({ batchNo: bNo, quantityTaken: taken, expiryDate: expDate });

      await tx.stockMovement.create({
        data: {
          inventoryItemId,
          clinicId: clinicInfo.clinicId,
          orgId: clinicInfo.orgId,
          type: StockMovementType.SALE,
          quantityDelta: -taken,
          referenceType,
          referenceId,
          secondSignatoryId: secondSignatoryId ?? null,
          newBatchNo: bNo,
          newExpiryDate: expDate,
          performedById,
          notes: bNo ? `FEFO: Batch ${bNo}` : 'FEFO deduction',
        },
      });
    }

    // Update InventoryItem quantity
    await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantity: { decrement: quantityRequested } },
    });

    return { success: true, shortage: 0, batches };
  }

  /**
   * Adjust stock (RESTOCK, WRITE_OFF, ADJUSTMENT, RETURN)
   */
  async adjustStock(inventoryItemId: string, input: StockAdjustmentInput): Promise<StockMovementResponse> {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (!item) throw new Error('Inventory item not found');

      // Controlled substances require a second signatory (dual sign-off).
      if (item.regulatoryClass === 'CONTROLLED' && !input.secondSignatoryId) {
        throw new Error('CONTROLLED items require a second signatory (dual sign-off)');
      }

      const movement = await tx.stockMovement.create({
        data: {
          clinicId: item.clinicId,
          orgId: item.orgId,
          inventoryItemId,
          type: input.type,
          quantityDelta: input.quantityDelta,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          newBatchNo: input.batchNo,
          newExpiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          notes: input.notes,
          performedById: input.performedById,
          secondSignatoryId: input.secondSignatoryId ?? null,
        },
        include: {
          performedBy: { select: { id: true, name: true } },
        },
      });

      // Update InventoryItem quantity
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: { increment: input.quantityDelta } },
      });

      await auditService.log({
        orgId: item.orgId,
        clinicId: item.clinicId,
        userId: input.performedById,
        action: 'STOCK_ADJUST',
        entityType: 'INVENTORY_MOVEMENT',
        entityId: movement.id,
        after: this.formatMovement(movement),
      }).catch(() => {});

      return this.formatMovement(movement);
    });
  }

  /**
   * Get stock movements for an item
   */
  async getStockHistory(inventoryItemId: string, limit = 50): Promise<StockMovementResponse[]> {
    const movements = await prisma.stockMovement.findMany({
      where: { inventoryItemId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        performedBy: { select: { id: true, name: true } },
      },
    });
    return movements.map(m => this.formatMovement(m));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ALERTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all low-stock items for a clinic
   */
  async getLowStockAlerts(clinicId: string): Promise<LowStockAlert> {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const items = await prisma.inventoryItem.findMany({
      where: { clinicId, deletedAt: null },
    });

    const lowStockItems = items
      .filter(item => item.quantity <= item.reorderThreshold)
      .map(item => ({
        id: item.id,
        displayName: this.getDisplayName(item),
        quantity: item.quantity,
        reorderThreshold: item.reorderThreshold,
        shortage: item.reorderThreshold - item.quantity,
      }));

    return {
      clinicId,
      clinicName: clinic.name,
      items: lowStockItems,
    };
  }

  /**
   * Get all expiring-soon items (within threshold days)
   */
  async getExpiringSoonAlerts(clinicId: string): Promise<InventoryItemResponse[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + FEFO_THRESHOLD_DAYS);

    const items = await prisma.inventoryItem.findMany({
      where: {
        clinicId,
        deletedAt: null,
        expiryDate: { lte: threshold, gte: new Date() },
      },
      include: { medicine: { select: { id: true, genericName: true, brandNames: true } } },
    });

    return items.map(i => this.formatItem(i));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async getCurrentStockMapByItemTx(tx: any, inventoryItemId: string): Promise<Record<string, number>> {
    // Group by batch/date for FEFO
    const movements = await tx.stockMovement.findMany({
      where: { inventoryItemId },
      select: {
        quantityDelta: true,
        newBatchNo: true,
        newExpiryDate: true,
      },
      orderBy: { newExpiryDate: 'asc' }, // FEFO: earliest expiry first
    });

    const map: Record<string, number> = {};
    for (const m of movements) {
      const key = `${m.newBatchNo || 'null'}|||${m.newExpiryDate?.toISOString() || 'null'}`;
      map[key] = (map[key] || 0) + m.quantityDelta;
    }

    // Filter out depleted batches
    Object.keys(map).forEach(k => { if (map[k] <= 0) delete map[k]; });

    return map;
  }

  private getDisplayName(item: any): string {
    if (item.medicine) {
      return item.medicine.genericName + (item.medicine.brandNames?.length ? ` (${item.medicine.brandNames[0]})` : '');
    }
    return item.customName || item.customBrand || 'Unknown';
  }

  private formatItem(item: any): InventoryItemResponse {
    const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : null;
    const sellingPrice = item.sellingPrice != null ? Number(item.sellingPrice) : null;
    return {
      ...item,
      displayName: this.getDisplayName(item),
      isLowStock: item.quantity <= item.reorderThreshold,
      isExpiringSoon: item.expiryDate ? new Date(item.expiryDate) <= new Date(Date.now() + FEFO_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) : false,
      // Buy price minus sell price → profit margin (null when sell price unknown).
      margin: unitPrice != null && sellingPrice != null ? Number((sellingPrice - unitPrice).toFixed(2)) : null,
    };
  }

  /**
   * Role-based scope. A PHARMACIST (who is not the org owner) may only see
   * pharmaceutical inventory; everyone else sees everything. Returns a Prisma
   * `where` fragment (empty when no restriction applies).
   */
  private scopeWhere(viewer?: InventoryViewer): Prisma.InventoryItemWhereInput {
    if (!viewer || viewer.isOrgOwner) return {};
    if (viewer.roles.includes('PHARMACIST')) {
      return { clinicalCategory: 'PHARMA' };
    }
    return {};
  }

  private formatMovement(movement: any): StockMovementResponse {
    return {
      id: movement.id,
      clinicId: movement.clinicId,
      orgId: movement.orgId,
      inventoryItemId: movement.inventoryItemId,
      type: movement.type,
      quantityDelta: movement.quantityDelta,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      newBatchNo: movement.newBatchNo,
      newExpiryDate: movement.newExpiryDate,
      notes: movement.notes,
      createdAt: movement.createdAt,
      performedBy: movement.performedBy,
    };
  }
}

export const inventoryService = new InventoryService();