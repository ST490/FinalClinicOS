import { AppointmentType, AppointmentStatus, AppointmentCategory } from '@prisma/client';

export interface CreateAppointmentInput {
  clinicId: string;
  patientId: string;
  doctorId: string;
  slotStart: string; // ISO date string
  slotEnd: string;
  type?: AppointmentType;
  notes?: string;
  isNewPatient?: boolean;
  category?: AppointmentCategory;
  createdById: string;
}

export interface UpdateAppointmentInput {
  slotStart?: string;
  slotEnd?: string;
  status?: AppointmentStatus;
  notes?: string;
  queuePosition?: number;
  type?: AppointmentType;
  category?: AppointmentCategory;
}

export interface AppointmentSearchInput {
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
  sortBy?: 'slotStart' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DoctorAvailabilityInput {
  clinicId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
}

export interface SlotAvailability {
  slotStart: Date;
  slotEnd: Date;
  available: boolean;
  existingAppointmentId?: string;
}

export interface AppointmentResponse {
  id: string;
  clinicId: string;
  orgId: string;
  patientId: string;
  doctorId: string;
  slotStart: Date;
  slotEnd: Date;
  type: AppointmentType;
  status: AppointmentStatus;
  category: AppointmentCategory;
  visitId: string | null;
  notes: string | null;
  isNewPatient: boolean;
  queuePosition: number | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  clinic?: { id: string; name: string };
  patient?: { id: string; name: string; phone: string | null };
  doctor?: { id: string; name: string };
}

export interface PaginatedAppointmentsResponse {
  data: AppointmentResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Permission guards only — actual enforcement via middleware
export const PERMISSIONS = {
  create: ['appointment:create'],
  read: ['appointment:read'],
  update: ['appointment:update'],
  cancel: ['appointment:cancel'],
} as const;