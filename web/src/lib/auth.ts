import api from './api';
import type { UserRole } from '../types';

/**
 * Auth response shapes — match src/auth/types/auth.types.ts exactly.
 * Changing these is breaking: the response from the backend is the contract.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: UserProfile;
  requires2FA?: boolean;
  tempToken?: string;
  message?: string;
  isInviteLogin?: boolean;
  inviteToken?: string;
}

export interface RegisterResponse {
  tokens: AuthTokens;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  orgId: string;
  isOrgOwner: boolean;
  roles: { clinicId: string | null; role: UserRole; clinicName?: string }[];
  twoFactorEnabled: boolean;
}

export interface ClinicInfo {
  id: string;
  name: string;
  orgId: string;
  roleName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
  currency?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  landingPageSlug?: string | null;
  status?: string | null;
}

/**
 * Auth API — thin wrappers over the backend auth endpoints.
 * The browser-side `login`/`register` flow treats them identically: backend
 * returns { tokens, user }; we surface the tokens as the rest of the app expects.
 */
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    return res.data;
  },

  acceptInvite: async (input: { token: string; password: string; name: string }): Promise<RegisterResponse> => {
    const res = await api.post<RegisterResponse>('/auth/accept-invite', input);
    return res.data;
  },

  register: async (input: {
    email?: string;
    phone?: string;
    password: string;
    name: string;
    orgName: string;
    country: string;
  }): Promise<RegisterResponse> => {
    const res = await api.post<RegisterResponse>('/auth/register', input);
    return res.data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const res = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
    return res.data;
  },

  me: async (): Promise<UserProfile> => {
    const res = await api.get<UserProfile>('/auth/me');
    return res.data;
  },

  getOrg: async (orgId: string): Promise<{ id: string; name: string }> => {
    const res = await api.get<{ id: string; name: string }>(`/orgs/${orgId}`);
    return res.data;
  },

  logout: async (refreshToken?: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  getClinics: async (): Promise<ClinicInfo[]> => {
    const res = await api.get<any>('/clinics');
    return res.data?.data || [];
  },

  createClinic: async (data: {
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
    workingHours?: unknown;
  }): Promise<ClinicInfo> => {
    const res = await api.post<ClinicInfo>('/clinics', data);
    return res.data;
  },

  getClinic: async (id: string): Promise<any> => {
    const res = await api.get<any>(`/clinics/${id}`);
    return res.data;
  },

  updateClinic: async (id: string, data: Record<string, unknown>): Promise<void> => {
    await api.patch(`/clinics/${id}`, data);
  },

  updateClinicBranding: async (
    id: string,
    data: { logoUrl?: string; bannerUrl?: string; accentColor?: string; landingPageSlug?: string },
  ): Promise<void> => {
    await api.patch(`/clinics/${id}/branding`, data);
  },

  switchClinic: async (clinicId: string | null): Promise<AuthTokens> => {
    const res = await api.post<AuthTokens>('/auth/switch-clinic', { clinicId });
    return res.data;
  },

  logoutAll: async (): Promise<void> => {
    await api.post('/auth/logout-all', {});
  },

  setup2FA: async (): Promise<{ secret: string; qrCodeUrl: string }> => {
    const res = await api.post<{ secret: string; qrCodeUrl: string }>('/auth/2fa/setup', {});
    return res.data;
  },

  verify2FA: async (code: string): Promise<void> => {
    await api.post('/auth/2fa/verify', { code });
  },

  verify2FALogin: async (tempToken: string, code: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/2fa/verify-login', { tempToken, code });
    return res.data;
  },

  deleteClinic: async (id: string): Promise<void> => {
    await api.delete(`/clinics/${id}`);
  },
};
