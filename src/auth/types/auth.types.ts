import { UserRoleType } from '@prisma/client';

// Re-export for convenience
export type { UserRoleType };

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;                    // User ID
  orgId: string;
  activeClinicId: string | null;  // Current clinic context
  roles: UserRoleType[];
  isOrgOwner: boolean;
  is2FAEnabled: boolean;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  orgId: string;
  activeClinicId: string | null;
  roles: { clinicId: string; role: UserRoleType; clinicName?: string }[];
  isOrgOwner: boolean;
  is2FAEnabled: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  email?: string;
  phone?: string;
  password: string;
  name: string;
  orgName: string;
  country: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface InviteSubMasterInput {
  email?: string;
  phone?: string;
  name: string;
  clinicId?: string; // Will be created with the sub-master
  clinicName?: string;
  invitedById: string;
  orgId: string;
}

export interface InviteStaffInput {
  email?: string;
  phone?: string;
  name: string;
  clinicId: string;
  role: Exclude<UserRoleType, 'MASTER'>; // Exclude MASTER from staff roles
  invitedById: string;
  orgId: string;
}

export interface AcceptInviteInput {
  token: string;
  password: string;
  name: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ForgotPasswordInput {
  email?: string;
  phone?: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: UserProfile;
  requires2FA?: boolean;
  tempToken?: string; // For 2FA verification step
  message?: string; // For 2FA enforcement messages
  isInviteLogin?: boolean; // Signal to frontend to redirect to password setup
  inviteToken?: string; // Raw token to pre-fill the accept-invite form
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
  orgName?: string | null; // Included for convenience — avoids a separate /orgs/:id call
  isOrgOwner: boolean;
  roles: { clinicId: string | null; role: UserRoleType; clinicName?: string }[];
  twoFactorEnabled: boolean;
}

export interface InviteResponse {
  inviteId: string;
  message: string;
  // Link will be sent via email/SMS, not returned in response
}

export interface Setup2FAResponse {
  secret: string;
  qrCodeUrl: string; // otpauth:// URL for QR code generation
}

export interface SwitchClinicResponse {
  accessToken: string;
  activeClinicId: string;
}