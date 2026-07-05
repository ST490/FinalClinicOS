// Re-export middleware for convenience
export { authenticate, requireRole, requireClinicAccess, loadUserRoles } from './auth.middleware.js';
export type { Permission } from './auth.middleware.js';