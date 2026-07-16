import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { UserRound, Mail, Phone, Banknote, CalendarCheck, CalendarOff, ShieldCheck, FileText, Loader2, AlertTriangle } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember } from '../lib/staff';
import { attendanceApi, type AttendanceSummary } from '../lib/attendance';
import { payrollApi, type Payslip } from '../lib/payroll';
import { leaveApi, type LeaveBalance } from '../lib/leave';
import {
  credentialsApi,
  expiryTier,
  daysUntil,
  CREDENTIAL_LABELS,
  type StaffCredential,
} from '../lib/credentials';

const ROLE_LABELS: Record<string, string> = {
  MASTER: 'Organization Owner',
  SUB_MASTER: 'Branch Manager',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  PHARMACIST: 'Pharmacist',
  RECEPTIONIST: 'Receptionist',
  HR: 'HR Manager',
  SUPPORT: 'Support Staff',
};

export default function EmployeeProfilePage() {
  const { clinic } = useAuth();
  const { userId } = useParams();
  const clinicId = clinic?.id;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedId, setSelectedId] = useState(userId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Aggregated sections
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [creds, setCreds] = useState<StaffCredential[]>([]);

  useEffect(() => {
    if (!clinicId) return;
    staffApi.list({ clinicId }).then(setStaff).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const selected = useMemo(
    () => staff.find((m) => m.id === selectedId) ?? null,
    [staff, selectedId],
  );
  const primaryRole = selected?.clinicRoles?.find((r) => r.clinicId === clinicId) ?? selected?.clinicRoles?.[0];

  useEffect(() => {
    if (!clinicId || !selectedId) return;
    setLoading(true);
    setError('');
    Promise.all([
      payrollApi.list({ clinicId, limit: 50 }).catch(() => ({ data: [] as Payslip[] })),
      attendanceApi.summary(clinicId).catch(() => null),
      leaveApi.balances(clinicId).catch(() => [] as LeaveBalance[]),
      credentialsApi.list({ clinicId, userId: selectedId }).catch(() => [] as StaffCredential[]),
    ])
      .then(([p, s, b, c]) => {
        setPayslips(p.data.filter((x) => x.userId === selectedId));
        setSummary(s);
        setBalance(b.find((x) => x.userId === selectedId) ?? null);
        setCreds(c);
      })
      .catch((err: any) => setError(err?.response?.data?.error?.message || err.message || 'Failed to load profile.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, selectedId]);

  const lastPayslip = payslips[0];

  const Card = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <section className="bg-surface-card border border-border rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">{icon}{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <UserRound className="w-5.5 h-5.5 text-primary-500" />
          Employee 360
        </h1>
        <p className="text-xs text-text-secondary mt-1">A read-only aggregate of one staff member's HR record.</p>
      </div>

      <div className="bg-surface-card border border-border rounded-xl p-4">
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Staff Member</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full md:w-96 text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
        >
          <option value="">Select…</option>
          {staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {!selectedId ? (
        <div className="text-center py-16 text-sm text-text-muted">Select a staff member to view their 360 profile.</div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading profile…</span>
        </div>
      ) : (
        <>
          {/* Profile header */}
          <Card icon={<UserRound className="w-4 h-4 text-primary-500" />} title="Profile">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1 text-sm">
                <div className="text-lg font-semibold text-text-primary">{selected?.name}</div>
                {primaryRole && <Badge variant="info">{ROLE_LABELS[primaryRole.role] ?? primaryRole.role}</Badge>}
                {primaryRole?.department && <span className="text-xs text-text-muted"> · {primaryRole.department}</span>}
                <div className="flex flex-col gap-0.5 text-xs text-text-secondary pt-1">
                  {selected?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selected.email}</span>}
                  {selected?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</span>}
                </div>
                {primaryRole?.joiningDate && (
                  <div className="text-xs text-text-muted pt-1">Joined {primaryRole.joiningDate.slice(0, 10)} · {primaryRole.employmentType ?? '—'} · {primaryRole.wageType ?? '—'}</div>
                )}
              </div>
              <Badge variant={selected?.status === 'ACTIVE' ? 'success' : selected?.status === 'DISABLED' ? 'danger' : 'warning'}>
                {selected?.status}
              </Badge>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance */}
            <Card icon={<CalendarCheck className="w-4 h-4 text-primary-500" />} title="Attendance">
              {summary ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Rate" value={`${summary.attendanceRate ?? 0}%`} />
                  <Stat label="Present" value={String(summary.present)} />
                  <Stat label="Absent" value={String(summary.absent)} />
                  <Stat label="Late" value={String(summary.late)} />
                </div>
              ) : <p className="text-sm text-text-muted">No attendance data.</p>}
            </Card>

            {/* Leave */}
            <Card icon={<CalendarOff className="w-4 h-4 text-primary-500" />} title="Leave Balance">
              {balance ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Allotted" value={String(balance.allotted)} />
                  <Stat label="Used" value={String(balance.used)} />
                  <Stat label="Balance" value={String(balance.balance)} />
                </div>
              ) : <p className="text-sm text-text-muted">No leave balance.</p>}
            </Card>

            {/* Last payslip */}
            <Card icon={<Banknote className="w-4 h-4 text-primary-500" />} title="Last Payslip">
              {lastPayslip ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">Period</span><span className="text-text-primary font-medium">{lastPayslip.period}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Basic</span><span>${lastPayslip.basic.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Bonus</span><span>${lastPayslip.bonus.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Deduction</span><span>${lastPayslip.deduction.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">OT</span><span>{lastPayslip.overtimeHours ?? 0}h / ${lastPayslip.overtimePay?.toFixed(2) ?? '0.00'}</span></div>
                  <div className="flex justify-between border-t border-border pt-1"><span className="font-semibold text-text-primary">Net</span><span className="font-semibold text-text-primary">${lastPayslip.net.toFixed(2)}</span></div>
                </div>
              ) : <p className="text-sm text-text-muted">No payslips yet.</p>}
            </Card>

            {/* Credentials */}
            <Card icon={<ShieldCheck className="w-4 h-4 text-primary-500" />} title="Credentials">
              {creds.length === 0 ? (
                <p className="text-sm text-text-muted">No credentials on file.</p>
              ) : (
                <div className="space-y-1">
                  {creds.map((c) => {
                    const t = expiryTier(c.expiresAt);
                    const d = daysUntil(c.expiresAt);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">{CREDENTIAL_LABELS[c.type]}{c.number ? ` · ${c.number}` : ''}</span>
                        <div className="flex items-center gap-2">
                          {d != null && <span className="text-text-muted">{d >= 0 ? `${d}d` : `${-d}d ago`}</span>}
                          <Badge variant={t === 'expired' ? 'danger' : t === 'soon' ? 'warning' : t === 'ok' ? 'success' : 'neutral'}>
                            {t === 'expired' ? 'Expired' : t === 'soon' ? 'Expiring' : t === 'ok' ? 'Valid' : 'No expiry'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Documents — Phase 6, blocked on §21 object storage */}
            <Card icon={<FileText className="w-4 h-4 text-primary-500" />} title="Documents">
              <p className="text-sm text-text-muted">Document storage lands with object storage (Phase 6).</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg px-3 py-2">
      <div className="text-lg font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
