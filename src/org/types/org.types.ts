// Organization create
export interface CreateOrgInput {
  name: string;
  country: string;
  plan?: string;
  createdById: string;
}

// Clinic create/update
export interface CreateClinicInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
  workingHours?: any;
  createdById: string;
}

export interface UpdateClinicInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
  workingHours?: any;
  status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'DELETED';
}

export interface BrandingInput {
  logoUrl?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  landingPageSlug?: string | null;
}

// Response types
export interface OrgResponse {
  id: string;
  name: string;
  country: string;
  plan: string | null;
  status: string;
  clinicCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicResponse {
  id: string;
  orgId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  locale: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  accentColor: string | null;
  landingPageSlug: string | null;
  workingHours: any;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  orgName?: string;
}

export interface SearchClinicsInput {
  orgId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}