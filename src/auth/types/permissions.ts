import { UserRoleType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION MATRIX
// ─────────────────────────────────────────────────────────────────────────────

export type Permission =
  // Clinic management
  | 'clinic:manage'          // create + update + delete (convenience alias)
  | 'clinic:create'
  | 'clinic:update'
  | 'clinic:delete'
  | 'clinic:read'
  | 'clinic:read-all'       // Can read all clinics in org (MASTER)

  // Staff management
  | 'staff:invite'
  | 'staff:manage'
  | 'staff:read'
  | 'staff:delete'

  // Clinical
  | 'patient:create'
  | 'patient:read'
  | 'patient:read-all'      // All patients in org (MASTER)
  | 'patient:update'
  | 'patient:delete'

  | 'appointment:create'
  | 'appointment:read'
  | 'appointment:update'
  | 'appointment:cancel'

  | 'prescription:create'
  | 'prescription:read'
  | 'prescription:update'
  | 'prescription:cancel'

  // Inventory
  | 'inventory:manage'
  | 'inventory:read'

  // Billing/Dues
  | 'dues:manage'
  | 'dues:read'
  | 'dues:waive'

  // HR
  | 'attendance:manage'
  | 'attendance:read'
  | 'payroll:read'

  // Org-level
  | 'org:manage'            // Master only — billing, plans, etc.
  | 'org:read';

const PERMISSIONS: Record<UserRoleType, Permission[]> = {
  MASTER: [
    // Everything
    'clinic:manage', 'clinic:create', 'clinic:update', 'clinic:delete', 'clinic:read', 'clinic:read-all',
    'staff:invite', 'staff:manage', 'staff:read', 'staff:delete',
    'patient:create', 'patient:read', 'patient:read-all', 'patient:update', 'patient:delete',
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel',
    'prescription:create', 'prescription:read', 'prescription:update', 'prescription:cancel',
    'inventory:manage', 'inventory:read',
    'dues:manage', 'dues:read', 'dues:waive',
    'attendance:manage', 'attendance:read', 'payroll:read',
    'org:manage', 'org:read',
  ],

  SUB_MASTER: [
    // Full access within their clinic(s)
    'clinic:manage', 'clinic:read',
    'staff:invite', 'staff:manage', 'staff:read', 'staff:delete',
    'patient:create', 'patient:read', 'patient:update', 'patient:delete',
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel',
    'prescription:create', 'prescription:read', 'prescription:update', 'prescription:cancel',
    'inventory:manage', 'inventory:read',
    'dues:manage', 'dues:read', 'dues:waive',
    'attendance:manage', 'attendance:read',
    'org:read',
  ],

  DOCTOR: [
    'patient:create', 'patient:read', 'patient:update',
    'appointment:read', 'appointment:update',
    'prescription:create', 'prescription:read',
    'inventory:read',
  ],

  NURSE: [
    'patient:create', 'patient:read', 'patient:update',
    'appointment:create', 'appointment:read', 'appointment:update',
    'inventory:read',
  ],

  PHARMACIST: [
    'patient:read',
    'appointment:read',
    'prescription:read',
    'inventory:manage', 'inventory:read',
    'dues:manage', 'dues:read',
  ],

  RECEPTIONIST: [
    'patient:create', 'patient:read',
    'appointment:create', 'appointment:read', 'appointment:update',
    'dues:manage', 'dues:read',
  ],

  HR: [
    // Staff management, attendance, payroll — no clinical/billing access
    'staff:invite', 'staff:manage', 'staff:read',
    'attendance:manage', 'attendance:read',
    'payroll:read',
    'clinic:read',
    'org:read',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// RBAC UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function hasPermission(roles: UserRoleType[], permission: Permission): boolean {
  return roles.some(role => PERMISSIONS[role]?.includes(permission));
}

export function getPermissions(roles: UserRoleType[]): Permission[] {
  return roles.flatMap(role => PERMISSIONS[role] || []);
}

export function requirePermissions(permissions: Permission[]) {
  return (roles: UserRoleType[]) => {
    return permissions.every(p => hasPermission(roles, p));
  };
}

export const ROLES = {
  ADMIN: ['MASTER'] as UserRoleType[],
  CLINIC_ADMIN: ['MASTER', 'SUB_MASTER'] as UserRoleType[],
  CLINICAL: ['DOCTOR', 'NURSE'] as UserRoleType[],
  ALL_STAFF: ['MASTER', 'SUB_MASTER', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST', 'HR'] as UserRoleType[],
};