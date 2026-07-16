import { useState, useMemo } from 'react';
import {
  FileBarChart, ChevronDown, Eye, EyeOff, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/ui/StatCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import { BarChartCard, PieChartCard } from '../components/charts/Charts';
import { TrendAreaChart } from '../components/charts/TrendAreaChart';
import { DonutChart } from '../components/charts/DonutChart';
import { exportExcel } from '../lib/excel';
import {
  useHrReportsData,
  type PeriodKey,
  type EmployeeRow,
} from '../lib/useHrReportsData';

// ─── Period labels ───
const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: '3m', label: 'Last 3 months' },
  { key: '7m', label: 'Last 7 months' },
  { key: '12m', label: 'Last 12 months' },
];

const DEPARTMENTS = ['Clinical', 'Nursing', 'Admin', 'Pharmacy', 'Lab', 'Support'];

// ─── Format payroll values for chart tooltip ───
function fmtPayroll(value: number): string {
  if (value >= 1_000_000) return `₹${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
}

function fmtINR(n: number): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}

// ─── Month stepper state helper ───
function useMonthStepper() {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { label, prev: () => setOffset((o) => o - 1), next: () => setOffset((o) => o + 1) };
}

// ─── Small summary tile for payroll totals ───
function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-surface rounded-lg border border-border px-3 py-2">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="text-sm font-semibold text-text-primary mt-0.5">{value}</div>
    </div>
  );
}

export default function HrReportsPage() {
  const { clinic } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>('7m');
  const [demoMode, setDemoMode] = useState(false);
  const data = useHrReportsData({ period, demoMode, clinicId: clinic?.id });

  // Format payroll data for the bar chart (add formatted labels)
  const payrollChartData = useMemo(
    () => data.payrollByDept.map((d) => ({ ...d, label: fmtPayroll(d.payroll) })),
    [data.payrollByDept],
  );

  // Department options available in current data (fallback to known depts)
  const deptOptions = useMemo(() => {
    const set = new Set(data.employees.map((e) => e.department));
    return DEPARTMENTS.filter((d) => set.has(d) || set.size === 0);
  }, [data.employees]);

  // ─── Attendance report state ───
  const [attFrom, setAttFrom] = useState('');
  const [attTo, setAttTo] = useState('');
  const [attDept, setAttDept] = useState('');
  const attendanceRows = useMemo(() => {
    // ponytail: date filter is UI-only; mock has no per-day attendance records
    return data.employees.filter((e) => !attDept || e.department === attDept);
  }, [data.employees, attDept]);

  const attendanceColumns: Column<EmployeeRow>[] = [
    { key: 'name', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'jobTitle', header: 'Role' },
    { key: 'present', header: 'Days Present', render: (e) => String(e.present) },
    { key: 'absent', header: 'Days Absent', render: (e) => String(e.absent) },
    { key: 'late', header: 'Late', render: (e) => String(e.late) },
    { key: 'leave', header: 'On Leave', render: (e) => String(e.leave) },
  ];

  // ─── Payroll report state ───
  const payrollNav = useMonthStepper();
  const [payDept, setPayDept] = useState('');
  const payrollRows = useMemo(
    () => data.employees.filter((e) => !payDept || e.department === payDept),
    [data.employees, payDept],
  );
  const payrollTotals = useMemo(() => {
    const gross = payrollRows.reduce((s, e) => s + e.base + e.bonus, 0);
    const net = payrollRows.reduce((s, e) => s + e.net, 0);
    return { gross, net };
  }, [payrollRows]);

  const payrollColumns: Column<EmployeeRow>[] = [
    { key: 'name', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'jobTitle', header: 'Role' },
    { key: 'base', header: 'Base (₹)', render: (e) => fmtINR(e.base) },
    { key: 'bonus', header: 'Bonus (₹)', render: (e) => fmtINR(e.bonus) },
    { key: 'deductions', header: 'Deductions (₹)', render: (e) => fmtINR(e.deductions) },
    { key: 'net', header: 'Net Pay (₹)', render: (e) => fmtINR(e.net) },
  ];

  // ─── Labour cost report state ───
  const labourNav = useMonthStepper();
  const [labDept, setLabDept] = useState('');
  const [groupBy, setGroupBy] = useState<'department' | 'office' | 'status'>('department');
  const labourGrouped = useMemo(() => {
    const filtered = data.employees.filter((e) => !labDept || e.department === labDept);
    const map: Record<string, { group: string; headcount: number; salary: number; benefits: number; total: number }> = {};
    for (const e of filtered) {
      const key = String(e[groupBy]);
      if (!map[key]) map[key] = { group: key, headcount: 0, salary: 0, benefits: 0, total: 0 };
      map[key].headcount += 1;
      map[key].salary += e.salary;
      map[key].benefits += e.benefits;
      map[key].total += e.total;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data.employees, labDept, groupBy]);

  const labourColumns: Column<{ group: string; headcount: number; salary: number; benefits: number; total: number }>[] = [
    { key: 'group', header: 'Group' },
    { key: 'headcount', header: 'Headcount', render: (r) => String(r.headcount) },
    { key: 'salary', header: 'Salary Cost (₹)', render: (r) => fmtINR(r.salary) },
    { key: 'benefits', header: 'Benefits (₹)', render: (r) => fmtINR(r.benefits) },
    { key: 'total', header: 'Total Labour Cost (₹)', render: (r) => fmtINR(r.total) },
  ];

  const groupLabel = groupBy.charAt(0).toUpperCase() + groupBy.slice(1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <FileBarChart className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">HR Reports</h1>
            <p className="text-xs text-text-muted">Workforce analytics &amp; insights</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Demo Showcase Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
              border transition-all duration-200 cursor-pointer
              ${demoMode
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-surface-card border-border text-text-secondary hover:border-primary-400'
              }
            `}
          >
            {demoMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{demoMode ? 'Demo Data' : 'Live Data'}</span>
            {/* Pill toggle */}
            <span
              className={`
                relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200
                ${demoMode ? 'bg-primary-500' : 'bg-text-muted/30'}
              `}
            >
              <span
                className={`
                  inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm
                  transform transition-transform duration-200 mt-[3px]
                  ${demoMode ? 'translate-x-[18px]' : 'translate-x-[3px]'}
                `}
              />
            </span>
          </button>

          {/* Period selector */}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="appearance-none bg-surface-card border border-border rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-text-primary cursor-pointer hover:border-primary-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400/40"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── Report Content (live = all zeros, demo = sample data) ─── */}
      {data && (
        <>
          {/* ─── Stat Cards ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
            {data.stats.map((stat, i) => (
              <StatCard key={stat.id} data={stat} index={i} />
            ))}
          </div>

          {/* ─── Charts Row 1: Trend + Donut ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendAreaChart
              title="Headcount Trend"
              data={data.headcountTrend}
              xKey="month"
              seriesA="headcount"
              seriesB="attrition"
              labelA="Headcount"
              labelB="Attrition"
            />
            <DonutChart
              title="Employees by Department"
              data={data.departmentBreakdown}
              nameKey="name"
              valueKey="count"
            />
          </div>

          {/* ─── Charts Row 2: Payroll Bar + Employment Pie ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BarChartCard
              title="Payroll per Department"
              data={payrollChartData}
              xKey="department"
              yKey="payroll"
              height={240}
              suffix=""
            />
            <PieChartCard
              title="Employment Status"
              data={data.employmentStatus}
              nameKey="name"
              valueKey="count"
              height={200}
            />
          </div>

          {/* ─── Reports (live = zeroed rows, demo = sample data) ─── */}
          <div className="space-y-6">
            {/* Attendance Report */}
            <section className="bg-surface-card border border-border rounded-xl p-5 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Attendance Report</h3>
                  <p className="text-xs text-text-muted mt-0.5">Per-worker attendance · last 35 days</p>
                </div>
                <button
                  onClick={() => exportExcel(attendanceRows.map((e) => ({
                    Employee: e.name, Department: e.department, Role: e.jobTitle,
                    DaysPresent: e.present, DaysAbsent: e.absent, Late: e.late, OnLeave: e.leave,
                  })), 'attendance-report.xlsx', 'Attendance')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={attFrom} onChange={(e) => setAttFrom(e.target.value)}
                  className="bg-surface-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400/40" />
                <input type="date" value={attTo} onChange={(e) => setAttTo(e.target.value)}
                  className="bg-surface-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400/40" />
                <select value={attDept} onChange={(e) => setAttDept(e.target.value)}
                  className="bg-surface-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400/40">
                  <option value="">All Departments</option>
                  {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <DataTable title="Per-Worker Attendance" columns={attendanceColumns} data={attendanceRows} />
            </section>

            {/* Payroll Report */}
            <section className="bg-surface-card border border-border rounded-xl p-5 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Payroll Report</h3>
                  <p className="text-xs text-text-muted mt-0.5">Per-worker payroll · {payrollNav.label}</p>
                </div>
                <button
                  onClick={() => exportExcel(payrollRows.map((e) => ({
                    Employee: e.name, Department: e.department, Role: e.jobTitle,
                    Base: e.base, Bonus: e.bonus, Deductions: e.deductions, NetPay: e.net,
                  })), 'payroll-report.xlsx', 'Payroll')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={payrollNav.prev} className="p-1.5 border border-border rounded-lg text-text-muted hover:bg-surface">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-text-primary w-20 text-center font-medium">{payrollNav.label}</span>
                  <button onClick={payrollNav.next} className="p-1.5 border border-border rounded-lg text-text-muted hover:bg-surface">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select value={payDept} onChange={(e) => setPayDept(e.target.value)}
                  className="bg-surface-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400/40">
                  <option value="">All Departments</option>
                  {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <SummaryTile label="Total Gross" value={fmtINR(payrollTotals.gross)} />
                <SummaryTile label="Total Net Payout" value={fmtINR(payrollTotals.net)} />
                <SummaryTile label="Total OT Hours" value="0" />
              </div>
              <DataTable title="Per-Worker Payroll" columns={payrollColumns} data={payrollRows} />
            </section>

            {/* Labour Cost Report */}
            <section className="bg-surface-card border border-border rounded-xl p-5 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Labour Cost Report</h3>
                  <p className="text-xs text-text-muted mt-0.5">Grouped by {groupLabel.toLowerCase()} · {labourNav.label}</p>
                </div>
                <button
                  onClick={() => exportExcel(labourGrouped.map((r) => ({
                    Group: r.group, Headcount: r.headcount, SalaryCost: r.salary, Benefits: r.benefits, TotalLabourCost: r.total,
                  })), 'labour-cost-report.xlsx', 'LabourCost')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={labourNav.prev} className="p-1.5 border border-border rounded-lg text-text-muted hover:bg-surface">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-text-primary w-20 text-center font-medium">{labourNav.label}</span>
                  <button onClick={labourNav.next} className="p-1.5 border border-border rounded-lg text-text-muted hover:bg-surface">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select value={labDept} onChange={(e) => setLabDept(e.target.value)}
                  className="bg-surface-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400/40">
                  <option value="">All Departments</option>
                  {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'department' | 'office' | 'status')}
                  className="bg-surface-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400/40">
                  <option value="department">Group by Department</option>
                  <option value="office">Group by Office</option>
                  <option value="status">Group by Status</option>
                </select>
              </div>
              <BarChartCard
                title={`Labour Cost by ${groupLabel}`}
                data={labourGrouped}
                xKey="group"
                yKey="total"
                height={240}
                suffix="₹"
              />
              <DataTable title={`Labour Cost by ${groupLabel}`} columns={labourColumns} data={labourGrouped} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
