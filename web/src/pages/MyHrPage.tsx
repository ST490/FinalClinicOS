import { useState, useEffect, useMemo } from 'react';
import { UserRound, Banknote, CalendarCheck, CalendarOff, CalendarDays, ShieldCheck, Loader2, AlertTriangle, Send } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { payrollApi, type Payslip } from '../lib/payroll';
import { attendanceApi, type AttendanceRecord } from '../lib/attendance';
import { leaveApi, type LeaveBalance, type LeaveRequest } from '../lib/leave';
import { LEAVE_TYPES } from '../lib/constants';
import { staffApi, type StaffSchedule } from '../lib/staff';
import {
  credentialsApi,
  expiryTier,
  daysUntil,
  CREDENTIAL_LABELS,
  type StaffCredential,
} from '../lib/credentials';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MyHrPage() {
  const { user, clinic } = useAuth();
  const clinicId = clinic?.id;
  const userId = user?.id;

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [balances, setBalances] = useState<LeaveBalance | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [creds, setCreds] = useState<StaffCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Leave request form
  const [showLeave, setShowLeave] = useState(false);
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveMsg, setLeaveMsg] = useState('');

  const load = async () => {
    if (!clinicId || !userId) return;
    setLoading(true);
    setError('');
    try {
      const [p, a, b, l, s, c] = await Promise.all([
        payrollApi.list({ clinicId, limit: 50 }).catch(() => ({ data: [] as Payslip[] })),
        attendanceApi.search({ clinicId, userId, limit: 20 }).catch(() => ({ data: [] as AttendanceRecord[] })),
        leaveApi.balances(clinicId).catch(() => [] as LeaveBalance[]),
        leaveApi.list({ clinicId, userId, limit: 20 }).catch(() => ({ data: [] as LeaveRequest[] })),
        staffApi.schedules(clinicId).catch(() => [] as StaffSchedule[]),
        credentialsApi.list({ clinicId, userId }).catch(() => [] as StaffCredential[]),
      ]);
      setPayslips(p.data.filter((x) => x.userId === userId));
      setAttendance(a.data);
      setBalances(b.find((x) => x.userId === userId) ?? null);
      setLeaves(l.data);
      setSchedules(s.filter((x) => x.userId === userId && x.isActive));
      setCreds(c);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load your HR data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, userId]);

  const myLeaveDays = useMemo(() => {
    if (!balances) return null;
    return { allotted: balances.allotted, used: balances.used, balance: balances.balance };
  }, [balances]);

  const submitLeave = async () => {
    if (!clinicId) return;
    if (!fromDate || !toDate) {
      setLeaveMsg('Select from and to dates.');
      return;
    }
    setLeaveMsg('');
    try {
      await leaveApi.request({ clinicId, type: leaveType, fromDate, toDate, reason: reason || undefined });
      setShowLeave(false);
      setFromDate(''); setToDate(''); setReason('');
      await load();
    } catch (err: any) {
      setLeaveMsg(err?.response?.data?.error?.message || err.message || 'Failed to submit leave request.');
    }
  };

  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <section className="bg-surface-card border border-border rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <UserRound className="w-5.5 h-5.5 text-primary-500" />
          My HR
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Your payslips, attendance, leave and credentials — scoped to {user?.name || 'you'}.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading your HR data…</span>
        </div>
      ) : !clinicId ? (
        <div className="text-center py-16 text-sm text-text-muted">Select a clinic to view your HR information.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payslips */}
          <Section icon={<Banknote className="w-4 h-4 text-primary-500" />} title="My Payslips">
            {payslips.length === 0 ? (
              <p className="text-sm text-text-muted">No payslips yet.</p>
            ) : (
              <div className="space-y-2">
                {payslips.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2">
                    <div>
                      <div className="font-medium text-text-primary">{p.period}</div>
                      <div className="text-xs text-text-muted">
                        {p.daysPresent}d present · OT {p.overtimeHours ?? 0}h
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-text-primary">${p.net.toFixed(2)}</div>
                      <Badge variant={p.status === 'PAID' ? 'success' : p.status === 'APPROVED' ? 'info' : 'neutral'}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Leave balance + request */}
          <Section icon={<CalendarOff className="w-4 h-4 text-primary-500" />} title="My Leave">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-text-muted">Balance</div>
                <div className="text-2xl font-bold text-text-primary">
                  {myLeaveDays ? myLeaveDays.balance : '—'}
                  <span className="text-sm font-normal text-text-muted"> / {myLeaveDays?.allotted ?? '—'} allotted</span>
                </div>
                <div className="text-xs text-text-muted">{myLeaveDays ? `${myLeaveDays.used} used` : ''}</div>
              </div>
              <button
                onClick={() => setShowLeave((s) => !s)}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Request Leave
              </button>
            </div>

            {showLeave && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                    className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                    className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
                </div>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10">
                  {LEAVE_TYPES.map((t: string) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
                <div className="flex gap-2">
                  <button onClick={submitLeave}
                    className="px-3 py-2 text-xs font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors">Submit</button>
                  <button onClick={() => setShowLeave(false)}
                    className="px-3 py-2 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors">Cancel</button>
                </div>
                {leaveMsg && <p className="text-xs text-danger">{leaveMsg}</p>}
              </div>
            )}

            {leaves.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border">
                {leaves.slice(0, 5).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{l.type} · {l.fromDate}→{l.toDate} ({l.days}d)</span>
                    <Badge variant={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'}>{l.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Attendance */}
          <Section icon={<CalendarCheck className="w-4 h-4 text-primary-500" />} title="My Recent Attendance">
            {attendance.length === 0 ? (
              <p className="text-sm text-text-muted">No attendance records yet.</p>
            ) : (
              <div className="space-y-1">
                {attendance.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{a.date}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">{a.checkIn?.slice(11, 16) ?? '—'} – {a.checkOut?.slice(11, 16) ?? '—'}</span>
                      <Badge variant={
                        a.status === 'PRESENT' ? 'success' : a.status === 'LATE' ? 'warning' : a.status === 'LEAVE' ? 'info' : 'danger'
                      }>{a.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Schedule */}
          <Section icon={<CalendarDays className="w-4 h-4 text-primary-500" />} title="My Schedule">
            {schedules.length === 0 ? (
              <p className="text-sm text-text-muted">No scheduled shifts assigned.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {schedules.map((s) => (
                  <div key={s.id} className="border border-border rounded-lg px-3 py-2 text-center">
                    <div className="text-xs font-semibold text-text-primary">{DAYS[s.dayOfWeek]}</div>
                    <div className="text-xs text-text-muted">{s.startTime}–{s.endTime}</div>
                    {s.shiftType && <Badge variant="neutral">{s.shiftType}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Credentials */}
          <Section icon={<ShieldCheck className="w-4 h-4 text-primary-500" />} title="My Credentials">
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
          </Section>
        </div>
      )}
    </div>
  );
}
