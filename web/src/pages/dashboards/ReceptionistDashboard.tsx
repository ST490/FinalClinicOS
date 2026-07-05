import {
  statsByRole, calendarAppointments, waitlistEntries, duesEntries,
} from '../../mockData';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { Plus, CreditCard } from 'lucide-react';

const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const statusColors: Record<string, string> = {
  Arrived: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  Confirmed: 'bg-primary-100 border-primary-300 text-primary-800',
  'In Progress': 'bg-amber-100 border-amber-300 text-amber-800',
  Waiting: 'bg-yellow-100 border-yellow-300 text-yellow-800',
};

export default function ReceptionistDashboard() {
  const stats = statsByRole.RECEPTIONIST;
  const rooms = Object.keys(calendarAppointments);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          Front Desk Dashboard <span className="text-text-muted font-normal text-sm">| Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 stagger-children">
        {stats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      {/* Daily Appointment Calendar View */}
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-sm font-semibold text-text-primary">Daily Appointment Calendar View</h3>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm">
            Book New Appointment
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Room Headers */}
            <div className="grid border-b border-border-light" style={{ gridTemplateColumns: `80px repeat(${rooms.length}, 1fr)` }}>
              <div className="p-3" />
              {rooms.map((room) => (
                <div key={room} className="p-3 text-center">
                  <p className="text-xs font-semibold text-text-primary">{room}</p>
                </div>
              ))}
            </div>

            {/* Time Slots Grid */}
            {timeSlots.map((time) => (
              <div key={time} className="grid border-b border-border-light" style={{ gridTemplateColumns: `80px repeat(${rooms.length}, 1fr)` }}>
                <div className="p-3 text-xs text-text-muted font-medium flex items-start pt-3">
                  {time}
                </div>
                {rooms.map((room) => {
                  const appointments = calendarAppointments[room]?.filter(
                    (a) => a.time === time
                  ) || [];

                  return (
                    <div key={room} className="p-1.5 min-h-[60px]">
                      {appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className={`p-2 rounded-lg border text-xs mb-1 ${statusColors[apt.status] || 'bg-slate-50 border-slate-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{apt.patientName}</span>
                            <span className="text-[10px] opacity-70">{apt.time}</span>
                          </div>
                          {apt.reason && (
                            <p className="text-[10px] opacity-80 mt-0.5">{apt.reason}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant={
                              apt.status === 'Arrived' ? 'success' :
                              apt.status === 'Confirmed' ? 'info' :
                              apt.status === 'In Progress' ? 'warning' : 'neutral'
                            } size="sm">
                              {apt.status}
                            </Badge>
                            {apt.isNewPatient && (
                              <span className="text-[9px] font-medium text-primary-600">▲ New Patient</span>
                            )}
                            {apt.hasOfflinePayment && (
                              <span className="text-[9px] text-text-muted flex items-center gap-0.5">
                                <CreditCard className="w-2.5 h-2.5" /> Offline Payment Due
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Waitlist + Dues Ledger + Quick Walk-in */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Waitlist & Intake Queue */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Waitlist & Intake Queue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Patient</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Arrival Time</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Visit Type</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {waitlistEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-text-primary">{entry.patient}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{entry.arrivalTime}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={
                        entry.status === 'Arrived' ? 'success' :
                        entry.status === 'Confirmed' ? 'info' :
                        entry.status === 'In Progress' ? 'warning' : 'neutral'
                      }>{entry.visitType}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={entry.status === 'Arrived' ? 'success' : 'warning'}>{entry.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <button className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded border border-primary-200 hover:bg-primary-50 transition-colors">
                        {entry.status === 'Arrived' ? 'Check-in' : 'Begin Onboarding'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dues Ledger & Offline Tracker */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Dues Ledger & Offline Tracker</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Patient</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Amount</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Method</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-text-secondary">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {duesEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-text-primary">{entry.patient}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{entry.date}</td>
                    <td className="px-4 py-2.5 text-text-primary font-medium">${entry.amount}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{entry.method}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{entry.status}</td>
                    <td className="px-4 py-2.5 text-text-muted">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Record Payment Form */}
          <div className="px-4 py-3 border-t border-border-light">
            <div className="flex gap-2 items-center">
              <input type="text" placeholder="Patient" className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
              <input type="text" placeholder="Amount" className="w-20 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
              <input type="text" placeholder="Method" className="w-20 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
              <button className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                Record Payment
              </button>
            </div>
          </div>
        </div>

        {/* Quick Walk-in & Onboarding */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Quick Walk-in & Onboarding</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">First Name</label>
                <input type="text" placeholder="First Name" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Last Name</label>
                <input type="text" placeholder="Last Name" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">DOB</label>
                <input type="date" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Contact</label>
                <input type="tel" placeholder="Phone" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Reason for Visit</label>
              <input type="text" placeholder="e.g. General Checkup" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
            </div>
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              Register Walk-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
