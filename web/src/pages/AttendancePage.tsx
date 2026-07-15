import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember } from '../lib/staff';
import { attendanceApi, type AttendanceRecord } from '../lib/attendance';
import { DEFAULT_DEPARTMENTS } from '../lib/constants';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';
import {
  CalendarCheck, Search, Loader2, UserPlus, LogOut, Download, AlertTriangle,
} from 'lucide-react';
import { exportExcel } from '../lib/excel';

type StatusFilter = 'ALL' | 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'LEAVE';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'PRESENT': return 'success';
    case 'LATE': return 'warning';
    case 'HALF_DAY': return 'info';
    case 'LEAVE': return 'neutral';
    default: return 'danger';
  }
}

export default function AttendancePage() {
  const { clinic } = useAuth();
  const [view, setView] = useState<'today' | 'history'>('today');

  // Today view state
  const [today, setToday] = useState<AttendanceRecord[]>([]);
  const [supportStaff, setSupportStaff] = useState<StaffMember[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters (used by both views)
  const [date, setDate] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // History view state
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());

  const loadToday = async () => {
    if (!clinic?.id) return;
    setLoading(true);
    setError('');
    try {
      const [att, staff] = await Promise.all([
        attendanceApi.today(clinic.id),
        staffApi.list({ clinicId: clinic.id }),
      ]);
      setToday(att);
      setSupportStaff(staff.filter((s) => s.clinicRoles?.some((r) => r.role === 'SUPPORT')));
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinic?.id) loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id]);

  const markedUserIds = useMemo(() => new Set(today.map((r) => r.userId)), [today]);
  const pendingWorkers = supportStaff.filter((s) => !markedUserIds.has(s.id));
  const missingPunchOut = today.filter((r) => (r.status === 'PRESENT' || r.status === 'LATE') && !r.checkOut);

  const departmentOptions = useMemo(() => {
    const fromData = Array.from(new Set(today.map((r) => r.department).filter(Boolean) as string[]));
    return Array.from(new Set([...DEFAULT_DEPARTMENTS, ...fromData]));
  }, [today]);

  const handleMarkPresent = async () => {
    if (!clinic?.id || !selectedWorker) return;
    setActionLoading(true);
    setError('');
    try {
      await attendanceApi.clockIn({ clinicId: clinic.id, userId: selectedWorker, date, status: 'PRESENT' });
      setSelectedWorker('');
      await loadToday();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to mark present');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async (id: string) => {
    setActionLoading(true);
    setError('');
    try {
      await attendanceApi.clockOut(id);
      await loadToday();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to punch out');
    } finally {
      setActionLoading(false);
    }
  };

  const runSearch = async () => {
    if (!clinic?.id) return;
    setHistoryLoading(true);
    setError('');
    try {
      const res = await attendanceApi.search({
        clinicId: clinic.id,
        fromDate,
        toDate,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        department: departmentFilter === 'ALL' ? undefined : departmentFilter,
        limit: 100,
      });
      setHistory(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to search attendance');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'history') runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const exportXlsx = async () => {
    if (!clinic?.id) return;
    try {
      const res = await attendanceApi.search({
        clinicId: clinic.id,
        fromDate,
        toDate,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        department: departmentFilter === 'ALL' ? undefined : departmentFilter,
        limit: 1000,
      });
      const rows = res.data.map((r) => ({
        Name: r.userName ?? '',
        Department: r.department ?? '',
        Date: r.date?.slice(0, 10) ?? '',
        Status: r.status,
        'Check In': fmtTime(r.checkIn),
        'Check Out': fmtTime(r.checkOut),
        Notes: r.notes ?? '',
      }));
      exportExcel(rows, `attendance_${fromDate}_${toDate}.xlsx`, 'Attendance');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to export');
    }
  };

  const todayColumns: Column<AttendanceRecord>[] = [
    {
      key: 'userName',
      header: 'Worker',
      render: (r) => <span className="font-medium text-text-primary">{r.userName ?? '—'}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (r) =>
        r.department ? (
          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200">
            {r.department}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
    },
    { key: 'checkIn', header: 'Check In', render: (r) => <span className="text-xs text-text-secondary">{fmtTime(r.checkIn)}</span> },
    { key: 'checkOut', header: 'Check Out', render: (r) => <span className="text-xs text-text-secondary">{fmtTime(r.checkOut)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        !r.checkOut ? (
          <button
            onClick={() => !actionLoading && handlePunchOut(r.id)}
            disabled={actionLoading}
            className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Punch Out
          </button>
        ) : (
          <span className="text-xs text-text-muted italic">Done</span>
        ),
    },
  ];

  const historyColumns: Column<AttendanceRecord>[] = [
    { key: 'userName', header: 'Worker', render: (r) => <span className="font-medium text-text-primary">{r.userName ?? '—'}</span> },
    {
      key: 'department',
      header: 'Department',
      render: (r) =>
        r.department ? (
          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200">{r.department}</span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-text-secondary">{r.date?.slice(0, 10)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'checkIn', header: 'Check In', render: (r) => <span className="text-xs text-text-secondary">{fmtTime(r.checkIn)}</span> },
    { key: 'checkOut', header: 'Check Out', render: (r) => <span className="text-xs text-text-secondary">{fmtTime(r.checkOut)}</span> },
  ];

  const filteredToday = statusFilter === 'ALL' ? today : today.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <CalendarCheck className="w-5.5 h-5.5 text-primary-500" />
            Attendance & Scheduling
          </h1>
          <p className="text-xs text-text-secondary mt-1">Track non-clinical (Support) staff attendance. Clinical staff use their own shifts.</p>
        </div>
        <div className="flex gap-1 bg-surface-card border border-border rounded-lg p-1">
          {(['today', 'history'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                view === v ? 'bg-primary-600 text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {v === 'today' ? 'Today' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-surface-card border border-border rounded-xl p-4">
        {view === 'today' ? (
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
            </div>
          </>
        )}
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
            <option value="LEAVE">Leave</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Department</label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        {view === 'history' && (
          <button
            onClick={runSearch}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        )}
        {view === 'history' && (
          <button
            onClick={exportXlsx}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary border border-border hover:bg-surface px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}
      </div>

      {view === 'today' ? (
        <>
          {/* Mark present */}
          <div className="bg-surface-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Mark a Support worker present
              </label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select worker…</option>
                {pendingWorkers.map((s) => {
                  const dept = s.clinicRoles?.find((r) => r.clinicId === clinic?.id)?.department;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name}{dept ? ` (${dept})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              onClick={handleMarkPresent}
              disabled={!selectedWorker || actionLoading}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Mark Present
            </button>
          </div>

          {/* Missing punch-outs */}
          {missingPunchOut.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex gap-2 items-center">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{missingPunchOut.length} worker(s) present but not punched out yet.</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <span className="text-xs text-text-muted">Loading attendance…</span>
            </div>
          ) : (
            <DataTable<AttendanceRecord> columns={todayColumns} data={filteredToday} />
          )}
        </>
      ) : (
        <div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <span className="text-xs text-text-muted">Searching…</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-sm text-text-muted">No attendance records found for this range.</div>
          ) : (
            <DataTable<AttendanceRecord> columns={historyColumns} data={history} />
          )}
        </div>
      )}
    </div>
  );
}
