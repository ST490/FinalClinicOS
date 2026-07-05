import { nurseQueueAppointments } from '../../mockData';
import Badge from '../../components/ui/Badge';
import { Send, Plus } from 'lucide-react';

export default function NurseDashboard() {
  return (
    <div className="space-y-0 animate-fade-in">
      <h1 className="text-xl font-bold text-text-primary mb-5">
        Patient Queue – Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </h1>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px_280px] gap-4">
        {/* Main Queue Table */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Wait Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {nurseQueueAppointments.map((apt) => {
                  const statusVariant = ({
                    WAITING: 'warning' as const,
                    CHECKED_IN: 'info' as const,
                    IN_PROGRESS: 'success' as const,
                  } as Record<string, 'warning' | 'info' | 'success'>)[apt.status] || 'neutral' as const;
                  const statusLabel = ({
                    WAITING: 'Waiting',
                    CHECKED_IN: 'Checked In',
                    IN_PROGRESS: 'In Progress',
                  } as Record<string, string>)[apt.status] || apt.status;

                  return (
                    <tr key={apt.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 text-text-primary font-medium whitespace-nowrap">{apt.time}</td>
                      <td className="px-4 py-3 text-text-primary font-medium">{apt.patientName}</td>
                      <td className="px-4 py-3 text-text-secondary">{apt.waitTime}</td>
                      <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{apt.doctorName}</td>
                      <td className="px-4 py-3 text-text-secondary">{apt.reason}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button className="text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors">
                            [Record Vitals]
                          </button>
                          <button className="text-[11px] font-medium text-text-secondary hover:text-primary-600 hover:underline transition-colors">
                            [View History]
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar — Patient Details + History */}
        <div className="space-y-4">
          {/* Patient Details */}
          <div className="bg-surface-card rounded-xl border border-border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Patient Details</h3>
              <button className="text-text-muted hover:text-text-secondary text-xs">•••</button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-sm font-semibold">
                LB
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Liam Brown</p>
                <p className="text-xs text-text-muted">DOB: Diav 26, 1983</p>
                <p className="text-xs text-text-muted">ID: 02334556</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2 rounded-lg transition-colors">
                Check In
              </button>
              <button className="flex-1 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-200 py-2 rounded-lg border border-border transition-colors">
                Check Out
              </button>
            </div>
          </div>

          {/* Add History Entry */}
          <div className="bg-surface-card rounded-xl border border-border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Add History Entry</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Entry Type</label>
                <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all">
                  <option>Triage Note</option>
                  <option>Assessment</option>
                  <option>Follow-up</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Chief Complaint</label>
                <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all">
                  <option>Chief Complaint</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Notes</label>
                <textarea
                  placeholder="Add your itch text here..."
                  rows={3}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all resize-none"
                />
              </div>
              <button className="w-full text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors">
                Save Entry
              </button>
            </div>
          </div>

          {/* Recent Prescriptions */}
          <div className="bg-surface-card rounded-xl border border-border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Recent Prescriptions</h3>
              <button className="text-text-muted hover:text-text-secondary text-xs">•••</button>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-2 rounded-lg bg-surface/70 border border-border-light">
                  <p className="text-xs font-medium text-text-primary">Amoxicillin 500mg – 1 week</p>
                  <p className="text-[10px] text-text-muted">Dr. A. Thorne | [Date issued]</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Far Right Sidebar — Vitals + Reminders */}
        <div className="space-y-4">
          {/* Record Vitals */}
          <div className="bg-surface-card rounded-xl border border-border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Record Vitals</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Temperature (°F/°C)</label>
                <div className="flex gap-2 mt-1">
                  <input type="text" defaultValue="98.6" className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                  <span className="text-xs text-text-muted self-center">°F/°C</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Blood Pressure</label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <span className="text-[10px] text-text-muted">sys/dia</span>
                    <div className="flex gap-1">
                      <input type="text" defaultValue="120" className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                      <input type="text" defaultValue="80" className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                    </div>
                  </div>
                  <span className="text-xs text-text-muted self-end pb-1.5">mmHg</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Pulse</label>
                  <div className="flex gap-1 mt-1">
                    <input type="text" defaultValue="50" className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                    <span className="text-[10px] text-text-muted self-center">bpm</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Weight</label>
                  <div className="flex gap-1 mt-1">
                    <input type="text" className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" placeholder="" />
                    <span className="text-[10px] text-text-muted self-center">lbs/kg</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">Height</label>
                  <div className="flex gap-1 mt-1">
                    <input type="text" className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                    <span className="text-[10px] text-text-muted self-center">in/cm</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary">SpO2</label>
                  <div className="flex gap-1 mt-1">
                    <input type="text" defaultValue="90" className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all" />
                    <span className="text-[10px] text-text-muted self-center">%</span>
                  </div>
                </div>
              </div>
              <button className="w-full text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors">
                Save Vitals
              </button>
            </div>
          </div>

          {/* Do Issue */}
          <div className="bg-surface-card rounded-xl border border-border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Do issue</h3>
            <p className="text-xs text-text-muted italic">No issue</p>
          </div>

          {/* Reminders */}
          <div className="bg-surface-card rounded-xl border border-border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Reminders</h3>
            <div className="space-y-2 mb-3">
              {['Follow-up SMS – Sent', 'Follow-up SMS – Sent', 'Follow-up SM5 – Sent'].map((reminder, i) => (
                <p key={i} className="text-xs text-text-secondary">{reminder}</p>
              ))}
            </div>
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-success hover:bg-emerald-600 py-2.5 rounded-lg transition-colors mb-2">
              <Send className="w-3 h-3" />
              Send WhatsApp Follow-up
            </button>
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary-600 py-2 rounded-lg border border-border hover:border-primary-300 transition-colors">
              <Plus className="w-3 h-3" />
              Trigger New Reminder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
