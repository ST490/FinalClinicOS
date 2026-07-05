import api from './api';
import type { UserRole } from '../types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isOrgOwner: boolean;
  };
}

export interface ClinicInfo {
  id: string;
  name: string;
  orgId: string;
  roleName: string;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; refreshToken: string; user: LoginResponse['user'] }>('/auth/login', { email, password });
    return res.data;
  },

  refresh: async (refreshToken: string) => {
    const res = await api.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
    return res.data;
  },

  me: async () => {
    const res = await api.get<LoginResponse['user']>('/auth/me');
    return res.data;
  },

  getClinics: async () => {
    const res = await api.get<ClinicInfo[]>('/auth/clinics');
    return res.data;
  },
};