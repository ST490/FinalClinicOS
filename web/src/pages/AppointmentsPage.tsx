import React, { useState } from 'react';
import { Calendar, Clock, Plus, Users, CheckCircle, XCircle, UserX, AlertCircle, Sparkles } from 'lucide-react';
import { todaysAppointments } from '../mockData';
import type { Appointment } from '../types';
import Badge from '../components/ui/Badge';

// Week days
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM'
];

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  
  // Local state for appointments
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    // Add day property to initial mock appointments so they distribute nicely in week view
    return todaysAppointments.map((apt, idx) => ({
      ...apt,
      // Distribute evenly among days
      reason: apt.reason || 'Consultation',
      waitTime: apt.waitTime || '0 min',
      // We map appointments to different days to look realistic
      id: apt.id || `apt-gen-${idx}`,
      status: apt.status === 'CHECKED_IN' ? 'CONFIRMED' : apt.status,
    }));
  });

  // Mock list of doctors
  const doctors = ['Dr. Aris Thorne', 'Dr. Emily Chen', 'Dr. Eleanor Vance'];

  // Local state for queue/walkins
  const [walkins, setWalkins] = useState([
    { id: 'w-1', name: 'James Carter', waitTime: '15 mins', reason: 'Sprained Ankle', status: 'WAITING' },
    { id: 'w-2', name: 'Sophia Patel', waitTime: '8 mins', reason: 'Mild Fever', status: 'WAITING' },
    { id: 'w-3', name: 'Marcus Miller', waitTime: '2 mins', reason: 'Prescription Renewal', status: 'IN_PROGRESS' },
  ]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(doctors[0]);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0]);
  const [targetDay, setTargetDay] = useState('Monday');
  const [error, setError] = useState('');

  // Selected appointment details state
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  // Distribute appointments to a grid key (day_time)
  const getAppointmentAt = (day: string, time: string) => {
    // Simple mock logic: map appointment times like "09:00 AM" or "09:30 AM" to the hour slots
    return appointments.find(apt => {
      const aptHour = apt.time.split(':')[0] + ':00 ' + apt.time.split(' ')[1];
      // For demo, distribute them to make the calendar look populated
      const matchesTime = aptHour === time;
      
      // Let's use standard hashing based on id to map to a day for mock realism
      const dayIndex = Math.abs(apt.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % DAYS.length;
      const matchesDay = DAYS[dayIndex] === day;

      return matchesTime && matchesDay;
    });
  };

  const handleBookSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName) {
      setError('Please enter patient name.');
      return;
    }

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientName,
      doctorName: selectedDoctor,
      time: selectedTime,
      reason: 'General Consultation',
      waitTime: '0 min',
      type: 'SCHEDULED',
      status: 'BOOKED',
    };

    setAppointments(prev => [...prev, newApt]);
    setPatientName('');
    setIsModalOpen(false);
    setError('');
  };

  const updateStatus = (aptId: string, status: Appointment['status']) => {
    setAppointments(prev =>
      prev.map(apt => (apt.id === aptId ? { ...apt, status } : apt))
    );
    setSelectedApt(null);
  };

  const statusBadgeVariant = (status: Appointment['status']) => {
    switch (status) {
      case 'BOOKED': return 'info';
      case 'CONFIRMED': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'danger';
      case 'NO_SHOW': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Appointments Management
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage clinic bookings, calendar time slots, and real-time walk-in queues.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Day / Week Toggle */}
          <div className="flex rounded-lg border border-border bg-surface p-1 shadow-sm">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-surface-card text-primary-700 shadow-sm border border-border/20'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-surface-card text-primary-700 shadow-sm border border-border/20'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Week View
            </button>
          </div>

          <button
            onClick={() => {
              setTargetDay('Monday');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar Layout (Left) + Walk-in Queue (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        
        {/* Left Column: Calendar View */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
          
          {/* Day Selector (for Day View) */}
          {viewMode === 'day' && (
            <div className="flex items-center gap-1.5 border-b border-border-light bg-surface/30 px-5 py-3 overflow-x-auto">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                    selectedDay === day
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-surface-card text-text-secondary border-border hover:bg-surface'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              
              {/* Table Header: Week days / Day Header */}
              <div
                className="grid border-b border-border-light bg-surface/40"
                style={{
                  gridTemplateColumns: viewMode === 'week' 
                    ? '100px repeat(5, 1fr)' 
                    : '100px 1fr'
                }}
              >
                <div className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Time</div>
                
                {viewMode === 'week' ? (
                  DAYS.map((day) => (
                    <div key={day} className="p-4 text-xs font-bold text-text-primary border-l border-border-light flex flex-col items-center">
                      <span>{day}</span>
                      <span className="text-[10px] text-text-secondary font-normal mt-0.5">Oct 26</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-xs font-bold text-text-primary border-l border-border-light">
                    {selectedDay} Schedule
                  </div>
                )}
              </div>

              {/* Time Slots Rows */}
              <div className="divide-y divide-border-light">
                {TIME_SLOTS.map((time) => (
                  <div
                    key={time}
                    className="grid min-h-[85px] hover:bg-surface/10 transition-colors"
                    style={{
                      gridTemplateColumns: viewMode === 'week' 
                        ? '100px repeat(5, 1fr)' 
                        : '100px 1fr'
                    }}
                  >
                    {/* Time Label */}
                    <div className="p-3 text-xs font-semibold text-text-secondary flex items-start pt-4 gap-1">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      {time}
                    </div>

                    {/* Week Slots rendering */}
                    {viewMode === 'week' ? (
                      DAYS.map((day) => {
                        const apt = getAppointmentAt(day, time);
                        return (
                          <div
                            key={day}
                            className="p-1.5 border-l border-border-light relative group flex flex-col justify-between"
                          >
                            {apt ? (
                              <button
                                onClick={() => setSelectedApt(apt)}
                                className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary-400 bg-surface-card hover:shadow-sm transition-all text-xs flex flex-col justify-between h-full cursor-pointer animate-scale-in"
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-text-primary truncate max-w-[80%]">
                                      {apt.patientName}
                                    </span>
                                    <Badge variant={statusBadgeVariant(apt.status)} size="sm">
                                      {apt.status.toLowerCase()}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-text-muted mt-1 truncate">
                                    {apt.doctorName}
                                  </p>
                                </div>
                                <span className="text-[9px] text-text-muted self-end mt-1.5">{apt.time}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTargetDay(day);
                                  setSelectedTime(time);
                                  setIsModalOpen(true);
                                }}
                                className="w-full h-full rounded-lg border border-dashed border-border-light hover:border-primary-300 hover:bg-primary-50/20 transition-all flex items-center justify-center text-text-muted hover:text-primary-500 opacity-0 group-hover:opacity-100 cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      /* Day view rendering */
                      <div className="p-2 border-l border-border-light flex flex-col gap-2">
                        {appointments
                          .filter((apt) => {
                            const aptHour = apt.time.split(':')[0] + ':00 ' + apt.time.split(' ')[1];
                            // Simple layout map for demo day view
                            const dayIndex = Math.abs(apt.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % DAYS.length;
                            return aptHour === time && DAYS[dayIndex] === selectedDay;
                          })
                          .map((apt) => (
                            <div
                              key={apt.id}
                              onClick={() => setSelectedApt(apt)}
                              className="p-3 rounded-xl border border-border hover:border-primary-400 bg-surface-card hover:shadow-md transition-all text-xs flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                  {apt.patientName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="font-bold text-text-primary">{apt.patientName}</p>
                                  <p className="text-[10px] text-text-muted mt-0.5">{apt.doctorName} • {apt.reason}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={statusBadgeVariant(apt.status)}>{apt.status}</Badge>
                                <span className="text-[10px] text-text-secondary font-medium">{apt.time}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Walk-in Queue List */}
        <div className="space-y-4">
          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-500" />
                Walk-In Queue
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                {walkins.length} Active
              </span>
            </div>

            <div className="space-y-3">
              {walkins.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl border border-border bg-surface/40 hover:bg-surface transition-colors space-y-2 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-text-primary">{w.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">Reason: {w.reason}</p>
                    </div>
                    <Badge variant={w.status === 'IN_PROGRESS' ? 'success' : 'warning'} size="sm">
                      {w.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border-light">
                    <span className="text-[10px] text-text-secondary flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-muted" /> Wait: {w.waitTime}
                    </span>
                    <button
                      onClick={() => {
                        // Book directly from walk-in
                        setPatientName(w.name);
                        setTargetDay('Monday');
                        setIsModalOpen(true);
                      }}
                      className="text-[10px] font-semibold text-primary-600 hover:text-primary-700 hover:underline cursor-pointer"
                    >
                      Assign Slot
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Walk-In Button */}
            <div className="mt-4 pt-4 border-t border-border-light">
              <button
                onClick={() => {
                  const newWalk = {
                    id: `w-${Date.now()}`,
                    name: prompt('Enter Patient Name for Quick Walk-In:') || '',
                    waitTime: '0 min',
                    reason: 'General Consultation',
                    status: 'WAITING',
                  };
                  if (newWalk.name) {
                    setWalkins(prev => [...prev, newWalk]);
                  }
                }}
                className="w-full text-center text-xs font-semibold text-primary-600 hover:text-primary-700 border border-dashed border-primary-300 hover:border-primary-400 bg-primary-50/20 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                + Register Quick Walk-In
              </button>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-gradient-to-br from-primary-800 to-teal-900 text-white rounded-xl border border-primary-700 p-5 shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10">
              <Sparkles className="w-36 h-36 translate-x-8 translate-y-8" />
            </div>
            <h4 className="text-xs font-semibold text-primary-200 uppercase tracking-widest">Dashboard Metrics</h4>
            <p className="text-lg font-bold mt-1">Today's Appointment Load</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-2xl font-black">{appointments.filter(a => a.status === 'COMPLETED').length}</p>
                <p className="text-[10px] text-primary-300">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-black">{appointments.filter(a => a.status === 'BOOKED' || a.status === 'CONFIRMED').length}</p>
                <p className="text-[10px] text-primary-300">Remaining</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Slot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl border border-border max-w-md w-full p-6 animate-scale-in space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="text-base font-bold text-text-primary">Book Appointment Slot</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError('');
                }}
                className="text-text-secondary hover:text-text-primary text-sm font-semibold p-1 hover:bg-surface rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleBookSlot} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Day</label>
                  <select
                    value={targetDay}
                    onChange={(e) => setTargetDay(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  >
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Time Slot</label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Assigned Physician</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                >
                  {doctors.map(doc => (
                    <option key={doc} value={doc}>{doc}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-200 py-2.5 rounded-lg border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Detail & Status Update Modal */}
      {selectedApt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl border border-border max-w-sm w-full p-6 animate-scale-in space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="text-base font-bold text-text-primary">Appointment Action</h3>
              <button
                onClick={() => setSelectedApt(null)}
                className="text-text-secondary hover:text-text-primary text-sm font-semibold p-1 hover:bg-surface rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-sm">
              <p className="font-bold text-text-primary text-base">{selectedApt.patientName}</p>
              <p className="text-xs text-text-secondary">Doctor: <span className="font-medium text-text-primary">{selectedApt.doctorName}</span></p>
              <p className="text-xs text-text-secondary">Scheduled: <span className="font-medium text-text-primary">{selectedApt.time}</span></p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-text-secondary">Current Status:</span>
                <Badge variant={statusBadgeVariant(selectedApt.status)}>{selectedApt.status}</Badge>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border-light">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Update Status To:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStatus(selectedApt.id, 'COMPLETED')}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-success hover:bg-emerald-50 border border-emerald-200 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completed
                </button>
                <button
                  onClick={() => updateStatus(selectedApt.id, 'CONFIRMED')}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 border border-primary-200 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Confirmed
                </button>
                <button
                  onClick={() => updateStatus(selectedApt.id, 'CANCELLED')}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-danger hover:bg-red-50 border border-red-200 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelled
                </button>
                <button
                  onClick={() => updateStatus(selectedApt.id, 'NO_SHOW')}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-text-secondary hover:bg-slate-100 border border-slate-200 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  No-Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
