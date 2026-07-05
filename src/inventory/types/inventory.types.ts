import { StockMovementType } from '@prisma/client';

export interface CreateInventoryItemInput {
  clinicId: string;
  medicineId?: string;
  customName?: string;
  customBrand?: string;
  batchNo?: string;
  expiryDate?: string;
  quantity: number;
  reorderThreshold?: number;
  unitPrice: number;
  mrp?: number;
  dosageForm?: string;
  strength?: string;
  createdById: string;
}

export interface UpdateInventoryItemInput {
  customName?: string;
  customBrand?: string;
  reorderThreshold?: number;
  unitPrice?: number;
  mrp?: number;
  dosageForm?: string;
  strength?: string;
}

export interface StockAdjustmentInput {
  type: StockMovementType;
  quantityDelta: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  batchNo?: string;
  expiryDate?: string;
  performedById: string;
}

export interface InventorySearchInput {
  clinicId?: string;
  medicineId?: string;
  lowStock?: boolean;
  expiringBefore?: string;
  page?: number;
  limit?: number;
  sortBy?: 'quantity' | 'expiryDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryItemResponse {
  id: string;
  clinicId: string;
  orgId: string;
  medicineId: string | null;
  customName: string | null;
  customBrand: string | null;
  batchNo: string | null;
  expiryDate: Date | null;
  quantity: number;
  reorderThreshold: number;
  unitPrice: any;
  mrp: any | null;
  dosageForm: string | null;
  strength: string | null;
  displayName: string;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  createdAt: Date;
  // Relations
  medicine?: { id: string; genericName: string; brandNames: string[] };
}

export interface StockMovementResponse {
  id: string;
  clinicId: string;
  orgId: string;
  inventoryItemId: string;
  type: StockMovementType;
  quantityDelta: number;
  referenceType: string | null;
  referenceId: string | null;
  newBatchNo: string | null;
  newExpiryDate: Date | null;
  notes: string | null;
  createdAt: Date;
  performedBy?: { id: string; name: string };
}

export interface LowStockAlert {
  clinicId: string;
  clinicName: string;
  items: {
    id: string;
    displayName: string;
    quantity: number;
    reorderThreshold: number;
    shortage: number;
  }[];
}

export const FEFO_THRESHOLD_DAYS = 30; // Items expiring within 30 days marked as "expiring soon"