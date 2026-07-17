import api from './api';

export type PrescriptionStatus =
  | 'ACTIVE'
  | 'DISPENSED'
  | 'PAID'
  | 'NOT_ARRIVED'
  | 'CANCELLED';

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  ACTIVE: 'Active',
  DISPENSED: 'Dispensed',
  PAID: 'Paid',
  NOT_ARRIVED: 'Not Arrived',
  CANCELLED: 'Cancelled',
};

// ponytail: badges only — color classes map 1:1 to status
export const PRESCRIPTION_STATUS_BADGE: Record<PrescriptionStatus, string> = {
  ACTIVE: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25',
  DISPENSED: 'bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-500/25',
  PAID: 'bg-success/15 text-success border border-success/25',
  NOT_ARRIVED: 'bg-warning/15 text-warning border border-warning/25',
  CANCELLED: 'bg-danger/15 text-danger border border-danger/25',
};

export interface Prescription {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  visitId: string | null;
  notes: string | null;
  status: PrescriptionStatus;
  cancelledAt: string | null;
  cancelledById: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; name: string; phone: string | null };
  doctor?: { id: string; name: string };
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicineId: string | null;
  customName: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  quantity: number;
  dispensed: boolean;
  dispensedQty: number;
  medicine?: { id: string; genericName: string; brandNames: string[] };
}

export function itemName(item: PrescriptionItem): string {
  return item.medicine?.genericName || item.customName || 'Unnamed medication';
}

export const prescriptionApi = {
  list: async (params?: {
    patientId?: string;
    clinicId?: string;
    doctorId?: string;
    status?: PrescriptionStatus;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get<{ data: Prescription[]; pagination: any }>('/prescriptions', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<Prescription>(`/prescriptions/${id}`);
    return res.data;
  },

  create: async (data: {
    clinicId: string;
    patientId: string;
    doctorId: string;
    visitId?: string;
    notes?: string;
    items: { medicineName: string; dosage?: string; frequency?: string; duration?: string; quantity?: number; instructions?: string }[];
  }) => {
    const res = await api.post<Prescription>('/prescriptions', {
      clinicId: data.clinicId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      visitId: data.visitId,
      notes: data.notes,
      // backend expects customName, not medicineName
      items: data.items.map(i => ({
        customName: i.medicineName,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        quantity: i.quantity ?? 1,
        instructions: i.instructions,
      })),
    });
    return res.data;
  },

  dispense: async (id: string, items: { prescriptionItemId: string; quantity: number }[], secondSignatoryId?: string) => {
    const res = await api.post<Prescription>(`/prescriptions/${id}/dispense`, { items, secondSignatoryId });
    return res.data;
  },

  deleteItem: async (itemId: string) => {
    const res = await api.delete<{ success: boolean }>(`/prescriptions/items/${itemId}`);
    return res.data;
  },

  setStatus: async (id: string, status: PrescriptionStatus) => {
    const res = await api.patch<Prescription>(`/prescriptions/${id}/status`, { status });
    return res.data;
  },

  cancel: async (id: string) => {
    const res = await api.post<Prescription>(`/prescriptions/${id}/cancel`, {});
    return res.data;
  },
};
