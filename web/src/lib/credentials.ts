import api from './api';
import type { CredentialType } from '../../../src/credentials/credentials.types';

export type { CredentialType };

export interface StaffCredential {
  id: string;
  clinicId: string;
  orgId: string;
  userId: string;
  type: CredentialType;
  number: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  docUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialInput {
  clinicId: string;
  orgId: string;
  userId: string;
  type: CredentialType;
  number?: string;
  issuedAt?: string;
  expiresAt?: string;
  docUrl?: string;
}

export interface UpdateCredentialInput {
  type?: CredentialType;
  number?: string;
  issuedAt?: string;
  expiresAt?: string;
  docUrl?: string;
}

export const CREDENTIAL_TYPES: CredentialType[] = [
  'LICENSE',
  'DEA',
  'BOARD',
  'CME',
  'VACCINATION',
  'OTHER',
];

export const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  LICENSE: 'Medical License',
  DEA: 'DEA Certificate',
  BOARD: 'Board Credential',
  CME: 'CME Credits',
  VACCINATION: 'Vaccination',
  OTHER: 'Other',
};

export const credentialsApi = {
  list: async (params: {
    clinicId?: string;
    userId?: string;
    type?: CredentialType;
    expiringWithinDays?: number;
  }): Promise<StaffCredential[]> => {
    const res = await api.get<StaffCredential[]>('/credentials', { params });
    return res.data;
  },

  create: async (data: CreateCredentialInput): Promise<StaffCredential> => {
    const res = await api.post<StaffCredential>('/credentials', data);
    return res.data;
  },

  update: async (id: string, data: UpdateCredentialInput): Promise<StaffCredential> => {
    const res = await api.patch<StaffCredential>(`/credentials/${id}`, data);
    return res.data;
  },

  delete: async (id: string, clinicId: string, orgId: string): Promise<void> => {
    await api.delete(`/credentials/${id}`, { params: { clinicId, orgId } });
  },
};

// Days until expiry; negative = already expired; null = no expiry set.
export function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
}

export type ExpiryTier = 'expired' | 'soon' | 'ok' | 'none';

export function expiryTier(expiresAt: string | null): ExpiryTier {
  const d = daysUntil(expiresAt);
  if (d == null) return 'none';
  if (d < 0) return 'expired';
  if (d <= 90) return 'soon';
  return 'ok';
}
