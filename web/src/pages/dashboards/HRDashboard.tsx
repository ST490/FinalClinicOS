import { statsByRole, weeklyAttendance, leaveRequests, onboardingEntries, roleAssignments } from '../../mockData';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';

export default function HRDashboard() {
  const stats = statsByRole.HR;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-text-primary">Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      {/* Middle Row: Attendance Chart + Payroll Overview + Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Staff Attendance (Weekly) */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Staff Attendance (Weekly)</h3>
          <div className="h-44 flex items-end gap-2 relative">
            {/* Y axis labels */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-text-muted w-6">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            {/* Chart area */}
            <div className="flex-1 ml-7 flex items-end relative h-full">
              {/* Grid lines */}
              <div className="absolute inset-0 bottom-6 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-b border-border-light" />
                ))}
              </div>
              {/* Line chart approximation with connected dots */}
              <svg className="absolute inset-0 bottom-6" viewBox="0 0 500 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                  d={`M 50 ${140 - (95 / 100) * 140} L 150 ${140 - (92 / 100) * 140} L 250 ${140 - (97 / 100) * 140} L 350 ${140 - (92 / 100) * 140} L 450 ${140 - (93 / 100) * 140} L 450 140 L 50 140 Z`}
                  fill="url(#attendanceGradient)"
                />
                {/* Line */}
                <polyline
                  points={weeklyAttendance.map((d, i) =>
                    `${50 + i * 100} ${140 - (d.percentage / 100) * 140}`
                  ).join(' ')}
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dots */}
                {weeklyAttendance.map((d, i) => (
                  <circle
                    key={i}
                    cx={50 + i * 100}
                    cy={140 - (d.percentage / 100) * 140}
                    r="4"
                    fill="white"
                    stroke="#0d9488"
                    strokeWidth="2"
                  />
                ))}
              </svg>
              {/* X axis labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                {weeklyAttendance.map((d) => (
                  <span key={d.day} className="text-[10px] text-text-muted">{d.day.slice(0, 3)}</span>
                ))}
              </div>
              {/* Percentage labels */}
              <div className="absolute top-0 left-0 right-0 bottom-6 flex justify-between px-2">
                {weeklyAttendance.map((d, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium text-text-secondary"
                    style={{ position: 'absolute', left: `${(i / 4) * 100}%`, bottom: `${(d.percentage / 100) * 100 + 5}%`, transform: 'translateX(-50%)' }}
                  >
                    {d.percentage}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Overview */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Payroll Overview (May 2024)</h3>
          <Badge variant="info">In Progress</Badge>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border-light">
              <span className="text-sm text-text-secondary">Process Status</span>
              <span className="text-sm font-semibold text-text-primary">85%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-light">
              <span className="text-sm text-text-secondary">Next Pay Date</span>
              <span className="text-sm font-semibold text-text-primary">June 1, 2024</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-text-secondary">Total Salaries</span>
              <span className="text-sm font-bold text-text-primary">$145,000</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-700" style={{ width: '85%' }} />
            </div>
          </div>
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
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary">Reason</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {leaveRequests.map((lr) => (
                  <tr key={lr.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-text-primary">{lr.employee}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{lr.type}</td>
                    <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{lr.dateRange}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{lr.reason}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-0.5 rounded border border-primary-200 hover:bg-primary-50 transition-colors">
                          Approve
                        </button>
                        <button className="text-[11px] font-medium text-danger hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 transition-colors">
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Currently Away + Active Onboarding + Recent Role Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Currently Away */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Currently Away</h3>
          <div className="space-y-3">
            {['Sarah Jenkins', 'Rashan Chargeson', 'Rardan Bankson', 'Sarah Jenkins'].map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xs font-semibold">
                  {name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-sm text-text-primary">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Onboarding / Offboarding */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Active Onboarding / Offboarding</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Type</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Progress</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {onboardingEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-text-primary">{entry.name}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{entry.type}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${entry.progress === 100 ? 'bg-primary-500' : 'bg-info'}`}
                            style={{ width: `${entry.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <button className="text-[11px] font-medium text-primary-600 hover:text-primary-700 transition-colors">
                        Complete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Role Assignments */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Recent Role Assignments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Employee</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">New Role</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {roleAssignments.map((ra) => (
                  <tr key={ra.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-text-primary">{ra.employee}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{ra.newRole}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{ra.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
