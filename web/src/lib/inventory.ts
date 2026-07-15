import api from './api';

/**
 * Inventory client.
 * Field names mirror `src/inventory/inventory.router.ts` create schema exactly:
 *   clinicId (required), medicineId?, customName?, customBrand?, batchNo?, expiryDate?,
 *   quantity (≥0), reorderThreshold?, unitPrice (buy price, required), sellingPrice? (sell price),
 *   mrp?, dosageForm?, strength?, classification attrs (trackingType/regulatoryClass/...).
 */
export type InventoryTrackingType = 'LOT_BATCH' | 'SERIAL' | 'BULK';
export type InventoryRegulatoryClass = 'STANDARD' | 'CONTROLLED' | 'COLD_CHAIN';
export type InventoryCostType = 'CHARGEABLE' | 'OVERHEAD';
export type InventoryStockingLevel = 'CENTRAL' | 'DEPARTMENT' | 'CONSIGNMENT';
export type InventoryClinicalCategory =
  | 'PHARMA' | 'SURGICAL' | 'DIAGNOSTIC' | 'PPE' | 'DIETARY' | 'LINEN' | 'MRO' | 'OTHER';

export interface InventoryItem {
  id: string;
  clinicId: string;
  medicineId: string | null;
  customName: string | null;
  customBrand?: string | null;
  batchNo: string | null;
  quantity: number;
  reorderThreshold: number;
  unitPrice: number | string;          // buy price
  mrp?: number | string | null;
  sellingPrice?: number | string | null; // sell price
  margin?: number | null;
  expiryDate: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  ingredients?: string | null;
  // Classification
  trackingType: InventoryTrackingType;
  regulatoryClass: InventoryRegulatoryClass;
  costType: InventoryCostType;
  stockingLevel: InventoryStockingLevel;
  clinicalCategory: InventoryClinicalCategory;
  serialNo?: string | null;
  consignmentOwner?: string | null;
  medicine?: { id: string; genericName: string; brandNames: string[]; composition?: string | null } | null;
  createdAt: string;
}

export const CLINICAL_CATEGORIES: InventoryClinicalCategory[] = [
  'PHARMA', 'SURGICAL', 'DIAGNOSTIC', 'PPE', 'DIETARY', 'LINEN', 'MRO', 'OTHER',
];

export const inventoryApi = {
  list: async (params?: {
    clinicId?: string;
    page?: number;
    limit?: number;
    lowStock?: boolean;
    trackingType?: InventoryTrackingType;
    regulatoryClass?: InventoryRegulatoryClass;
    costType?: InventoryCostType;
    stockingLevel?: InventoryStockingLevel;
    clinicalCategory?: InventoryClinicalCategory;
  }) => {
    const res = await api.get<{ data: InventoryItem[]; pagination: any }>('/inventory', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<InventoryItem>(`/inventory/${id}`);
    return res.data;
  },

  create: async (data: {
    clinicId: string;
    medicineId?: string;
    customName: string;
    customBrand?: string;
    batchNo?: string;
    expiryDate?: string;
    quantity: number;
    reorderThreshold?: number;
    unitPrice: number;
    sellingPrice?: number;
    mrp?: number;
    dosageForm?: string;
    strength?: string;
    ingredients?: string;
    trackingType?: InventoryTrackingType;
    regulatoryClass?: InventoryRegulatoryClass;
    costType?: InventoryCostType;
    stockingLevel?: InventoryStockingLevel;
    clinicalCategory?: InventoryClinicalCategory;
    serialNo?: string;
    consignmentOwner?: string;
  }) => {
    const res = await api.post<InventoryItem>('/inventory', data);
    return res.data;
  },

  update: async (id: string, data: Partial<InventoryItem>) => {
    const res = await api.patch<InventoryItem>(`/inventory/${id}`, data);
    return res.data;
  },

  adjust: async (id: string, data: {
    type: 'RESTOCK' | 'WRITE_OFF' | 'ADJUSTMENT' | 'RETURN' | 'SALE';
    quantityDelta: number;
    notes?: string;
    batchNo?: string;
    expiryDate?: string;
  }) => {
    const res = await api.post<InventoryItem>(`/inventory/${id}/adjust`, data);
    return res.data;
  },

  deduct: async (id: string, data: { quantity: number; referenceType?: string; referenceId?: string }) => {
    const res = await api.post<InventoryItem>(`/inventory/${id}/deduct`, data);
    return res.data;
  },

  history: async (id: string) => {
    const res = await api.get<any[]>(`/inventory/${id}/history`);
    return res.data;
  },
};
