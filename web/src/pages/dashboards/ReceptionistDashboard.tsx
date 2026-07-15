import { statsByRole } from '../../lib/constants';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../lib/useApiQuery';
import { appointmentApi } from '../../lib/appointments';
import { billingApi } from '../../lib/billing';

const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const statusColors: Record<string, string> = {
  Arrived: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  Confirmed: 'bg-primary-100 border-primary-300 text-primary-800',
  'In Progress': 'bg-amber-100 border-amber-300 text-amber-800',
  Waiting: 'bg-yellow-100 border-yellow-300 text-yellow-800',
};

export default function ReceptionistDashboard() {
  const { clinic } = useAuth();

  // Today's date range
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch today's appointments (clinic-wide)
  const { data: appointmentsData } = useApiQuery(
    () =>
      appointmentApi.list({
        clinicId: clinic?.id,
        fromDate: todayStart.toISOString(),
        toDate: todayEnd.toISOString(),
        limit: 100,
      }),
    { skip: !clinic?.id },
  );

  // Fetch dues
  const { data: duesData } = useApiQuery(
    () => billingApi.list({ clinicId: clinic?.id, limit: 10 }),
    { skip: !clinic?.id }
  );

  const displayAppointments = (appointmentsData?.data || []).reduce<Record<string, any[]>>((acc, apt) => {
    const columnName = apt.doctor?.name || 'General Consultation';
    if (!acc[columnName]) {
      acc[columnName] = [];
    }
    const start = apt.slotStart ? new Date(apt.slotStart) : null;
    let timeStr = '';
    if (start) {
      timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      if (timeStr.startsWith('0')) {
        timeStr = timeStr.slice(1);
      }
    }

    acc[columnName].push({
      id: apt.id,
      patientName: apt.patient?.name || 'Patient',
      time: timeStr,
      reason: apt.notes || 'Consultation',
      category: apt.category,
      status: apt.status === 'BOOKED' ? 'Confirmed' : apt.status === 'IN_PROGRESS' ? 'In Progress' : apt.status,
    });
    return acc;
  }, {});

  const rooms = Array.from(new Set([
    ...((appointmentsData?.data || []).map(a => a.doctor?.name || 'General Consultation')),
    'General Consultation'
  ]));

  const displayDues = (duesData?.data || []).map(due => ({
    id: due.id,
    patient: due.patientName || 'Patient',
    date: due.createdAt?.split('T')[0] || '',
    amount: parseFloat(due.amountDue) || 0,
    method: due.paymentMethod || 'CASH',
    status: due.status,
  }));

  const waitingCount = (appointmentsData?.data || []).filter(a => a.status === 'BOOKED').length;
  const checkedInCount = (appointmentsData?.data || []).filter(a => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS').length;
  const expectedCount = (appointmentsData?.data || []).length;

  const displayStats = statsByRole.RECEPTIONIST.map((s) => {
    if (s.id === 'stat-1') {
      return { ...s, title: `Patients Waiting: ${waitingCount}`, value: 'Avg Wait: 0 min' };
    }
    if (s.id === 'stat-2') {
      return { ...s, value: String(checkedInCount) };
    }
    if (s.id === 'stat-3') {
      return { ...s, value: String(expectedCount) };
    }
    if (s.id === 'stat-4') {
      return { ...s, value: '$0' };
    }
    return s;
  });

  const displayWaitlist = (appointmentsData?.data || [])
    .filter(a => a.status === 'BOOKED')
    .map(a => ({
      id: a.id,
      patient: a.patient?.name || 'Patient',
      arrivalTime: new Date(a.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      visitType: a.type || 'SCHEDULED',
      category: a.category,
      status: 'Waiting',
    }));

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
        {displayStats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      {/* Daily Appointment Calendar View */}
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-sm font-semibold text-text-primary">Daily Appointment Calendar View</h3>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer">
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
                  const appointments = (displayAppointments[room] || []).filter(
                    (a) => a.time === time
                  );

                  return (
                    <div key={room} className="p-1.5 min-h-[60px]">
                      {appointments.length === 0 ? (
                        <div className="h-full border border-dashed border-border-light rounded-lg flex items-center justify-center p-2 text-[10px] text-text-muted">
                          Empty Slot
                        </div>
                      ) : (
                        appointments.map((apt) => (
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
                            {apt.category === 'FIRST_TIME' && (
                              <p className="text-[9px] font-semibold opacity-90 mt-0.5">• New patient</p>
                            )}
                            {apt.category === 'FREE_CHECKUP' && (
                              <p className="text-[9px] font-semibold opacity-90 mt-0.5">• Free checkup</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant={
                                apt.status === 'Arrived' ? 'success' :
                                  apt.status === 'Confirmed' ? 'info' :
                                    apt.status === 'In Progress' ? 'warning' : 'neutral'
                              } size="sm">
                                {apt.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
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
                {displayWaitlist.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-text-muted italic">
                      No patients in the waitlist today
                    </td>
                  </tr>
                ) : (
                  displayWaitlist.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{entry.patient}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{entry.arrivalTime}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="neutral">{entry.visitType}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="warning">{entry.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <button className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded border border-primary-200 hover:bg-primary-50 transition-colors cursor-pointer">
                          Check-in
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {displayDues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-text-muted italic">
                      No invoices recorded
                    </td>
                  </tr>
                ) : (
                  displayDues.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{entry.patient}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{entry.date}</td>
                      <td className="px-4 py-2.5 text-text-primary font-medium">${entry.amount}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{entry.method}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        <Badge variant={entry.status === 'PAID' ? 'success' : 'warning'}>{entry.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              Register Walk-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
