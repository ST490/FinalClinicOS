import api from './api';

export type AppointmentType = 'SCHEDULED' | 'WALK_IN';
export type AppointmentStatus =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';
export type AppointmentCategory = 'FIRST_TIME' | 'RETURNING' | 'FREE_CHECKUP';

export interface Appointment {
  id: string;
  clinicId: string;
  orgId: string;
  patientId: string;
  doctorId: string | null;
  slotStart: string;
  slotEnd: string;
  type: AppointmentType;
  status: AppointmentStatus;
  category: AppointmentCategory;
  visitId: string | null;
  notes: string | null;
  isNewPatient: boolean;
  queuePosition: number | null;
  createdAt: string;
  updatedAt: string;
  clinic?: { id: string; name: string };
  patient?: { id: string; name: string; phone: string | null };
  doctor?: { id: string; name: string };
}

export interface PageResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const appointmentApi = {
  list: async (params?: {
    clinicId?: string;
    doctorId?: string;
    patientId?: string;
    status?: AppointmentStatus | AppointmentStatus[];
    fromDate?: string;
    toDate?: string;
    type?: AppointmentType;
    category?: AppointmentCategory;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get<PageResponse<Appointment>>('/appointments', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<Appointment>(`/appointments/${id}`);
    return res.data;
  },

  create: async (data: {
    clinicId: string;
    patientId: string;
    doctorId: string;
    slotStart: string;
    slotEnd: string;
    type?: AppointmentType;
    category?: AppointmentCategory;
    isNewPatient?: boolean;
    notes?: string;
  }) => {
    const res = await api.post<Appointment>('/appointments', data);
    return res.data;
  },

  update: async (
    id: string,
    data: Partial<{
      status: AppointmentStatus;
      category: AppointmentCategory;
      queuePosition: number;
      notes: string;
      slotStart: string;
      slotEnd: string;
      type: AppointmentType;
    }>,
  ) => {
    const res = await api.patch<Appointment>(`/appointments/${id}`, data);
    return res.data;
  },

  cancel: async (id: string) => {
    const res = await api.delete<Appointment>(`/appointments/${id}`);
    return res.data;
  },
};
