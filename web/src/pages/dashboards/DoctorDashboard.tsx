import { useState } from 'react';
import { statsByRole } from '../../lib/constants';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { Calendar, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../lib/useApiQuery';
import { appointmentApi } from '../../lib/appointments';

export default function DoctorDashboard() {
  const { clinic, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Today's date range
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch today's appointments for THIS doctor only
  const { data: appointmentsData } = useApiQuery(
    () =>
      appointmentApi.list({
        clinicId: clinic?.id,
        doctorId: user?.id,
        fromDate: todayStart.toISOString(),
        toDate: todayEnd.toISOString(),
        limit: 100,
      }),
    { skip: !clinic?.id || !user?.id },
  );

  const displayStats = statsByRole.DOCTOR.map((s) => {
    if (s.id === 'stat-1') {
      const todayCount = (appointmentsData?.data || []).length;
      return { ...s, value: `Today: ${todayCount}` };
    }
    if (s.id === 'stat-2') {
      // Waitlist count
      const waitingCount = (appointmentsData?.data || []).filter(a => a.status === 'BOOKED').length;
      return { ...s, value: String(waitingCount) };
    }
    if (s.id === 'stat-3') {
      // Completed notes
      const completedCount = (appointmentsData?.data || []).filter(a => a.status === 'COMPLETED').length;
      return { ...s, value: `Complete: ${completedCount}` };
    }
    if (s.id === 'stat-4') {
      // Active/Prescriptions
      return { ...s, value: '0' };
    }
    return s;
  });

  const displayAppointments = (appointmentsData?.data || []).map((apt) => {
    const timeStr = new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      id: apt.id,
      time: timeStr,
      patientName: apt.patient?.name || 'Unknown Patient',
      reason: apt.notes || 'Consultation',
      status: apt.status === 'BOOKED' ? 'WAITING' : apt.status,
      waitTime: '0 min',
      category: apt.category,
    };
  });

  const filteredAppointments = displayAppointments.filter(apt =>
    apt.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-text-primary">
          Doctor Dashboard – {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h1>
        <Calendar className="w-5 h-5 text-text-muted" />
      </div>

      {/* Compact Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        {displayStats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* Today's Appointment Queue */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Today's Appointment Queue</h3>
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-border rounded-lg pl-7 pr-2.5 py-1.5 bg-surface-card text-text-primary outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Waiting Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-text-muted italic">
                      No appointments in queue for today
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.slice(0, 6).map((apt) => {
                    const statusMap: Record<string, { variant: 'success' | 'warning' | 'info' | 'neutral'; label: string }> = {
                      CHECKED_IN: { variant: 'success', label: 'Checked In' },
                      WAITING: { variant: 'warning', label: 'Waitlist' },
                      IN_PROGRESS: { variant: 'info', label: 'In Progress' },
                      BOOKED: { variant: 'neutral', label: 'Scheduled' },
                      CONFIRMED: { variant: 'info', label: 'Confirmed' },
                    };
                    const s = statusMap[apt.status] || { variant: 'neutral' as const, label: apt.status };

                    return (
                      <tr key={apt.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium whitespace-nowrap">{apt.time}</td>
                        <td className="px-4 py-3 text-text-primary font-medium">{apt.patientName}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {apt.reason}
                          {apt.category === 'FIRST_TIME' && (
                            <span className="ml-1 text-[10px] font-semibold text-primary-700">• New</span>
                          )}
                          {apt.category === 'FREE_CHECKUP' && (
                            <span className="ml-1 text-[10px] font-semibold text-emerald-700">• Free</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{apt.waitTime || '–'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <button className="text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors text-left cursor-pointer">
                              [View History]
                            </button>
                            <button className="text-[11px] font-medium text-success hover:underline transition-colors text-left cursor-pointer">
                              [Start Visit]
                            </button>
                            <button className="text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors text-left cursor-pointer">
                              [Prescribe]
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar — Write Prescription + Follow-up */}
        <div className="space-y-4">
          {/* Write New Prescription */}
          <div className="bg-surface-card rounded-xl border border-border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Write New Prescription</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Patient</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search patient..."
                    className="w-full text-sm border border-border rounded-lg pl-8 pr-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Medicine</label>
                <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-lg bg-surface-card min-h-[38px]">
                  <span className="text-xs text-text-muted italic">No medicine selected</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">Dosage</label>
                  <input type="text" defaultValue="1" className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">Frequency</label>
                  <select className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all">
                    <option>Day</option>
                    <option>Twice Daily</option>
                    <option>Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">Duration</label>
                  <input type="text" defaultValue="1 m" className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                </div>
              </div>
              <button className="w-full text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors cursor-pointer">
                Add to Queue
              </button>
              <button className="w-full text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors text-center cursor-pointer">
                + Add Custom Medication
              </button>
            </div>
          </div>

          {/* Add Follow-up Reminder */}
          <div className="bg-surface-card rounded-xl border border-border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Add Follow-up Reminder</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">Patient name</label>
                  <input type="text" placeholder="Patient name" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">Date</label>
                  <input type="date" defaultValue="2026-07-09" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Task note</label>
                <input type="text" placeholder="e.g., Follow up blood results" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
              </div>
              <button className="w-full text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 py-2.5 rounded-lg transition-colors cursor-pointer">
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
