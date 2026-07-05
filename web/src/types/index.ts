export type UserRole = 'MASTER' | 'SUB_MASTER' | 'DOCTOR' | 'NURSE' | 'PHARMACIST' | 'RECEPTIONIST' | 'HR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isOrgOwner: boolean;
}

export interface Clinic {
  id: string;
  name: string;
  orgId: string;
  roleName?: string;
}