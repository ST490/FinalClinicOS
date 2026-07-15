import { statsByRole } from '../../lib/constants';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../lib/useApiQuery';
import { staffApi } from '../../lib/staff';
import { attendanceApi } from '../../lib/attendance';
import { leaveApi } from '../../lib/leave';
import { payrollApi } from '../../lib/payroll';
import { LineChartCard } from '../../components/charts/Charts';

const now = new Date();
const CURRENT_PERIOD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const MONTH_START = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
const THIRTY_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const nextPayDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

function fmtMoney(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function shortDate(d: string): string {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

export default function HRDashboard() {
  const { clinic } = useAuth();
  const clinicId = clinic?.id;

  const { data: staffList } = useApiQuery(
    () => staffApi.list({ clinicId }),
    { skip: !clinicId }
  );
  const { data: summary } = useApiQuery(
    () => attendanceApi.summary(clinicId!, { fromDate: THIRTY_AGO, toDate: new Date().toISOString().slice(0, 10) }),
    { skip: !clinicId }
  );
  const { data: payroll } = useApiQuery(
    () => payrollApi.list({ clinicId, period: CURRENT_PERIOD }),
    { skip: !clinicId }
  );
  const { data: pendingLeaves } = useApiQuery(
    () => leaveApi.list({ clinicId, status: 'PENDING' }),
    { skip: !clinicId }
  );
  const { data: today } = useApiQuery(
    () => attendanceApi.today(clinicId!),
    { skip: !clinicId }
  );
  const { data: invites } = useApiQuery(
    () => staffApi.listInvites({ clinicId }),
    { skip: !clinicId }
  );

  const staff = staffList || [];
  const payrollRows = payroll?.data || [];
  const leaves = pendingLeaves?.data || [];
  const todayRows = today || [];
  const pendingInvites = (invites || []).filter((i: any) => i.status === 'pending');

  const newHires = staff.filter(
    (s: any) => (s.createdAt || '').slice(0, 10) >= MONTH_START
  ).length;
  const onLeaveToday = todayRows.filter((a: any) => a.status === 'LEAVE').length;

  const displayStats = statsByRole.HR.map((s) => {
    if (s.id === 'stat-1') return { ...s, value: String(staff.length) };
    if (s.id === 'stat-2') return { ...s, value: String(newHires), subtitle: 'this month' };
    if (s.id === 'stat-3') return { ...s, value: String(leaves.length), subtitle: 'requests' };
    if (s.id === 'stat-4') return { ...s, value: String(onLeaveToday), subtitle: 'on leave today' };
    return s;
  });

  const trend = (summary?.byDay || []).slice(-14).map((d: any) => ({
    date: shortDate(d.date),
    rate: d.rate,
  }));

  const totalSalaries = payrollRows.reduce((s: number, p: any) => s + Number(p.net || 0), 0);
  const paidCount = payrollRows.filter((p: any) => p.status === 'PAID').length;
  const processPct = payrollRows.length ? Math.round((paidCount / payrollRows.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <h1 className="text-xl font-bold text-text-primary">Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {displayStats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      {/* Middle Row: Attendance Chart + Payroll Overview + Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Staff Attendance (trend) */}
        <div className="lg:col-span-1">
          {trend.length ? (
            <LineChartCard title="Staff Attendance (14-day trend)" data={trend} xKey="date" yKey="rate" suffix="%" color="#0d9488" />
          ) : (
            <div className="bg-surface-card rounded-xl border border-border p-5 h-full flex items-center justify-center text-xs text-text-muted italic">
              No attendance recorded yet
            </div>
          )}
        </div>

        {/* Payroll Overview */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Payroll Overview</h3>
          {payrollRows.length === 0 ? (
            <Badge variant="neutral">No Active Payroll</Badge>
          ) : (
            <div className="mt-1 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border-light">
                <span className="text-sm text-text-secondary">Process Status</span>
                <span className="text-sm font-semibold text-text-primary">{processPct}%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border-light">
                <span className="text-sm text-text-secondary">Next Pay Date</span>
                <span className="text-sm font-semibold text-text-primary">
                  {nextPayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-text-secondary">Total Salaries</span>
                <span className="text-sm font-bold text-text-primary">{fmtMoney(totalSalaries)}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2">
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-700"
                    style={{ width: `${processPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Pending Leave Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary">Employee</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary">Dates</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-xs text-text-muted italic">
                      No pending leave requests
                    </td>
                  </tr>
                ) : (
                  leaves.slice(0, 5).map((lr: any) => (
                    <tr key={lr.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-text-primary">{lr.userName || '—'}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{lr.type}</td>
                      <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{lr.fromDate} → {lr.toDate}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={async () => { await leaveApi.updateStatus(lr.id, 'APPROVED'); (pendingLeaves as any).data = leaves.filter((x: any) => x.id !== lr.id); }}
                            className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-0.5 rounded border border-primary-200 hover:bg-primary-50 transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => { await leaveApi.updateStatus(lr.id, 'REJECTED'); (pendingLeaves as any).data = leaves.filter((x: any) => x.id !== lr.id); }}
                            className="text-[11px] font-medium text-danger hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            Deny
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Currently Away + Active Onboarding + Recent Role Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Currently Away */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Currently Away (On Leave)</h3>
          <div className="space-y-3">
            {onLeaveToday === 0 ? (
              <p className="text-xs text-text-muted italic py-4 text-center">All staff members active</p>
            ) : (
              todayRows.filter((a: any) => a.status === 'LEAVE').map((a: any) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xs font-semibold">
                    {(a.userName || '?').split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <span className="text-sm text-text-primary">{a.userName}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Onboarding */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Active Onboarding</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Name / Contact</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Role</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {pendingInvites.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-xs text-text-muted italic">
                      No pending invites
                    </td>
                  </tr>
                ) : (
                  pendingInvites.slice(0, 5).map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{inv.email || inv.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{inv.role}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{(inv.createdAt || '').slice(0, 10)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Role Assignments */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Current Role Assignments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Employee</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-xs text-text-muted italic">
                      No staff assigned
                    </td>
                  </tr>
                ) : (
                  staff.slice(0, 6).map((s: any) => (
                    <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{s.name}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {s.clinicRoles?.[0]?.role || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
