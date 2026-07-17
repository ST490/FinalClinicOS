import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember } from '../lib/staff';
import {
  roleLabels, WAGE_TYPES, SHIFT_TYPES, EMPLOYMENT_TYPES, DEFAULT_DEPARTMENTS,
  WAGE_TYPE_LABELS, SHIFT_TYPE_LABELS, EMPLOYMENT_TYPE_LABELS,
} from '../lib/constants';
import type { UserRole } from '../types';
import { Shield, Loader2, AlertTriangle, X, Save, Users } from 'lucide-react';
import Badge from '../components/ui/Badge';

const ASSIGNABLE_ROLES: UserRole[] = ['SUB_MASTER', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST', 'HR', 'SUPPORT'];

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

interface EditState {
  member: StaffMember;
  role: UserRole;
  isPrimary: boolean;
  designation: string;
  department: string;
  wageType: string;
  baseRate: string;
  shiftType: string;
  employmentType: string;
  joiningDate: string;
}

export default function RoleAssignmentsPage() {
  const { clinic } = useAuth();
  const clinicId = clinic?.id;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [edit, setEdit] = useState<EditState | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const primaryRoleFor = (m: StaffMember) =>
    m.clinicRoles?.find((r) => r.clinicId === clinicId) || m.clinicRoles?.[0];

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    setError('');
    try {
      const list = await staffApi.list({ clinicId });
      setStaff(list);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const openEdit = (m: StaffMember) => {
    const r = primaryRoleFor(m);
    setEdit({
      member: m,
      role: r?.role ?? 'SUPPORT',
      isPrimary: r?.isPrimary ?? false,
      designation: r?.designation ?? '',
      department: r?.department ?? '',
      wageType: r?.wageType ?? 'MONTHLY',
      baseRate: r?.baseRate != null ? String(r.baseRate) : '',
      shiftType: r?.shiftType ?? 'DAY',
      employmentType: r?.employmentType ?? 'PERMANENT',
      joiningDate: r?.joiningDate ? (r.joiningDate as string).slice(0, 10) : '',
    });
    setSaveError('');
  };

  const save = async () => {
    if (!edit || !clinicId) return;
    setSaving(true);
    setSaveError('');
    try {
      await staffApi.updateRole(edit.member.id, {
        clinicId,
        role: edit.role,
        isPrimary: edit.isPrimary,
        designation: edit.designation.trim() || undefined,
        department: edit.department.trim() || undefined,
        wageType: edit.wageType as any,
        baseRate: edit.baseRate ? Number(edit.baseRate) : undefined,
        shiftType: edit.shiftType as any,
        employmentType: edit.employmentType as any,
        joiningDate: edit.joiningDate || undefined,
      });
      setEdit(null);
      await load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.error?.message || err.message || 'Failed to update role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6 animate-fade-in">
        <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Shield className="w-5.5 h-5.5 text-primary-500" />
          Role Assignments
        </h1>
        <p className="text-xs text-text-secondary mt-1">Assign clinic roles and manage HR attributes (designation, wage, shift, employment).</p>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-border-light">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary-600" /> Staff & Role Assignments
          </h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <span className="text-xs text-text-muted">Loading…</span>
            </div>
          ) : staff.length === 0 ? (
            <div className="py-16 text-center text-sm text-text-muted">No staff assigned to this clinic.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Staff</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Role</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Department</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Designation</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Wage Type</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Base Rate</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Shift</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Employment</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {staff.map((m) => {
                  const r = primaryRoleFor(m);
                  return (
                    <tr key={m.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">
                            {initials(m.name)}
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">{m.name}</div>
                            <div className="text-[10px] text-text-muted">{m.email ?? m.phone ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={ROLE_COLORS[r?.role ?? ''] ?? 'neutral'}>{roleLabels[r?.role ?? ''] ?? r?.role ?? '—'}</Badge>
                          {r?.isPrimary && <span className="text-[10px] text-sky-600 font-semibold">primary</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">{r?.department ?? '—'}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{r?.designation ?? '—'}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{r?.wageType ? WAGE_TYPE_LABELS[r.wageType] ?? r.wageType : '—'}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{r?.baseRate != null ? `₹${Number(r.baseRate).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{r?.shiftType ? SHIFT_TYPE_LABELS[r.shiftType] ?? r.shiftType : '—'}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{r?.employmentType ? EMPLOYMENT_TYPE_LABELS[r.employmentType] ?? r.employmentType : '—'}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => openEdit(m)}
                          className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-0.5 rounded border border-primary-200 hover:bg-primary-50 transition-colors cursor-pointer"
                        >
                          Edit
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
      </div>

      {/* Edit modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-12 px-4 pb-12 overflow-y-auto" onClick={() => setEdit(null)}>
          <div className="bg-surface-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">Edit Role — {edit.member.name}</h3>
              <button onClick={() => setEdit(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Role</label>
                <select
                  value={edit.role}
                  onChange={(e) => setEdit({ ...edit, role: e.target.value as UserRole })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{roleLabels[r] ?? r}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={edit.isPrimary}
                  onChange={(e) => setEdit({ ...edit, isPrimary: e.target.checked })}
                  className="accent-primary-600"
                />
                Primary role for this clinic
              </label>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Designation</label>
                <input
                  type="text"
                  value={edit.designation}
                  onChange={(e) => setEdit({ ...edit, designation: e.target.value })}
                  placeholder="e.g. Senior Nurse"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Department</label>
                <select
                  value={edit.department}
                  onChange={(e) => setEdit({ ...edit, department: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                >
                  <option value="">— None —</option>
                  {DEFAULT_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Wage Type</label>
                  <select
                    value={edit.wageType}
                    onChange={(e) => setEdit({ ...edit, wageType: e.target.value })}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                  >
                    {WAGE_TYPES.map((w) => (
                      <option key={w} value={w}>{WAGE_TYPE_LABELS[w] ?? w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    value={edit.baseRate}
                    onChange={(e) => setEdit({ ...edit, baseRate: e.target.value })}
                    placeholder="0"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Shift</label>
                  <select
                    value={edit.shiftType}
                    onChange={(e) => setEdit({ ...edit, shiftType: e.target.value })}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                  >
                    {SHIFT_TYPES.map((s) => (
                      <option key={s} value={s}>{SHIFT_TYPE_LABELS[s] ?? s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Employment</label>
                  <select
                    value={edit.employmentType}
                    onChange={(e) => setEdit({ ...edit, employmentType: e.target.value })}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                  >
                    {EMPLOYMENT_TYPES.map((e) => (
                      <option key={e} value={e}>{EMPLOYMENT_TYPE_LABELS[e] ?? e}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Joining Date</label>
                <input
                  type="date"
                  value={edit.joiningDate}
                  onChange={(e) => setEdit({ ...edit, joiningDate: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                />
              </div>

              {saveError && (
                <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs flex gap-2 items-start">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setEdit(null)}
                  className="text-sm font-medium text-text-secondary px-3.5 py-2 rounded-lg border border-border hover:bg-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={save}
                  className="flex items-center gap-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
