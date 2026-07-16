import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember, type StaffInvite } from '../lib/staff';
import { roleLabels, DEFAULT_DEPARTMENTS } from '../lib/constants';
import type { UserRole } from '../types';
import {
  UserPlus, Mail, Phone, Loader2, AlertTriangle, X, Send, UserMinus, Users,
} from 'lucide-react';
import Badge from '../components/ui/Badge';

const INVITE_ROLES: UserRole[] = ['SUB_MASTER', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST', 'HR', 'SUPPORT'];

const ROLE_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  MASTER: 'danger',
  SUB_MASTER: 'warning',
  DOCTOR: 'info',
  NURSE: 'success',
  PHARMACIST: 'neutral',
  RECEPTIONIST: 'neutral',
  HR: 'neutral',
  SUPPORT: 'neutral',
};

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export default function OnboardingPage() {
  const { clinic } = useAuth();
  const clinicId = clinic?.id;
  const orgId = clinic?.orgId;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>('SUPPORT');
  const [inviteError, setInviteError] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);

  const primaryRoleFor = (m: StaffMember) =>
    m.clinicRoles?.find((r) => r.clinicId === clinicId) || m.clinicRoles?.[0];

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    setError('');
    try {
      const [s, i] = await Promise.all([
        staffApi.list({ clinicId }),
        staffApi.listInvites({ clinicId }),
      ]);
      setStaff(s);
      setInvites(i);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load onboarding data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const pendingInvites = useMemo(() => invites.filter((i) => i.status === 'pending'), [invites]);
  const activeStaff = useMemo(() => staff.filter((m) => m.status !== 'DISABLED'), [staff]);
  const offboarded = useMemo(() => staff.filter((m) => m.status === 'DISABLED'), [staff]);

  const submitInvite = async () => {
    setInviteError('');
    if (!clinicId || !orgId) return;

    // SUPPORT staff are added directly (no invite/login) and carry a department.
    if (role === 'SUPPORT') {
      if (!name.trim()) {
        setInviteError('Enter the staff member’s name.');
        return;
      }
      setInviteBusy(true);
      try {
        await staffApi.directAdd({
          clinicId,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          department: department.trim() || undefined,
        });
        setShowModal(false);
        setEmail(''); setPhone(''); setName(''); setDepartment(''); setRole('SUPPORT');
        await load();
      } catch (err: any) {
        setInviteError(err?.response?.data?.error?.message || err.message || 'Failed to add staff.');
      } finally {
        setInviteBusy(false);
      }
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setInviteError('Provide an email or phone number.');
      return;
    }
    setInviteBusy(true);
    try {
      await staffApi.invite({ orgId, clinicId, email: email.trim() || undefined, phone: phone.trim() || undefined, role });
      setShowModal(false);
      setEmail(''); setPhone(''); setName(''); setDepartment(''); setRole('SUPPORT');
      await load();
    } catch (err: any) {
      setInviteError(err?.response?.data?.error?.message || err.message || 'Failed to send invite.');
    } finally {
      setInviteBusy(false);
    }
  };

  const cancelInvite = async (id: string) => {
    setBusyId(id);
    try {
      await staffApi.cancelInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to cancel invite.');
    } finally {
      setBusyId(null);
    }
  };

  const deactivate = async (m: StaffMember) => {
    if (!clinicId) return;
    setBusyId(m.id);
    try {
      await staffApi.deactivate(m.id, clinicId);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to deactivate staff.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <UserPlus className="w-5.5 h-5.5 text-primary-500" />
            Recruiting & Onboarding
          </h1>
          <p className="text-xs text-text-secondary mt-1">Invite new staff, track pending offers, and manage offboarding.</p>
        </div>
        <button
          onClick={() => { setInviteError(''); setEmail(''); setPhone(''); setName(''); setDepartment(''); setRole('SUPPORT'); setShowModal(true); }}
          className="flex items-center gap-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" /> Send Invite
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pending Invites</p>
          <p className="text-2xl font-black text-text-primary mt-1">{pendingInvites.length}</p>
        </div>
        <div className="bg-surface-card rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Active Staff</p>
          <p className="text-2xl font-black text-text-primary mt-1">{activeStaff.length}</p>
        </div>
        <div className="bg-surface-card rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Offboarded</p>
          <p className="text-2xl font-black text-text-primary mt-1">{offboarded.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Invites */}
          <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-4 border-b border-border-light">
              <h3 className="text-sm font-semibold text-text-primary">Pending Invites</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="px-4 py-2 text-left font-semibold text-text-secondary">Contact</th>
                    <th className="px-4 py-2 text-left font-semibold text-text-secondary">Role</th>
                    <th className="px-4 py-2 text-left font-semibold text-text-secondary">Sent</th>
                    <th className="px-4 py-2 text-left font-semibold text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {pendingInvites.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs text-text-muted italic">No pending invites</td>
                    </tr>
                  ) : (
                    pendingInvites.map((inv) => (
                      <tr key={inv.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-text-primary">{inv.email || inv.phone || '—'}</td>
                        <td className="px-4 py-2.5"><Badge variant={ROLE_COLORS[inv.role] ?? 'neutral'}>{roleLabels[inv.role] ?? inv.role}</Badge></td>
                        <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">{(inv.createdAt || '').slice(0, 10)}</td>
                        <td className="px-4 py-2.5">
                          <button
                            disabled={busyId === inv.id}
                            onClick={() => cancelInvite(inv.id)}
                            className="text-[11px] font-medium text-danger hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {busyId === inv.id ? '…' : 'Cancel'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Offboarding */}
          <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-4 border-b border-border-light">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <UserMinus className="w-4 h-4 text-danger" /> Offboarding
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="px-4 py-2 text-left font-semibold text-text-secondary">Staff</th>
                    <th className="px-4 py-2 text-left font-semibold text-text-secondary">Role</th>
                    <th className="px-4 py-2 text-left font-semibold text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {offboarded.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-xs text-text-muted italic">No offboarded staff</td>
                    </tr>
                  ) : (
                    offboarded.map((m) => {
                      const r = primaryRoleFor(m);
                      return (
                        <tr key={m.id} className="hover:bg-surface/50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-[10px] font-semibold">
                                {initials(m.name)}
                              </div>
                              <span className="font-medium text-text-primary">{m.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5"><Badge variant={ROLE_COLORS[r?.role ?? ''] ?? 'neutral'}>{roleLabels[r?.role ?? ''] ?? r?.role ?? '—'}</Badge></td>
                          <td className="px-4 py-2.5"><Badge variant="danger">{m.status}</Badge></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Active staff — deactivate to offboard */}
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-border-light">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary-600" /> Active Staff
          </h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-text-muted">Loading…</div>
          ) : activeStaff.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted italic">No active staff</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Staff</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Role</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Contact</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {activeStaff.map((m) => {
                  const r = primaryRoleFor(m);
                  return (
                    <tr key={m.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">
                            {initials(m.name)}
                          </div>
                          <span className="font-medium text-text-primary">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><Badge variant={ROLE_COLORS[r?.role ?? ''] ?? 'neutral'}>{roleLabels[r?.role ?? ''] ?? r?.role ?? '—'}</Badge></td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        <div className="flex flex-col gap-0.5">
                          {m.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</span>}
                          {m.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          disabled={busyId === m.id || m.isOrgOwner}
                          onClick={() => deactivate(m)}
                          title={m.isOrgOwner ? 'Org owner cannot be offboarded' : 'Offboard staff'}
                          className="text-[11px] font-medium text-danger hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {busyId === m.id ? '…' : 'Offboard'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">{role === 'SUPPORT' ? 'Add Support Staff' : 'Send Staff Invite'}</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {role === 'SUPPORT' && (
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Email {role === 'SUPPORT' && <span className="text-text-muted normal-case">(optional)</span>}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@clinic.com"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Phone {role === 'SUPPORT' && <span className="text-text-muted normal-case">(optional)</span>}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91…"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                />
              </div>

              {role === 'SUPPORT' && (
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                  >
                    <option value="">— None —</option>
                    {DEFAULT_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                >
                  {INVITE_ROLES.map((r) => (
                    <option key={r} value={r}>{roleLabels[r] ?? r}</option>
                  ))}
                </select>
              </div>

              {inviteError && (
                <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs flex gap-2 items-start">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{inviteError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-sm font-medium text-text-secondary px-3.5 py-2 rounded-lg border border-border hover:bg-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={inviteBusy}
                  onClick={submitInvite}
                  className="flex items-center gap-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {inviteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {role === 'SUPPORT' ? 'Add Staff' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
