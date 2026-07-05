import api from './api';

export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  allergies: string[];
  notes: string | null;
  createdAt: string;
}

export interface PageResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const patientApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await api.get<PageResponse<Patient>>('/patients', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<Patient>(`/patients/${id}`);
    return res.data;
  },

  create: async (data: Omit<Patient, 'id' | 'createdAt'>) => {
    const res = await api.post<Patient>('/patients', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Patient>) => {
    const res = await api.patch<Patient>(`/patients/${id}`, data);
    return res.data;
  },
};