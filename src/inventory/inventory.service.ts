import { StockMovementType, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  StockAdjustmentInput,
  InventorySearchInput,
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

    const item = await prisma.inventoryItem.create({
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
        dosageForm: input.dosageForm,
        strength: input.strength,
        createdById: input.createdById,
      },
      include: {
        medicine: { select: { id: true, genericName: true, brandNames: true } },
      },
    });

    // Create initial stock movement (RESTOCK)
    await prisma.stockMovement.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        inventoryItemId: item.id,
        type: StockMovementType.RESTOCK,
        quantityDelta: input.quantity,
        performedById: input.createdById,
        notes: 'Initial stock',
      },
    });

    return this.formatItem(item);
  }

  async update(id: string, input: UpdateInventoryItemInput): Promise<InventoryItemResponse> {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: input,
      include: {
        medicine: { select: { id: true, genericName: true, brandNames: true } },
      },
    });
    return this.formatItem(item);
  }

  async findById(id: string): Promise<InventoryItemResponse | null> {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        medicine: { select: { id: true, genericName: true, brandNames: true } },
        stockMovements: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    return item ? this.formatItem(item) : null;
  }

  async search(input: InventorySearchInput): Promise<{ data: InventoryItemResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Get current stock quantities
    const stockMap = await this.getCurrentStockMap(input.clinicId);

    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null,
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.medicineId && { medicineId: input.medicineId }),
      ...(input.lowStock && {
        id: { in: Object.entries(stockMap).filter(([, q]) => q <= 10).map(([id]) => id) },
      }),
      ...(input.expiringBefore && {
        expiryDate: { lte: new Date(input.expiringBefore) },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [input.sortBy || 'createdAt']: input.sortOrder || 'desc' },
        include: {
          medicine: { select: { id: true, genericName: true, brandNames: true } },
        },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items.map(i => this.formatItem({ ...i, quantity: stockMap[i.id] || 0 })),
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
    referenceId?: string
  ): Promise<{ success: boolean; shortage: number; batches: { batchNo: string | null; quantityTaken: number; expiryDate: Date | null }[] }> {
    const stockMap = await this.getCurrentStockMapByItem(inventoryItemId);
    const totalAvailable = Object.values(stockMap).reduce((sum, q) => sum + q, 0);

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
        batches.push({ batchNo, quantityTaken: taken, expiryDate: expDate });

        // Record deduction (one movement per batch)
        await prisma.stockMovement.create({
          data: {
            inventoryItemId,
            clinicId: (await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))!.clinicId,
            orgId: (await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))!.orgId,
            type: StockMovementType.SALE,
            quantityDelta: -taken,
            referenceType,
            referenceId,
            performedById,
            notes: batchNo ? `FEFO: Batch ${batchNo}` : 'FEFO deduction',
          },
        });
      }

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

      batches.push({ batchNo, quantityTaken: taken, expiryDate: expiryDateStr && expiryDateStr !== 'null' ? new Date(expiryDateStr) : null });

      await prisma.stockMovement.create({
        data: {
          inventoryItemId,
          clinicId: (await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))!.clinicId,
          orgId: (await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))!.orgId,
          type: StockMovementType.SALE,
          quantityDelta: -taken,
          referenceType,
          referenceId,
          newBatchNo: batchNo !== 'null' ? batchNo : null,
          newExpiryDate: expiryDateStr && expiryDateStr !== 'null' ? new Date(expiryDateStr) : null,
          performedById,
          notes: batchNo ? `FEFO: Batch ${batchNo}` : 'FEFO deduction',
        },
      });
    }

    return { success: true, shortage: 0, batches };
  }

  /**
   * Adjust stock (RESTOCK, WRITE_OFF, ADJUSTMENT, RETURN)
   */
  async adjustStock(inventoryItemId: string, input: StockAdjustmentInput): Promise<StockMovementResponse> {
    const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) throw new Error('Inventory item not found');

    const movement = await prisma.stockMovement.create({
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
      },
      include: {
        performedBy: { select: { id: true, name: true } },
      },
    });

    return this.formatMovement(movement);
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

    const stockMap = await this.getCurrentStockMap(clinicId);
    const lowStockItems = items
      .filter(item => stockMap[item.id] <= item.reorderThreshold)
      .map(item => ({
        id: item.id,
        displayName: this.getDisplayName(item),
        quantity: stockMap[item.id] || 0,
        reorderThreshold: item.reorderThreshold,
        shortage: item.reorderThreshold - (stockMap[item.id] || 0),
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

    const stockMap = await this.getCurrentStockMap(clinicId);
    return items.map(i => this.formatItem({ ...i, quantity: stockMap[i.id] || 0 }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async getCurrentStockMap(clinicId?: string): Promise<Record<string, number>> {
    const where: Prisma.StockMovementWhereInput = clinicId ? { clinicId } : {};
    const movements = await prisma.stockMovement.findMany({
      where,
      select: { inventoryItemId: true, quantityDelta: true },
    });

    const map: Record<string, number> = {};
    for (const m of movements) {
      map[m.inventoryItemId] = (map[m.inventoryItemId] || 0) + m.quantityDelta;
    }
    return map;
  }

  private async getCurrentStockMapByItem(inventoryItemId: string): Promise<Record<string, number>> {
    // Group by batch/date for FEFO
    const movements = await prisma.stockMovement.findMany({
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
    return {
      ...item,
      displayName: this.getDisplayName(item),
      isLowStock: item.quantity <= item.reorderThreshold,
      isExpiringSoon: item.expiryDate ? new Date(item.expiryDate) <= new Date(Date.now() + FEFO_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) : false,
    };
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