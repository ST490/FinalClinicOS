import api from './api';

export interface InventoryItem {
  id: string;
  clinicId: string;
  medicineMasterId: string | null;
  customName: string;
  batchNumber: string | null;
  quantity: number;
  unitPrice: string;
  costPrice: string;
  reorderThreshold: number;
  expiryDate: string | null;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  createdAt: string;
}

export const inventoryApi = {
  list: async (params?: { clinicId?: string; page?: number; limit?: number; search?: string; status?: string }) => {
    const res = await api.get<{ data: InventoryItem[]; pagination: any }>('/inventory', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<InventoryItem>(`/inventory/${id}`);
    return res.data;
  },

  create: async (data: Omit<InventoryItem, 'id' | 'createdAt'>) => {
    const res = await api.post<InventoryItem>('/inventory', data);
    return res.data;
  },

  update: async (id: string, data: Partial<InventoryItem>) => {
    const res = await api.patch<InventoryItem>(`/inventory/${id}`, data);
    return res.data;
  },

  recordMovement: async (data: { inventoryItemId: string; type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'EXPIRED' | 'DAMAGED'; quantityDelta: number; reason?: string }) => {
    const res = await api.post('/inventory/movements', data);
    return res.data;
  },
};