import { useState, type FormEvent } from 'react';
import { Search, Bell, Menu, CalendarPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { leaveApi } from '../../lib/leave';
import { LEAVE_TYPES } from '../../lib/constants';

interface TopBarProps {
  onMenuToggle: () => void;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return 1;
  return Math.round((b - a) / 86400000) + 1;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { user, organization, clinic, clinics, switchClinic } = useAuth();
  const userName = user?.name ?? 'User';
  const userRoleLabel = user?.roleLabel ?? '';

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [type, setType] = useState<string>(LEAVE_TYPES[0]);
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const canRequest = !!clinic?.id;

  const openLeave = () => {
    setType(LEAVE_TYPES[0]);
    setFromDate(todayISO());
    setToDate(todayISO());
    setReason('');
    setError('');
    setDone(false);
    setLeaveOpen(true);
  };

  const submitLeave = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;
    setSubmitting(true);
    setError('');
    try {
      await leaveApi.request({
        clinicId: clinic.id,
        type,
        fromDate,
        toDate,
        reason: reason.trim() || undefined,
      });
      setDone(true);
      setTimeout(() => setLeaveOpen(false), 1100);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to submit leave');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur-md border-b border-border h-16 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-surface text-text-secondary transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Org / Clinic display */}
      <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
        <h2 className="text-xs sm:text-sm font-bold text-text-primary truncate">
          {organization.name || 'Careme'}
        </h2>

        {/* MASTER: full clinic switcher dropdown */}
        {user?.role === 'MASTER' && clinics.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-text-muted text-xs">/</span>
            <select
              value={clinic?.id ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  switchClinic(null);
                } else {
                  const selected = clinics.find(c => c.id === val);
                  if (selected) switchClinic(selected);
                }
              }}
              className="text-[11px] sm:text-xs font-semibold text-primary-700 bg-primary-50/50 hover:bg-primary-50 border border-primary-200/50 rounded-lg px-2.5 py-1 outline-none transition-all cursor-pointer max-w-[180px] truncate"
            >
              <option value="">All Branches</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Staff: show their own clinic name only — no switching */}
        {user?.role !== 'MASTER' && clinic && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-text-muted text-xs">/</span>
            <span className="text-[11px] sm:text-xs font-semibold text-primary-700 bg-primary-50/50 border border-primary-200/50 rounded-lg px-2.5 py-1 max-w-[180px] truncate">
              {clinic.name}
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center bg-surface rounded-lg border border-border px-3 py-1.5 gap-2 w-56 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-400 transition-all">
        <Search className="w-4 h-4 text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
        />
      </div>

      {/* Request Leave — every role */}
      <button
        onClick={openLeave}
        disabled={!canRequest}
        title={canRequest ? 'Request leave' : 'Select a clinic first'}
        className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <CalendarPlus className="w-4 h-4" />
        Request Leave
      </button>

      {/* Notifications */}
      <button className="relative p-2 rounded-lg hover:bg-surface text-text-secondary transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-surface-card" />
      </button>

      {/* User */}
      <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-border">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
          {userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div className="hidden lg:block">
          <p className="text-sm font-medium text-text-primary leading-tight">{userName}</p>
          <p className="text-xs text-text-muted">{userRoleLabel}</p>
        </div>
      </div>

      {/* Request Leave modal */}
      {leaveOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-12 px-4 pb-12 overflow-y-auto" onClick={() => setLeaveOpen(false)}>
          <div className="w-full max-w-md bg-surface-card border border-border rounded-2xl shadow-xl p-5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text-primary mb-1">Request Leave</h2>
            <p className="text-xs text-text-secondary mb-4">
              {userName} · {clinic?.name}
            </p>
            {done ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="text-sm font-medium text-text-primary">Leave request submitted</p>
                <p className="text-xs text-text-muted">Pending review by HR.</p>
              </div>
            ) : (
              <form onSubmit={submitLeave} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Leave Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
                  >
                    {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary">From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary">To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
                  </div>
                </div>
                <div className="text-xs text-text-secondary">
                  Duration: <span className="font-semibold text-text-primary">{daysBetween(fromDate, toDate)} day{daysBetween(fromDate, toDate) > 1 ? 's' : ''}</span>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">Reason</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
                </div>
                {error && <div className="text-xs text-danger">{error}</div>}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setLeaveOpen(false)} className="text-xs font-semibold text-text-secondary border border-border hover:bg-surface px-3.5 py-2 rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg cursor-pointer disabled:opacity-50">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                    Submit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
