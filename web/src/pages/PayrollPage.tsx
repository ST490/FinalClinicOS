import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { payrollApi, type Payslip } from '../lib/payroll';
import { staffApi, type StaffMember } from '../lib/staff';
import { DEFAULT_DEPARTMENTS } from '../lib/constants';
import { Banknote, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Download } from 'lucide-react';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';
import { exportExcel } from '../lib/excel';

type StatusFilter = 'ALL' | 'DRAFT' | 'APPROVED' | 'PAID';

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function fmtMoney(n: number): string {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, 'neutral' | 'warning' | 'success'> = {
  DRAFT: 'neutral',
  APPROVED: 'warning',
  PAID: 'success',
};

export default function PayrollPage() {
  const { clinic } = useAuth();
  const [period, setPeriod] = useState(currentPeriod());
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [supportStaff, setSupportStaff] = useState<StaffMember[]>([]);

  const load = async () => {
    if (!clinic?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await payrollApi.list({
        clinicId: clinic.id,
        period,
        department: departmentFilter === 'ALL' ? undefined : departmentFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100,
      });
      setPayslips(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinic?.id) {
      staffApi.list({ clinicId: clinic.id })
        .then((s) => setSupportStaff(s.filter((x) => x.clinicRoles?.some((r) => r.role === 'SUPPORT'))))
        .catch(() => {});
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id]);

  useEffect(() => {
    if (clinic?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, departmentFilter, statusFilter]);

  const handleGenerate = async () => {
    if (!clinic?.id) return;
    setGenerating(true);
    setError('');
    try {
      await payrollApi.generate({ clinicId: clinic.id, period });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setError('');
    try {
      await payrollApi.markPaid(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to mark paid');
    }
  };

  const handleExport = () => {
    const rows = payslips.map((p) => ({
      Worker: p.userName ?? '—',
      Department: p.department ?? '',
      'Days Present': p.daysPresent,
      'Half Day': p.daysHalfDay,
      Leave: p.daysLeave,
      Absent: p.daysAbsent,
      Basic: p.basic,
      Bonus: p.bonus,
      Deduction: p.deduction,
      'OT Hours': p.overtimeHours ?? 0,
      'OT Pay': p.overtimePay ?? 0,
      Net: p.net,
      Status: p.status,
    }));
    exportExcel(rows, `Payroll_${period}.xlsx`, 'Payroll');
  };

  const departmentOptions = useMemo(() => {
    const fromData = Array.from(new Set(payslips.map((p) => p.department).filter(Boolean) as string[]));
    return Array.from(new Set([...DEFAULT_DEPARTMENTS, ...fromData]));
  }, [payslips]);

  const summary = useMemo(() => {
    const total = payslips.reduce((s, p) => s + p.net, 0);
    const paid = payslips.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.net, 0);
    const otPay = payslips.reduce((s, p) => s + (p.overtimePay || 0), 0);
    const otHours = payslips.reduce((s, p) => s + (p.overtimeHours || 0), 0);
    return { count: payslips.length, total, paid, otPay, otHours };
  }, [payslips]);

  const columns: Column<Payslip>[] = [
    {
      key: 'userName',
      header: 'Worker',
      render: (p) => <span className="font-medium text-text-primary">{p.userName ?? '—'}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (p) =>
        p.department ? (
          <span className="text-xs bg-slate-500/15 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full border border-slate-500/25">{p.department}</span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (p) => (
        <span className="text-xs text-text-secondary">
          {p.daysPresent}P · {p.daysHalfDay}H · {p.daysLeave}L · {p.daysAbsent}A
        </span>
      ),
    },
    {
      key: 'earnings',
      header: 'Earnings',
      render: (p) => (
        <span className="text-xs text-text-secondary">
          {fmtMoney(p.basic)}
          {p.bonus ? ` +${fmtMoney(p.bonus)}` : ''}
          {p.deduction ? ` −${fmtMoney(p.deduction)}` : ''}
        </span>
      ),
    },
    {
      key: 'overtime',
      header: 'Overtime',
      render: (p) =>
        p.overtimeHours ? (
          <span className="text-xs text-text-secondary">{p.overtimeHours}h · {fmtMoney(p.overtimePay || 0)}</span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
    {
      key: 'net',
      header: 'Net',
      render: (p) => <span className="font-semibold text-text-primary">{fmtMoney(p.net)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <Badge variant={STATUS_COLORS[p.status]}>{p.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) =>
        p.status !== 'PAID' ? (
          <button
            onClick={() => handleMarkPaid(p.id)}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Paid
          </button>
        ) : (
          <span className="text-xs text-text-muted italic">Paid</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Banknote className="w-5.5 h-5.5 text-primary-500" />
            Payroll Management
          </h1>
          <p className="text-xs text-text-secondary mt-1">Monthly payslips for Support staff, computed from attendance.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={payslips.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary border border-border hover:bg-surface px-3.5 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !supportStaff.length}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Generate {period}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {supportStaff.length === 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex gap-2 items-center">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>No Support staff yet. Add them in Staff (with a salary) to generate payroll.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-surface-card border border-border rounded-xl p-4">
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Period</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          />
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
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{summary.count}</span> payslips ·{' '}
          <span className="font-semibold text-text-primary">{fmtMoney(summary.total)}</span> total ·{' '}
          <span className="font-semibold text-emerald-600">{fmtMoney(summary.paid)}</span> paid ·{' '}
          <span className="font-semibold text-text-primary">{summary.otHours}h</span> OT ({fmtMoney(summary.otPay)})
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading payroll…</span>
        </div>
      ) : payslips.length === 0 ? (
        <div className="text-center py-16 text-sm text-text-muted">
          No payslips for {period}. Click “Generate” to build them from this month's attendance.
        </div>
      ) : (
        <DataTable<Payslip> columns={columns} data={payslips} />
      )}
    </div>
  );
}
