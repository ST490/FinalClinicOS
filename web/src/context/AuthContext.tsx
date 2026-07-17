import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserRole } from '../types';
import { authApi } from '../lib/auth';

// ─── Types ─────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  isOrgOwner?: boolean;
}

export interface AuthClinic {
  id: string;
  name: string;
  orgId?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
  currency?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  landingPageSlug?: string | null;
  status?: string | null;
}

export interface AuthOrganization {
  id: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  clinic: AuthClinic | null;
  clinics: AuthClinic[];
  organization: AuthOrganization;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Real API login */
  login: (email: string, password: string) => Promise<any>;
  register: (input: { email: string; phone?: string; password: string; name: string; orgName: string; country: string }) => Promise<void>;
  acceptInvite: (input: { token: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
  switchClinic: (clinic: AuthClinic | null) => void;
  switchRole: (role: UserRole) => void;
  refreshClinics: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Role label mapping ────────────────────────────────────
const ROLE_LABELS: Record<UserRole, string> = {
  MASTER: 'CEO',
  SUB_MASTER: 'Branch Manager',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  PHARMACIST: 'Pharmacist',
  RECEPTIONIST: 'Front Desk',
  HR: 'HR Manager',
  SUPPORT: 'Support Staff',
};

// ─── Provider ──────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clinic, setClinic] = useState<AuthClinic | null>(null);
  const [clinics, setClinics] = useState<AuthClinic[]>([]);
  const [organization, setOrganization] = useState<AuthOrganization>({ id: '', name: '' });
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on mount ──
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const me = await authApi.me();
          const primaryRole: UserRole = me.isOrgOwner
            ? 'MASTER'
            : (me.roles[0]?.role ?? 'RECEPTIONIST');
          setUser({
            id: me.id,
            name: me.name,
            email: me.email ?? '',
            role: primaryRole,
            roleLabel: ROLE_LABELS[primaryRole] || primaryRole,
            isOrgOwner: me.isOrgOwner,
          });
          
          // Use orgName from /auth/me directly (available for all roles)
          if ((me as any).orgName) {
            setOrganization({ id: me.orgId, name: (me as any).orgName });
          } else {
            try {
              const orgData = await authApi.getOrg(me.orgId);
              setOrganization({ id: orgData.id, name: orgData.name });
            } catch {
              setOrganization({ id: me.orgId, name: 'Careme' });
            }
          }

          // Load clinics from API
          try {
            const apiClinics = await authApi.getClinics();
            const mapped: AuthClinic[] = apiClinics.map((c) => ({
              id: c.id,
              name: c.name,
              orgId: c.orgId,
              address: c.address,
              city: c.city,
              state: c.state,
              country: c.country,
              postalCode: c.postalCode,
              phone: c.phone,
              email: c.email,
              timezone: c.timezone,
              currency: c.currency,
              logoUrl: c.logoUrl,
              bannerUrl: c.bannerUrl,
              accentColor: c.accentColor,
              landingPageSlug: c.landingPageSlug,
              status: c.status,
            }));
            setClinics(mapped);
            setClinic(primaryRole === 'MASTER' ? null : (mapped[0] ?? null));
          } catch {
            // If clinics endpoint fails, at least the user is authenticated
          }
          setIsLoading(false);
          return;
        } catch {
          // Token expired / invalid — clean up
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }

      setIsLoading(false);
    };

