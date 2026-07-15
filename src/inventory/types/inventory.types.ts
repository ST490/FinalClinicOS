import {
  StockMovementType,
  InventoryTrackingType,
  InventoryRegulatoryClass,
  InventoryCostType,
  InventoryStockingLevel,
  InventoryClinicalCategory,
} from '@prisma/client';

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
  sellingPrice?: number;
  dosageForm?: string;
  strength?: string;
  ingredients?: string;
  // Classification
  trackingType?: InventoryTrackingType;
  regulatoryClass?: InventoryRegulatoryClass;
  costType?: InventoryCostType;
  stockingLevel?: InventoryStockingLevel;
  clinicalCategory?: InventoryClinicalCategory;
  // Tracking-type specifics
  serialNo?: string;
  consignmentOwner?: string;
  createdById: string;
}

export interface UpdateInventoryItemInput {
  customName?: string;
  customBrand?: string;
  reorderThreshold?: number;
  unitPrice?: number;
  mrp?: number;
  sellingPrice?: number;
  dosageForm?: string;
  strength?: string;
  ingredients?: string;
  // Classification
  trackingType?: InventoryTrackingType;
  regulatoryClass?: InventoryRegulatoryClass;
  costType?: InventoryCostType;
  stockingLevel?: InventoryStockingLevel;
  clinicalCategory?: InventoryClinicalCategory;
  serialNo?: string;
  consignmentOwner?: string;
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
  // Controlled-substance dual sign-off (required when the item is CONTROLLED)
  secondSignatoryId?: string;
}

export interface InventorySearchInput {
  clinicId?: string;
  medicineId?: string;
  lowStock?: boolean;
  expiringBefore?: string;
  ingredients?: string;
  // Classification filters
  trackingType?: InventoryTrackingType;
  regulatoryClass?: InventoryRegulatoryClass;
  costType?: InventoryCostType;
  stockingLevel?: InventoryStockingLevel;
  clinicalCategory?: InventoryClinicalCategory;
  page?: number;
  limit?: number;
  sortBy?: 'quantity' | 'expiryDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/** Viewer context used to scope the result set (pharmacist → PHARMA only). */
export interface InventoryViewer {
  roles: string[];
  isOrgOwner: boolean;
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
  sellingPrice: any | null;
  margin: number | null;
  dosageForm: string | null;
  strength: string | null;
  ingredients: string | null;
  // Classification
  trackingType: InventoryTrackingType;
  regulatoryClass: InventoryRegulatoryClass;
  costType: InventoryCostType;
  stockingLevel: InventoryStockingLevel;
  clinicalCategory: InventoryClinicalCategory;
  serialNo: string | null;
  consignmentOwner: string | null;
  displayName: string;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  createdAt: Date;
  // Relations
  medicine?: { id: string; genericName: string; brandNames: string[]; composition?: string | null };
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