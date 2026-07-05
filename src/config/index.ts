import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// SERVER
// ─────────────────────────────────────────────────────────────────────────────
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const API_URL = process.env.API_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// JWT
// ─────────────────────────────────────────────────────────────────────────────
export const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
export const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────────────────────
export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clinicos';

// ─────────────────────────────────────────────────────────────────────────────
// REDIS
// ─────────────────────────────────────────────────────────────────────────────
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ─────────────────────────────────────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────────────────────────────────────
export const SESSION_SECRET = process.env.SESSION_SECRET || 'development-session-secret';

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────
export const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

// ─────────────────────────────────────────────────────────────────────────────
// ENCRYPTION
// ─────────────────────────────────────────────────────────────────────────────
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// TOTP secret for 2FA
export const TOTP_ISSUER = process.env.TOTP_ISSUER || 'ClinicOS';

// ─────────────────────────────────────────────────────────────────────────────
// INVITE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
export const INVITE_EXPIRY_DAYS = parseInt(process.env.INVITE_EXPIRY_DAYS || '7', 10);
export const PASSWORD_RESET_EXPIRY_HOURS = parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS || '1', 10);

// ─────────────────────────────────────────────────────────────────────────────
// BCRYPT
// ─────────────────────────────────────────────────────────────────────────────
export const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────
export const LOGIN_RATE_LIMIT = parseInt(process.env.LOGIN_RATE_LIMIT || '5', 10); // attempts per window
export const LOGIN_RATE_WINDOW = parseInt(process.env.LOGIN_RATE_WINDOW || '300', 10) * 1000; // 5 minutes in ms
export const API_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '100', 10); // requests per window
export const API_RATE_WINDOW = parseInt(process.env.API_RATE_WINDOW || '60', 10) * 1000; // 1 minute in ms

// ─────────────────────────────────────────────────────────────────────────────
// OBJECT STORAGE (for file uploads)
// ─────────────────────────────────────────────────────────────────────────────
export const S3_BUCKET = process.env.S3_BUCKET;
export const S3_REGION = process.env.S3_REGION || 'us-east-1';
export const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
export const S3_SECRET_KEY = process.env.S3_SECRET_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// TWILIO (for SMS)
// ─────────────────────────────────────────────────────────────────────────────
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP BSP (Interakt, AiSensy, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export const WHATSAPP_BSP_API_KEY = process.env.WHATSAPP_BSP_API_KEY;
export const WHATSAPP_BSP_WEBHOOK_SECRET = process.env.WHATSAPP_BSP_WEBHOOK_SECRET;

// ─────────────────────────────────────────────────────────────────────────────
// MEDICINE DATA
// ─────────────────────────────────────────────────────────────────────────────
export const MEDICINE_DB_PROVIDER = process.env.MEDICINE_DB_PROVIDER || 'default';
export const MEDICINE_DB_COUNTRY = process.env.MEDICINE_DB_COUNTRY || 'IN'; // Default to India

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG OBJECT (convenience export)
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  port: PORT,
  nodeEnv: NODE_ENV,
  apiUrl: API_URL,
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN,
  refreshTokenExpiresDays: REFRESH_TOKEN_EXPIRES_DAYS,
  databaseUrl: DATABASE_URL,
  redisUrl: REDIS_URL,
  sessionSecret: SESSION_SECRET,
  corsOrigins: CORS_ORIGINS,
  encryptionKey: ENCRYPTION_KEY,
  totpIssuer: TOTP_ISSUER,
  inviteExpiryDays: INVITE_EXPIRY_DAYS,
  passwordResetExpiryHours: PASSWORD_RESET_EXPIRY_HOURS,
  bcryptRounds: BCRYPT_ROUNDS,
  loginRateLimit: LOGIN_RATE_LIMIT,
  loginRateWindow: LOGIN_RATE_WINDOW,
  apiRateLimit: API_RATE_LIMIT,
  apiRateWindow: API_RATE_WINDOW,
};

export default config;