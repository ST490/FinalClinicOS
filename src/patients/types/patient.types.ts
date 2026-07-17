import { Gender } from '@prisma/client';

export interface CreatePatientInput {
  clinicId: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  tags?: string[];
  whatsappConsent?: boolean;
  smsConsent?: boolean;
  createdById: string;
}

export interface UpdatePatientInput {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  tags?: string[];
  whatsappConsent?: boolean;
  smsConsent?: boolean;
}

export interface PatientSearchInput {
  query?: string; // name, email, phone search
  clinicId?: string | { in: string[] };
  orgId?: string;
  tags?: string[];
  bloodGroup?: string;
  gender?: Gender;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PatientResponse {
  id: string;
  clinicId: string;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  bloodGroup: string | null;
  allergies: string[];
  medicalHistory: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  tags: string[];
  whatsappConsent: boolean;
  smsConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  // Relations (optional)
  visits?: any[];
  appointments?: any[];
  _count?: {
    visits: number;
    appointments: number;
  };
}

export interface PaginatedPatientsResponse {
  data: PatientResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}