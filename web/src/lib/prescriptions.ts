import api from './api';

export interface Prescription {
  id: string;
  clinicId: string;
  patientId: string;
  patientName?: string;
  visitId: string | null;
  doctorId: string | null;
  doctorName?: string;
  notes: string | null;
  status: 'ACTIVE' | 'DISPENSED' | 'CANCELLED';
  items: PrescriptionItem[];
  createdAt: string;
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
  dispensedQuantity: number;
}

export const prescriptionApi = {
  list: async (params?: { patientId?: string; clinicId?: string; page?: number; limit?: number }) => {
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
    visitId?: string;
    doctorId?: string;
    notes?: string;
    items: { medicineName: string; dosage: string; frequency: string; duration: string; quantity: number; instructions?: string }[];
  }) => {
    const res = await api.post<Prescription>('/prescriptions', data);
    return res.data;
  },

  dispense: async (id: string, data: { items: { itemId: string; dispensedQuantity: number }[] }) => {
    const res = await api.post<Prescription>(`/prescriptions/${id}/dispense`, data);
    return res.data;
  },

  cancel: async (id: string, data: { reason: string }) => {
    const res = await api.post<Prescription>(`/prescriptions/${id}/cancel`, data);
    return res.data;
  },
};