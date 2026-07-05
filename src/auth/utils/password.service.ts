import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD HASHING (bcrypt with cost factor 12)
// ─────────────────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  // bcrypt handles salt internally — returns formatted string: $2b$12$...
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    return bcrypt.compareSync(password, storedHash);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN HASHING (for invite tokens, reset tokens, refresh tokens)
// SHA-256 — fast, one-way, output stored in DB
// ─────────────────────────────────────────────────────────────────────────────

export function generateInviteToken(): string {
  // Format: prefix_identifier_randomhex for easy identification
  const random = generateToken(24); // 48 hex chars total
  return `ci_${random}`;
}

export function generateRefreshToken(): string {
  const random = generateToken(32); // 64 hex chars
  return `rt_${random}`;
}

// Export these from password.service for token hashing
export { generateToken };

// ─────────────────────────────────────────────────────────────────────────────
// 2FA SECRET ENCRYPTION (AES-256-GCM)
// NOTE: In production, use a proper secrets manager (AWS KMS, Vault, etc.)
// This is app-layer encryption before storage
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.TOTP_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set. 2FA secrets will NOT be encrypted at rest!');
}

export function encrypt2FASecret(secret: string): string {
  if (!ENCRYPTION_KEY) {
    // Fallback: base64 encode only (NOT secure for production)
    return Buffer.from(secret).toString('base64');
  }

  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt2FASecret(encrypted: string): string {
  if (!ENCRYPTION_KEY) {
    // Fallback: base64 decode only
    return Buffer.from(encrypted, 'base64').toString('utf8');
  }

  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN STORAGE HELPERS (hashing for DB storage)
// Note: These are now exported here so jwt.service.ts can import from password.service
// ─────────────────────────────────────────────────────────────────────────────

export function hashToken(token: string): string {
  return createHmac('sha256', process.env.JWT_SECRET || 'dev-secret').update(token).digest('hex');
}

export function verifyTokenHash(token: string, hash: string): boolean {
  const computedHash = hashToken(token);
  try {
    return timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
  } catch {
    return false;
  }
}

// Internal token generation (not exported)
function generateToken(length: number): string {
  return crypto.randomBytes(length).toString('hex');
}