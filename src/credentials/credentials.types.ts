export type CredentialType =
  | 'LICENSE'
  | 'DEA'
  | 'BOARD'
  | 'CME'
  | 'VACCINATION'
  | 'OTHER';

export const CREDENTIAL_TYPES: CredentialType[] = [
  'LICENSE',
  'DEA',
  'BOARD',
  'CME',
  'VACCINATION',
  'OTHER',
];

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

export interface ListCredentialsInput {
  clinicId?: string | string[];
  orgId?: string;
  userId?: string;
  type?: CredentialType;
  expiringWithinDays?: number;
}
