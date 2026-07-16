import api from './api';

export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  allergies: string[];
  medicalHistory: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  tags?: string[];
  whatsappConsent?: boolean;
  smsConsent?: boolean;
  createdAt: string;
}

export type GenderValue = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface CreatePatientInput {
  clinicId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: GenderValue | null;
  bloodGroup?: string | null;
  allergies?: string[];
  medicalHistory?: string | null;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  tags?: string[];
  whatsappConsent?: boolean;
  smsConsent?: boolean;
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
  list: async (params?: { page?: number; limit?: number; query?: string; clinicId?: string }) => {
    const res = await api.get<PageResponse<Patient>>('/patients', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<Patient>(`/patients/${id}`);
    return res.data;
  },

  create: async (data: CreatePatientInput) => {
    const res = await api.post<Patient>('/patients', data);
    return res.data;
  },

  update: async (id: string, data: Partial<CreatePatientInput>) => {
    const res = await api.patch<Patient>(`/patients/${id}`, data);
    return res.data;
  },
};