    restore();
  }, []);

  // ── Real API login ──
  const login = useCallback(async (email: string, password: string): Promise<any> => {
    const result = await authApi.login(email, password);
    if (result.isInviteLogin) {
      return result;
    }
    // Login-time 2FA gate: backend returns empty tokens + requires2FA.
    // Don't proceed with a broken (empty) refresh token — surface it so the
    // caller can route to 2FA verification with result.tempToken.
    if (result.requires2FA) {
      return result;
    }
    const { accessToken, refreshToken } = result.tokens;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    const primaryRole: UserRole = result.user.isOrgOwner ? 'MASTER' : (result.user.roles[0]?.role ?? 'RECEPTIONIST');
    const u: AuthUser = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email ?? email,
      role: primaryRole,
      roleLabel: ROLE_LABELS[primaryRole] || 'Staff',
      isOrgOwner: result.user.isOrgOwner,
    };
    setUser(u);

    // Use orgName from login response directly (all roles get this)
    if ((result.user as any).orgName) {
      setOrganization({ id: result.user.orgId, name: (result.user as any).orgName });
    } else {
      try {
        const orgData = await authApi.getOrg(result.user.orgId);
        setOrganization({ id: orgData.id, name: orgData.name });
      } catch {
        setOrganization({ id: result.user.orgId, name: 'Careme' });
      }
    }

    // Load clinics
    try {
      const apiClinics = await authApi.getClinics();
      const mapped: AuthClinic[] = apiClinics.map((c) => ({
        id: c.id,
        name: c.name,
        orgId: c.orgId,
      }));
      setClinics(mapped);
      setClinic(primaryRole === 'MASTER' ? null : (mapped[0] ?? null));
    } catch {
      // Non-fatal — user has no clinics yet (post-signup case)
    }
  }, []);

  // ── Real API register ──
  const register = useCallback(async (input: { email: string; phone?: string; password: string; name: string; orgName: string; country: string }) => {
    const result = await authApi.register(input);
    localStorage.setItem('accessToken', result.tokens.accessToken);
    localStorage.setItem('refreshToken', result.tokens.refreshToken);

    const role: UserRole = 'MASTER'; // signup ≡ master
    const u: AuthUser = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email ?? input.email,
      role,
      roleLabel: ROLE_LABELS[role],
      isOrgOwner: true,
    };
    setUser(u);

    try {
      const orgData = await authApi.getOrg(result.user.orgId);
      setOrganization({ id: orgData.id, name: orgData.name });
    } catch {
      setOrganization({ id: result.user.orgId, name: 'Careme' });
    }

    // Empty clinic list — signup flow proceeds into /onboarding.
    try {
      const apiClinics = await authApi.getClinics();
      const mapped: AuthClinic[] = apiClinics.map((c) => ({
        id: c.id,
        name: c.name,
        orgId: c.orgId,
      }));
      setClinics(mapped);
      setClinic(null);
    } catch {
      setClinics([]);
      setClinic(null);
    }
  }, []);

  // ── Logout ──
  const logout = useCallback(() => {
    authApi.logout(localStorage.getItem('refreshToken') ?? undefined).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setClinic(null);
    setClinics([]);
  }, []);

  // ── Switch clinic ──
  const switchClinic = useCallback(async (c: AuthClinic | null) => {
    setClinic(c);
    try {
      const tokens = await authApi.switchClinic(c ? c.id : null);
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Re-fetch user details to update roles/context for the switched clinic context
      const me = await authApi.me();
      const primaryRole: UserRole = me.isOrgOwner
        ? 'MASTER'
        : (c ? (me.roles.find((r: any) => r.clinicId === c.id)?.role ?? me.roles[0]?.role ?? 'RECEPTIONIST') : 'RECEPTIONIST');
      
      setUser({
        id: me.id,
        name: me.name,
        email: me.email ?? '',
        role: primaryRole,
        roleLabel: ROLE_LABELS[primaryRole] || primaryRole,
        isOrgOwner: me.isOrgOwner,
      });
    } catch (e) {
      console.error('Failed to switch clinic context on server:', e);
    }
  }, []);

  // ── Switch role ──
  const switchRole = useCallback((role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role, roleLabel: ROLE_LABELS[role] || role };
    setUser(updated);
  }, [user]);

  const refreshClinics = useCallback(async () => {
    try {
      const apiClinics = await authApi.getClinics();
      const mapped: AuthClinic[] = apiClinics.map((c) => ({
        id: c.id,
        name: c.name,
        orgId: c.orgId,
      }));
      setClinics(mapped);
      if (mapped.length > 0 && !clinic) {
        setClinic(mapped[0]);
      }
    } catch (e) {
      console.error('Failed to refresh clinics:', e);
    }
  }, [clinic]);

  const acceptInvite = useCallback(async (input: { token: string; password: string; name: string }) => {
    const result = await authApi.acceptInvite(input);
    const { accessToken, refreshToken } = result.tokens;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    const primaryRole: UserRole = result.user.isOrgOwner ? 'MASTER' : (result.user.roles[0]?.role ?? 'RECEPTIONIST');
    const u: AuthUser = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email ?? '',
      role: primaryRole,
      roleLabel: ROLE_LABELS[primaryRole] || 'Staff',
      isOrgOwner: result.user.isOrgOwner,
    };
    setUser(u);

    // Use orgName from acceptInvite response
    if ((result.user as any).orgName) {
      setOrganization({ id: result.user.orgId, name: (result.user as any).orgName });
    } else {
      try {
        const orgData = await authApi.getOrg(result.user.orgId);
        setOrganization({ id: orgData.id, name: orgData.name });
      } catch {
        setOrganization({ id: result.user.orgId, name: 'Careme' });
      }
    }

    try {
      const apiClinics = await authApi.getClinics();
      const mapped: AuthClinic[] = apiClinics.map((c) => ({
        id: c.id,
        name: c.name,
        orgId: c.orgId,
      }));
      setClinics(mapped);
      setClinic(primaryRole === 'MASTER' ? null : (mapped[0] ?? null));
    } catch {
      // Non-fatal
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      clinic,
      clinics,
      organization: organization.name ? organization : { id: '', name: 'Careme' },
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      acceptInvite,
      logout,
      switchClinic,
      switchRole,
      refreshClinics,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}