import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './auth.service.js';
import { authenticate, requireRole } from './middleware/index.js';
import { loginRateLimit } from '../common/middleware/rate-limit.middleware.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().min(10).optional().or(z.literal('')),
  password: z.string().min(8),
  name: z.string().trim().min(2),
  orgName: z.string().trim().min(2),
  country: z.string().trim().length(2),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
});

const loginSchema = z.object({
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  password: z.string(),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
});

const inviteSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().min(2),
  clinicId: z.string().uuid().optional(), // Required for staff, may be null for sub-master
  role: z.enum(['SUB_MASTER', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST', 'HR']),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
}).refine(data => {
  // SUB_MASTER doesn't need a clinicId (clinic is created with them)
  if (data.role === 'SUB_MASTER') return true;
  return !!data.clinicId;
}, {
  message: 'clinicId is required for staff roles',
  path: ['clinicId'],
});

const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const verify2FASchema = z.object({
  code: z.string().length(6),
});

const verify2FALoginSchema = z.object({
  tempToken: z.string(),
  code: z.string().length(6),
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /auth/register — Create org + Master user
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register({
      ...data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /auth/login
router.post('/login', loginRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login({
      ...data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /auth/refresh — Refresh access token
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /auth/logout — Invalidate refresh token
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.body.refreshToken;
    await authService.logout(req.user!.id, refreshToken);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /auth/logout-all — Invalidate all refresh tokens for user
router.post('/logout-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.logoutAll(req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /auth/invite/sub-master — Invite a clinic owner (MASTER only)
router.post(
  '/invite/sub-master',
  authenticate,
  requireRole('MASTER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = inviteSchema.parse({ ...req.body, role: 'SUB_MASTER' });
      const result = await authService.inviteSubMaster({
        ...data,
        invitedById: req.user!.id,
        orgId: req.user!.orgId,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/invite/staff — Invite staff to a clinic (MASTER or SUB_MASTER)
router.post(
  '/invite/staff',
  authenticate,
  requireRole('MASTER', 'SUB_MASTER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = inviteSchema.parse(req.body);
      const result = await authService.inviteStaff({
        ...data,
        invitedById: req.user!.id,
        orgId: req.user!.orgId,
        clinicId: data.clinicId!, // Already validated it's not null for staff
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/accept-invite — Accept invitation, set password
router.post('/accept-invite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password, name } = acceptInviteSchema.parse(req.body);
    const result = await authService.acceptInvite({
      token,
      password,
      name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /auth/me — Get current user
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// POST /auth/2fa/setup — Generate 2FA secret (for authenticated users)
router.post(
  '/2fa/setup',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.setup2FA(req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/2fa/verify — Verify 2FA setup
router.post(
  '/2fa/verify',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = verify2FASchema.parse(req.body);
      await authService.verify2FASetup(req.user!.id, code);
      res.json({ success: true, message: '2FA enabled successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/2fa/verify-login — Verify 2FA on login
router.post('/2fa/verify-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken, code } = verify2FALoginSchema.parse(req.body);
    const result = await authService.verify2FALogin(tempToken, code, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone } = req.body;
    await authService.forgotPassword({ email, phone });
    // Always return success to prevent email/phone enumeration
    res.json({ success: true, message: 'If an account exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword({ token, password });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /auth/switch-clinic — Switch active clinic context
router.post('/switch-clinic', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clinicId } = req.body;
    const tokens = await authService.switchClinic(req.user!.id, clinicId);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

export default router;