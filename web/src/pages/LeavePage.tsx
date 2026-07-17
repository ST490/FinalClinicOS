import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember } from '../lib/staff';
import { leaveApi, type LeaveRequest, type LeaveBalance, type LeaveStatus } from '../lib/leave';
import { LEAVE_TYPES } from '../lib/constants';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';
import ModalPortal from '../components/ModalPortal';
import {
  CalendarOff, Search, Loader2, Plus, AlertTriangle, Check, X,
} from 'lucide-react';

type StatusFilter = 'ALL' | LeaveStatus;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function statusVariant(status: LeaveStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'PENDING': return 'warning';
    case 'REJECTED': return 'danger';
    default: return 'neutral';
  }
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return 1;
  return Math.round((b - a) / 86400000) + 1;
}

export default function LeavePage() {
  const { clinic } = useAuth();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const activeStaff = useMemo(
    () => staff.filter((s) => s.status === 'ACTIVE'),
    [staff],
  );

  const load = async () => {
    if (!clinic?.id) return;
    setLoading(true);
    setError('');
    try {
      const [list, bal, st] = await Promise.all([
        leaveApi.list({ clinicId: clinic.id, limit: 100 }),
        leaveApi.balances(clinic.id),
        staffApi.list({ clinicId: clinic.id }),
      ]);
      setRequests(list.data);
      setBalances(bal);
      setStaff(st);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinic?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => (statusFilter === 'ALL' ? true : r.status === statusFilter))
      .filter((r) => (!q ? true : (r.userName ?? '').toLowerCase().includes(q)))
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
  }, [requests, statusFilter, search]);

  const decide = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    setError('');
    try {
      await leaveApi.updateStatus(id, status);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to update leave');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<LeaveRequest>[] = [
    { key: 'id', header: 'Request', render: (r) => <span className="font-mono text-xs text-text-secondary">{r.id.slice(0, 8)}</span> },
    { key: 'userName', header: 'Worker', render: (r) => <span className="font-medium text-text-primary">{r.userName ?? '—'}</span> },
    {
      key: 'department', header: 'Department', render: (r) =>
        r.department ? (
          <span className="text-xs bg-slate-500/15 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full border border-slate-500/25">{r.department}</span>
        ) : <span className="text-xs text-text-muted">—</span>,
    },
    { key: 'type', header: 'Type', render: (r) => <span className="text-text-primary">{r.type}</span> },
    { key: 'fromDate', header: 'From', render: (r) => <span className="text-xs text-text-secondary">{r.fromDate}</span> },
    { key: 'toDate', header: 'To', render: (r) => <span className="text-xs text-text-secondary">{r.toDate}</span> },
    { key: 'days', header: 'Days', render: (r) => <span className="text-text-primary">{r.days}</span> },
    { key: 'appliedOn', header: 'Applied', render: (r) => <span className="text-xs text-text-secondary">{r.appliedOn.slice(0, 10)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    {
      key: 'actions', header: 'Action', render: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex gap-2">
            <button
              onClick={() => !actionLoading && decide(r.id, 'APPROVED')}
              disabled={actionLoading}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-300 rounded px-2 py-1 hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => !actionLoading && decide(r.id, 'REJECTED')}
              disabled={actionLoading}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-300 rounded px-2 py-1 hover:bg-red-50 cursor-pointer disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        ) : <span className="text-xs text-text-muted italic">Reviewed</span>,
    },
  ];

  const balanceColumns: Column<LeaveBalance>[] = [
    { key: 'name', header: 'Worker', render: (b) => <span className="font-medium text-text-primary">{b.name}</span> },
    {
      key: 'department', header: 'Department', render: (b) =>
        b.department ? (
          <span className="text-xs bg-slate-500/15 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full border border-slate-500/25">{b.department}</span>
        ) : <span className="text-xs text-text-muted">—</span>,
    },
    { key: 'allotted', header: 'Allotted', render: (b) => <span className="text-text-primary">{b.allotted}</span> },
    { key: 'used', header: 'Used', render: (b) => <span className="text-text-primary">{b.used}</span> },
    {
      key: 'balance', header: 'Balance', render: (b) =>
        <span className={`font-medium ${b.balance < 5 ? 'text-red-600' : 'text-text-primary'}`}>{b.balance}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <CalendarOff className="w-5.5 h-5.5 text-primary-500" />
            Leave Requests
          </h1>
          <p className="text-xs text-text-secondary mt-1">Apply, review and track staff leave. Balances reset annually.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Apply Leave
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 bg-surface-card border border-border rounded-xl p-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search worker"
            className="text-sm border border-border rounded-lg pl-8 pr-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10 w-44"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading leave requests…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-text-muted">No leave requests found.</div>
      ) : (
        <DataTable<LeaveRequest> columns={columns} data={filtered} />
      )}

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Leave Balance Overview</h3>
        {balances.length === 0 ? (
          <div className="text-center py-10 text-sm text-text-muted bg-surface-card border border-border rounded-xl">No staff in this clinic.</div>
        ) : (
          <div className="bg-surface-card border border-border rounded-xl overflow-x-auto" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <DataTable<LeaveBalance> columns={balanceColumns} data={balances} />
          </div>
        )}
      </div>

      {showForm && (
        <ApplyLeaveModal
          staff={activeStaff}
          onClose={() => setShowForm(false)}
          onSaved={async () => { setShowForm(false); await load(); }}
        />
      )}
    </div>
  );
}

function ApplyLeaveModal({
  staff, onClose, onSaved,
}: {
  staff: StaffMember[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { clinic } = useAuth();
  const [userId, setUserId] = useState(staff[0]?.id ?? '');
  const [type, setType] = useState<string>(LEAVE_TYPES[0]);
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const days = daysBetween(fromDate, toDate);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinic?.id || !userId) return;
    setSubmitting(true);
    setError('');
    try {
      await leaveApi.create({
        clinicId: clinic.id,
        userId,
        type,
        fromDate,
        toDate,
        days,
        reason: reason.trim() || undefined,
      });
      await onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to apply leave');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-card border border-border rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-text-primary mb-4">Apply Leave</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-secondary">Worker</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10">
              {staff.length === 0 && <option value="">No active staff</option>}
              {staff.map((s) => {
                const dept = s.clinicRoles?.find((r) => r.clinicId === clinic?.id)?.department;
                return <option key={s.id} value={s.id}>{s.name}{dept ? ` (${dept})` : ''}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary">Leave Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10">
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
          <div className="text-xs text-text-secondary">Duration: <span className="font-semibold text-text-primary">{days} day{days > 1 ? 's' : ''}</span></div>
          <div>
            <label className="text-xs font-medium text-text-secondary">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
          </div>
          {error && <div className="text-xs text-danger">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-xs font-semibold text-text-secondary border border-border hover:bg-surface px-3.5 py-2 rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting || !userId} className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg cursor-pointer disabled:opacity-50">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
