import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { generateAccessToken, getAccessTokenExpiry, getRefreshTokenExpiry, generateRefreshTokenFamily, hashRefreshToken } from './utils/jwt.service.js';
import { hashPassword, verifyPassword, generateInviteToken, generateRefreshToken, hashToken, encrypt2FASecret, decrypt2FASecret } from './utils/password.service.js';
import { RegisterInput, LoginInput, InviteSubMasterInput, InviteStaffInput, AcceptInviteInput, AuthTokens, LoginResponse, RegisterResponse, UserProfile, InviteResponse, Setup2FAResponse } from './types/auth.types.js';

class AuthService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async register(input: RegisterInput): Promise<RegisterResponse> {
    const { email, phone, password, name, orgName, country } = input;

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: email || undefined }, { phone: phone || undefined }].filter(Boolean) as ({ email: string } | { phone: string })[] },
    });
    if (existingUser) throw new Error('User already exists');

    const passwordHash = hashPassword(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: orgName, country, status: 'ACTIVE' } });
      const user = await tx.user.create({
        data: { orgId: org.id, email, phone, passwordHash, name, isOrgOwner: true, status: 'ACTIVE' },
      });
      const refreshToken = generateRefreshToken();
      await this.saveRefreshToken(tx, user.id, refreshToken);
      const tokens = await this.generateTokens(user, null, refreshToken);
      return { tokens, user: this.formatUserProfile(user, [], org.id) };
    });
    return result;
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const { email, phone, password } = input;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: email || undefined }, { phone: phone || undefined }].filter(Boolean) as any[],
        status: 'ACTIVE'
      },
      include: { clinicRoles: { where: { status: 'ACTIVE' }, include: { clinic: { select: { id: true, name: true } } } } },
    });
    if (!user) throw new Error('Invalid credentials');

    const valid = verifyPassword(password, user.passwordHash || '');
    if (!valid) throw new Error('Invalid credentials');

    const primaryRole = user.clinicRoles.find(r => r.isPrimary) || user.clinicRoles[0];
    const activeClinicId = primaryRole?.clinicId || null;

    if (user.twoFactorEnabled) {
      const tempToken = generateAccessToken({
        sub: user.id, orgId: user.orgId, activeClinicId,
        roles: user.clinicRoles.map(r => r.role), isOrgOwner: user.isOrgOwner, is2FAEnabled: true,
      });
      return { tokens: { accessToken: tempToken, refreshToken: '', expiresIn: 300 }, user: this.formatUserProfile(user, user.clinicRoles, user.orgId), requires2FA: true, tempToken };
    }

    // 2FA ENFORCEMENT: isOrgOwner must have 2FA enabled — force setup
    if (user.isOrgOwner) {
      const tempToken = generateAccessToken({
        sub: user.id, orgId: user.orgId, activeClinicId,
        roles: user.clinicRoles.map(r => r.role), isOrgOwner: user.isOrgOwner, is2FAEnabled: false,
      });
      return {
        tokens: { accessToken: tempToken, refreshToken: '', expiresIn: 300 },
        user: this.formatUserProfile(user, user.clinicRoles, user.orgId),
        requires2FA: true,
        tempToken,
        message: '2FA is required for org owners. Please set up two-factor authentication.',
      };
    }

    const refreshToken = generateRefreshToken();
    await this.saveRefreshToken(this.prisma, user.id, refreshToken);
    const tokens = await this.generateTokens(user, activeClinicId, refreshToken);
    return { tokens, user: this.formatUserProfile(user, user.clinicRoles, user.orgId) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('Invalid or expired refresh token');
    }

    // Token reuse detection - invalidate all tokens in family
    await this.prisma.refreshToken.deleteMany({ where: { familyId: storedToken.familyId } });

    // Fetch user with clinic roles
    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
      include: { clinicRoles: { where: { status: 'ACTIVE' }, include: { clinic: { select: { id: true, name: true } } } } },
    });
    if (!user) throw new Error('User not found');

    const primaryRole = user.clinicRoles.find(r => r.isPrimary) || user.clinicRoles[0];
    const activeClinicId = primaryRole?.clinicId || null;

    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);
    await this.prisma.refreshToken.create({ data: { userId: storedToken.userId, tokenHash: newTokenHash, familyId: storedToken.familyId, expiresAt: getRefreshTokenExpiry() } });

    return await this.generateTokens(user, activeClinicId, newRefreshToken);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({ where: { userId, tokenHash } });
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async inviteSubMaster(input: InviteSubMasterInput): Promise<InviteResponse> {
    const { email, phone, name, clinicName, invitedById, orgId } = input;
    const token = generateInviteToken();
    const tokenHash = hashToken(token);

    await this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({ data: { orgId, name: clinicName || `${name}'s Clinic` } });
      await tx.invite.create({ data: { orgId, clinicId: clinic.id, email, phone, tokenHash, role: 'SUB_MASTER', invitedById, status: 'pending', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    });

    console.log(`[TODO] Send invite to ${email || phone}: /accept-invite?token=${token}`);
    return { inviteId: tokenHash, message: `Invitation sent to ${email || phone}` };
  }

  async inviteStaff(input: InviteStaffInput): Promise<InviteResponse> {
    const { email, phone, clinicId, role, invitedById, orgId } = input;
    const token = generateInviteToken();
    const tokenHash = hashToken(token);

    await this.prisma.invite.create({ data: { orgId, clinicId, email, phone, tokenHash, role, invitedById, status: 'pending', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

    console.log(`[TODO] Send invite to ${email || phone}: /accept-invite?token=${token}`);
    return { inviteId: tokenHash, message: `Invitation sent to ${email || phone}` };
  }

  async acceptInvite(input: AcceptInviteInput): Promise<RegisterResponse> {
    const { token, password, name } = input;
    const tokenHash = hashToken(token);
    const invite = await this.prisma.invite.findUnique({ where: { tokenHash }, include: { clinic: true } });
    if (!invite) throw new Error('Invalid invite');
    if (invite.status !== 'pending') throw new Error('Invite has already been used or expired');
    if (invite.expiresAt < new Date()) throw new Error('Invite has expired');

    const passwordHash = hashPassword(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({ where: { OR: [{ email: invite.email || undefined }, { phone: invite.phone || undefined }].filter(Boolean) as any[] } });

      let userId: string;
      if (existingUser) {
        const updated = await tx.user.update({ where: { id: existingUser.id }, data: { name, passwordHash, status: 'ACTIVE' } });
        userId = updated.id;
      } else {
        const created = await tx.user.create({ data: { orgId: invite.orgId, email: invite.email, phone: invite.phone, name, passwordHash, status: 'ACTIVE' } });
        userId = created.id;
      }

      if (invite.clinicId) {
        await tx.userClinicRole.create({ data: { userId, clinicId: invite.clinicId, role: invite.role, status: 'ACTIVE', isPrimary: true } });
      }

      await tx.invite.update({ where: { id: invite.id }, data: { status: 'accepted', acceptedById: userId } });

      const refreshToken = generateRefreshToken();
      const tokens = { accessToken: refreshToken, refreshToken, expiresIn: getAccessTokenExpiry() }; // placeholder

      return { tokens, userId, clinicId: invite.clinicId };
    });

    return { tokens: result.tokens, user: { id: result.userId, email: invite.email, phone: invite.phone, name, orgId: invite.orgId, isOrgOwner: false, roles: [], twoFactorEnabled: false } };
  }

  async setup2FA(userId: string): Promise<Setup2FAResponse> {
    const secret = authenticator.generateSecret();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const otpauthUrl = authenticator.keyuri(user.email || user.phone || 'unknown', 'ClinicOS', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: encrypt2FASecret(secret) } });

    return { secret: otpauthUrl, qrCodeUrl };
  }

  async verify2FASetup(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) throw new Error('2FA not set up');

    const secret = decrypt2FASecret(user.twoFactorSecret);
    if (!authenticator.verify({ token: code, secret })) throw new Error('Invalid 2FA code');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true, twoFactorSecret: encrypt2FASecret(secret) } });
  }

  async verify2FALogin(tempToken: string, code: string, _context: { ipAddress?: string; userAgent?: string }): Promise<LoginResponse> {
    const { verifyAccessToken } = await import('./utils/jwt.service.js');
    const payload = verifyAccessToken(tempToken);

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { clinicRoles: { where: { status: 'ACTIVE' }, include: { clinic: { select: { id: true, name: true } } } } } });
    if (!user || !user.twoFactorSecret) throw new Error('Invalid session');

    const secret = decrypt2FASecret(user.twoFactorSecret);
    if (!authenticator.verify({ token: code, secret })) throw new Error('Invalid 2FA code');

    const primaryRole = user.clinicRoles.find(r => r.isPrimary) || user.clinicRoles[0];
    const activeClinicId = primaryRole?.clinicId || null;

    const refreshToken = generateRefreshToken();
    await this.saveRefreshToken(this.prisma, user.id, refreshToken);
    const tokens = await this.generateTokens(user, activeClinicId, refreshToken);
    return { tokens, user: this.formatUserProfile(user, user.clinicRoles, payload.orgId) };
  }

  async forgotPassword(input: { email?: string; phone?: string }): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: input.email || undefined }, { phone: input.phone || undefined }].filter(Boolean) as any[] } });
    if (!user) return;

    const resetToken = generateInviteToken();
    const tokenHash = hashToken(resetToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: tokenHash, passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000) } });
    console.log(`Password reset token for ${input.email || input.phone}: ${resetToken}`);
  }

  async resetPassword(input: { token: string; password: string }): Promise<void> {
    const tokenHash = hashToken(input.token);
    const user = await this.prisma.user.findFirst({ where: { passwordResetToken: tokenHash, passwordResetExpiry: { gt: new Date() } } });
    if (!user) throw new Error('Invalid or expired reset token');

    const passwordHash = hashPassword(input.password);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  }

  async switchClinic(userId: string, clinicId: string): Promise<{ accessToken: string; activeClinicId: string }> {
    const role = await this.prisma.userClinicRole.findFirst({ where: { userId, clinicId, status: 'ACTIVE' } });
    if (!role) throw new Error('Access denied to this clinic');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const accessToken = generateAccessToken({ sub: userId, orgId: user.orgId, activeClinicId: clinicId, roles: [role.role], isOrgOwner: user.isOrgOwner, is2FAEnabled: user.twoFactorEnabled });
    return { accessToken, activeClinicId: clinicId };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { clinicRoles: { where: { status: 'ACTIVE' }, include: { clinic: { select: { id: true, name: true } } } } } });
    if (!user) throw new Error('User not found');
    return this.formatUserProfile(user, user.clinicRoles, user.orgId);
  }

  private async generateTokens(user: any, activeClinicId: string | null, refreshToken: string): Promise<AuthTokens> {
    const accessToken = generateAccessToken({ sub: user.id, orgId: user.orgId, activeClinicId, roles: user.clinicRoles?.map((r: any) => r.role) || [], isOrgOwner: user.isOrgOwner, is2FAEnabled: user.twoFactorEnabled });
    return { accessToken, refreshToken, expiresIn: getAccessTokenExpiry() };
  }

  private async saveRefreshToken(tx: any, userId: string, refreshToken: string): Promise<void> {
    const familyId = generateRefreshTokenFamily();
    const tokenHash = hashRefreshToken(refreshToken);
    await tx.refreshToken.create({ data: { userId, tokenHash, familyId, expiresAt: getRefreshTokenExpiry() } });
  }

  private formatUserProfile(user: any, clinicRoles: any[], orgId?: string): UserProfile {
    return { id: user.id, email: user.email, phone: user.phone, name: user.name, orgId: orgId || user.orgId, isOrgOwner: user.isOrgOwner, roles: clinicRoles.map((cr: any) => ({ clinicId: cr.clinicId, clinicName: cr.clinic?.name, role: cr.role })), twoFactorEnabled: user.twoFactorEnabled };
  }
}

export const authService = new AuthService();