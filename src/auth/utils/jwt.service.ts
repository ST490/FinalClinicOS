import jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { JwtPayload } from '../types/auth.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// JWT CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production');
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS TOKEN
// ─────────────────────────────────────────────────────────────────────────────

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    {
      sub: payload.sub,
      orgId: payload.orgId,
      activeClinicId: payload.activeClinicId,
      roles: payload.roles,
      isOrgOwner: payload.isOrgOwner,
      is2FAEnabled: payload.is2FAEnabled,
    },
    JWT_SECRET!,
    { expiresIn: '15m', issuer: 'careme', audience: 'careme-api' }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET!, {
    issuer: 'careme',
    audience: 'careme-api',
  }) as JwtPayload;
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKEN (opaque token sent to client, hash stored in DB)
// ─────────────────────────────────────────────────────────────────────────────

export function generateRefreshTokenFamily(): string {
  // familyId groups tokens from the same login session for rotation detection
  return createHmac('sha256', JWT_SECRET!)
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 32);
}

export function getRefreshTokenExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return expiresAt;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function parseTokenExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // 15 minutes default

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return 900;
  }
}

export function getAccessTokenExpiry(): number {
  return parseTokenExpiry(JWT_EXPIRES_IN);
}

// Re-export for backwards compatibility
export { hashToken as hashRefreshToken } from './password.service.js';