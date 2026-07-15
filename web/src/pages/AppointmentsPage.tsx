import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Users,
  CheckCircle,
  XCircle,
  UserX,
  AlertCircle,
  Sparkles,
  Stethoscope,
  UserPlus,
  CalendarCheck,
} from 'lucide-react';
import type {
  Appointment,
  AppointmentCategory,
  AppointmentStatus,
} from '../lib/appointments';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { appointmentApi } from '../lib/appointments';
import { patientApi } from '../lib/patients';
import { staffApi } from '../lib/staff';
import { useApiQuery, apiMutate } from '../lib/useApiQuery';

const CATEGORIES: AppointmentCategory[] = ['FIRST_TIME', 'RETURNING', 'FREE_CHECKUP'];
const CATEGORY_LABEL: Record<AppointmentCategory, string> = {
  FIRST_TIME: 'First-time',
  RETURNING: 'Returning',
  FREE_CHECKUP: 'Free checkup',
};

// Roles that may create / cancel appointments (mirrors backend permission matrix).
const CAN_BOOK = ['MASTER', 'SUB_MASTER', 'NURSE', 'RECEPTIONIST'];
const CAN_CANCEL = ['MASTER', 'SUB_MASTER'];
const CAN_MANAGE = ['MASTER', 'SUB_MASTER', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];

const TERMINAL: AppointmentStatus[] = ['COMPLETED', 'NO_SHOW', 'CANCELLED'];

function nextActions(status: AppointmentStatus): AppointmentStatus[] {
  switch (status) {
    case 'BOOKED':
      return ['CONFIRMED'];
    case 'CONFIRMED':
      return ['IN_PROGRESS'];
    case 'IN_PROGRESS':
      return ['COMPLETED', 'NO_SHOW'];
    default:
      return [];
  }
}

const ACTION_META: Record<
  string,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  CONFIRMED: {
    label: 'Confirm',
    cls: 'text-primary-700 hover:bg-primary-50 border-primary-200',
    icon: <CalendarCheck className="w-3.5 h-3.5" />,
  },
  IN_PROGRESS: {
    label: 'Check-in',
    cls: 'text-amber-700 hover:bg-amber-50 border-amber-200',
    icon: <UserPlus className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: 'Complete',
    cls: 'text-success hover:bg-emerald-50 border-emerald-200',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  NO_SHOW: {
    label: 'No-show',
    cls: 'text-text-secondary hover:bg-slate-100 border-slate-200',
    icon: <UserX className="w-3.5 h-3.5" />,
  },
};

function statusBadgeVariant(status: AppointmentStatus): any {
  switch (status) {
    case 'BOOKED':
      return 'info';
    case 'CONFIRMED':
      return 'info';
    case 'IN_PROGRESS':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    case 'NO_SHOW':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function categoryBadgeVariant(cat: AppointmentCategory): any {
  switch (cat) {
    case 'FIRST_TIME':
      return 'info';
    case 'RETURNING':
      return 'neutral';
    case 'FREE_CHECKUP':
      return 'success';
  }
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AppointmentsPage() {
  const { clinic, user } = useAuth();
  const role = useRole().role;
  const doctorScoped = role === 'DOCTOR';

  const canBook = CAN_BOOK.includes(role);
  const canCancel = CAN_CANCEL.includes(role);
  const canManage = CAN_MANAGE.includes(role);

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AppointmentCategory>('ALL');
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');
  const [refetchKey, setRefetchKey] = useState(0);

  const listParams = useMemo(() => {
    const p: any = { clinicId: clinic?.id, limit: 200 };
    if (doctorScoped && user) p.doctorId = user.id;
    if (categoryFilter !== 'ALL') p.category = categoryFilter;
    if (dateFilter === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      p.fromDate = start.toISOString();
      p.toDate = end.toISOString();
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id, doctorScoped, user?.id, categoryFilter, dateFilter, refetchKey]);

  const { data: apptPage, loading } = useApiQuery(
    () => appointmentApi.list(listParams),
    { skip: !clinic?.id, deps: [clinic?.id, doctorScoped, user?.id, categoryFilter, dateFilter, refetchKey] },
  );

  const { data: patientsPage } = useApiQuery(
    () => patientApi.list({ limit: 200 }),
    { skip: !clinic?.id },
  );
  const { data: staff } = useApiQuery(
    () => staffApi.list({ clinicId: clinic?.id }),
    { skip: !clinic?.id },
  );

  const appointments = apptPage?.data ?? [];
  const patients = patientsPage?.data ?? [];
  const doctors = (staff ?? []).filter((m) =>
    m.clinicRoles.some((r) => r.role === 'DOCTOR'),
  );

  const refresh = () => setRefetchKey((k) => k + 1);

  // ── Stats ──
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byCategory: Record<AppointmentCategory, number> = {
      FIRST_TIME: 0,
      RETURNING: 0,
      FREE_CHECKUP: 0,
    };
    for (const a of appointments) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    }
    const freeShownUp = appointments.filter(
      (a) =>
        a.category === 'FREE_CHECKUP' &&
        (a.status === 'IN_PROGRESS' || a.status === 'COMPLETED'),
    ).length;
    return { byStatus, byCategory, freeShownUp };
  }, [appointments]);

  const walkIns = appointments
    .filter(
      (a) =>
        a.type === 'WALK_IN' &&
        (a.status === 'BOOKED' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS'),
    )
    .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));

  const sortedAppts = [...appointments].sort(
    (a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime(),
  );

  // ── Modals ──
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [bookErr, setBookErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async (form: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    type: 'SCHEDULED' | 'WALK_IN';
    category: AppointmentCategory;
    notes: string;
  }) => {
    const doctorId = doctorScoped && user ? user.id : form.doctorId;
    if (!form.patientId || !doctorId) {
      setBookErr('Patient and doctor are both required.');
      return;
    }
    const start = new Date(`${form.date}T${form.time}`);
    if (isNaN(start.getTime())) {
      setBookErr('Please choose a valid date and time.');
      return;
    }
    const end = new Date(start.getTime() + 30 * 60000);
    const payload: any = {
      clinicId: clinic!.id,
      patientId: form.patientId,
      doctorId,
      slotStart: start.toISOString(),
      slotEnd: end.toISOString(),
      type: form.type,
      category: form.category,
      notes: form.notes || undefined,
    };
    if (form.type === 'WALK_IN') {
      const maxQ = walkIns.reduce((m, w) => Math.max(m, w.queuePosition ?? 0), 0);
      payload.queuePosition = maxQ + 1;
    }
    setBusy(true);
    const { error } = await apiMutate(() => appointmentApi.create(payload));
    setBusy(false);
    if (error) {
      setBookErr(error);
      return;
    }
    setIsBookOpen(false);
    setBookErr('');
    refresh();
  };

  const changeStatus = async (aptId: string, status: AppointmentStatus) => {
    setBusy(true);
    const { error } = await apiMutate(() =>
      status === 'CANCELLED'
        ? appointmentApi.cancel(aptId)
        : appointmentApi.update(aptId, { status }),
    );
    setBusy(false);
    if (error) {
      setBookErr(error);
      return;
    }
    setSelectedApt(null);
    refresh();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Appointments
            {doctorScoped && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                My Schedule
              </span>
            )}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Book, confirm, and manage appointments. Categorize by first-time, returning, or free
            health checkup.
          </p>
        </div>
        {canBook && (
          <button
            onClick={() => {
              setBookErr('');
              setIsBookOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
            categoryFilter === 'ALL'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-surface-card text-text-secondary border-border hover:bg-surface'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
              categoryFilter === c
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-surface-card text-text-secondary border-border hover:bg-surface'
            }`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 border border-border rounded-full p-1 bg-surface-card">
          {(['all', 'today'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                dateFilter === d
                  ? 'bg-surface text-primary-700 shadow-sm border border-border/20'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {d === 'all' ? 'All dates' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(
          [
            ['Booked', stats.byStatus['BOOKED'] || 0, 'info'],
            ['Confirmed', stats.byStatus['CONFIRMED'] || 0, 'info'],
            ['In Progress', stats.byStatus['IN_PROGRESS'] || 0, 'warning'],
            ['Completed', stats.byStatus['COMPLETED'] || 0, 'success'],
            ['No-show', stats.byStatus['NO_SHOW'] || 0, 'neutral'],
            ['Free Checkup Shown', stats.freeShownUp, 'success'],
          ] as [string, number, any][]
        ).map(([label, val]) => (
          <div
            key={label}
            className="bg-surface-card rounded-xl border border-border p-3.5 shadow-sm"
          >
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-black text-text-primary mt-1">{val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Agenda list */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              Appointments
              <span className="text-xs font-normal text-text-secondary">
                ({sortedAppts.length})
              </span>
            </h3>
          </div>

          <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
            {loading && <p className="text-xs text-text-secondary p-3">Loading…</p>}
            {!loading && sortedAppts.length === 0 && (
              <p className="text-xs text-text-secondary p-6 text-center">
                No appointments match the current filters.
              </p>
            )}
            {sortedAppts.map((apt) => {
              const actions = canManage ? nextActions(apt.status) : [];
              return (
                <div
                  key={apt.id}
                  className="p-3.5 rounded-xl border border-border bg-surface/40 hover:bg-surface transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-text-primary truncate">
                          {apt.patient?.name ?? 'Patient'}
                        </p>
                        <Badge variant={categoryBadgeVariant(apt.category)} size="sm">
                          {CATEGORY_LABEL[apt.category]}
                        </Badge>
                        {apt.type === 'WALK_IN' && (
                          <Badge variant="warning" size="sm">
                            Walk-in
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 truncate">
                        {apt.doctor?.name ?? 'Unassigned'} • {fmtDateTime(apt.slotStart)}
                      </p>
                      {apt.notes && (
                        <p className="text-[11px] text-text-muted mt-1 truncate">{apt.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant={statusBadgeVariant(apt.status)} size="sm">
                        {apt.status.toLowerCase().replace('_', ' ')}
                      </Badge>
                      <button
                        onClick={() => setSelectedApt(apt)}
                        className="text-[10px] font-semibold text-primary-600 hover:underline cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>

                  {(actions.length > 0 || (canCancel && !TERMINAL.includes(apt.status))) && (
                    <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-border-light">
                      {actions.map((s) => (
                        <button
                          key={s}
                          disabled={busy}
                          onClick={() => changeStatus(apt.id, s)}
                          className={`flex items-center gap-1.5 text-xs font-medium border py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${ACTION_META[s].cls}`}
                        >
                          {ACTION_META[s].icon}
                          {ACTION_META[s].label}
                        </button>
                      ))}
                      {canCancel && !TERMINAL.includes(apt.status) && (
                        <button
                          disabled={busy}
                          onClick={() => changeStatus(apt.id, 'CANCELLED')}
                          className="flex items-center gap-1.5 text-xs font-medium text-danger hover:bg-red-50 border border-red-200 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Walk-in queue */}
          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-500" />
                Walk-In Queue
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                {walkIns.length} Active
              </span>
            </div>

            <div className="space-y-3">
              {walkIns.length === 0 && (
                <p className="text-xs text-text-secondary text-center py-4">
                  No active walk-ins.
                </p>
              )}
              {walkIns.map((w, i) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl border border-border bg-surface/40 hover:bg-surface transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-xs font-bold flex items-center justify-center">
                        {w.queuePosition ?? i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-text-primary">
                          {w.patient?.name ?? 'Patient'}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {CATEGORY_LABEL[w.category]}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant(w.status)} size="sm">
                      {w.status.toLowerCase().replace('_', ' ')}
                    </Badge>
                  </div>
                  {canManage && nextActions(w.status).length > 0 && (
                    <div className="flex gap-2 pt-1 border-t border-border-light">
                      {nextActions(w.status).map((s) => (
                        <button
                          key={s}
                          disabled={busy}
                          onClick={() => changeStatus(w.id, s)}
                          className={`flex items-center gap-1.5 text-xs font-medium border py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${ACTION_META[s].cls}`}
                        >
                          {ACTION_META[s].icon}
                          {ACTION_META[s].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canBook && (
              <div className="mt-4 pt-4 border-t border-border-light">
                <button
                  onClick={() => {
                    setBookErr('');
                    setIsBookOpen(true);
                  }}
                  className="w-full text-center text-xs font-semibold text-primary-600 hover:text-primary-700 border border-dashed border-primary-300 hover:border-primary-400 bg-primary-50/20 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  + Register Walk-In
                </button>
              </div>
            )}
          </div>

          {/* Load panel */}
          <div className="bg-gradient-to-br from-primary-800 to-teal-900 text-white rounded-xl border border-primary-700 p-5 shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10">
              <Sparkles className="w-36 h-36 translate-x-8 translate-y-8" />
            </div>
            <h4 className="text-xs font-semibold text-primary-200 uppercase tracking-widest">
              Dashboard Metrics
            </h4>
            <p className="text-lg font-bold mt-1">Appointment Load</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-2xl font-black">{stats.byStatus['COMPLETED'] || 0}</p>
                <p className="text-[10px] text-primary-300">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-black">
                  {(stats.byStatus['BOOKED'] || 0) + (stats.byStatus['CONFIRMED'] || 0)}
                </p>
                <p className="text-[10px] text-primary-300">Remaining</p>
              </div>
              <div>
                <p className="text-2xl font-black">{stats.byCategory['FIRST_TIME']}</p>
                <p className="text-[10px] text-primary-300">First-time</p>
              </div>
              <div>
                <p className="text-2xl font-black">{stats.byCategory['FREE_CHECKUP']}</p>
                <p className="text-[10px] text-primary-300">Free checkup</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {isBookOpen && (
        <BookingModal
          clinicId={clinic?.id}
          patients={patients}
          doctors={doctors}
          doctorScoped={doctorScoped}
          defaultDoctorId={doctorScoped && user ? user.id : undefined}
          busy={busy}
          error={bookErr}
          onClose={() => setIsBookOpen(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Detail / status modal */}
      {selectedApt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl border border-border max-w-sm w-full p-6 animate-scale-in space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="text-base font-bold text-text-primary">Appointment</h3>
              <button
                onClick={() => setSelectedApt(null)}
                className="text-text-secondary hover:text-text-primary text-sm font-semibold p-1 hover:bg-surface rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-sm">
              <p className="font-bold text-text-primary text-base">
                {selectedApt.patient?.name ?? 'Patient'}
              </p>
              <p className="text-xs text-text-secondary">
                Doctor: <span className="font-medium text-text-primary">{selectedApt.doctor?.name ?? 'Unassigned'}</span>
              </p>
              <p className="text-xs text-text-secondary">
                Scheduled: <span className="font-medium text-text-primary">{fmtDateTime(selectedApt.slotStart)}</span>
              </p>
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <Badge variant={categoryBadgeVariant(selectedApt.category)} size="sm">
                  {CATEGORY_LABEL[selectedApt.category]}
                </Badge>
                {selectedApt.type === 'WALK_IN' && (
                  <Badge variant="warning" size="sm">
                    Walk-in
                  </Badge>
                )}
                <Badge variant={statusBadgeVariant(selectedApt.status)} size="sm">
                  {selectedApt.status.toLowerCase().replace('_', ' ')}
                </Badge>
              </div>
              {selectedApt.notes && (
                <p className="text-xs text-text-muted pt-1">{selectedApt.notes}</p>
              )}
            </div>

            {canManage && (
              <div className="space-y-2 pt-2 border-t border-border-light">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Update Status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {nextActions(selectedApt.status).map((s) => (
                    <button
                      key={s}
                      disabled={busy}
                      onClick={() => changeStatus(selectedApt.id, s)}
                      className={`flex items-center justify-center gap-1.5 text-xs font-medium border py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${ACTION_META[s].cls}`}
                    >
                      {ACTION_META[s].icon}
                      {ACTION_META[s].label}
                    </button>
                  ))}
                  {canCancel && !TERMINAL.includes(selectedApt.status) && (
                    <button
                      disabled={busy}
                      onClick={() => changeStatus(selectedApt.id, 'CANCELLED')}
                      className="flex items-center justify-center gap-1.5 text-xs font-medium text-danger hover:bg-red-50 border border-red-200 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking modal
// ─────────────────────────────────────────────────────────────────────────────
interface BookingModalProps {
  clinicId?: string;
  patients: { id: string; name: string }[];
  doctors: { id: string; name: string; clinicRoles: any[] }[];
  doctorScoped: boolean;
  defaultDoctorId?: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onCreate: (form: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    type: 'SCHEDULED' | 'WALK_IN';
    category: AppointmentCategory;
    notes: string;
  }) => void;
}

function BookingModal({
  patients,
  doctors,
  doctorScoped,
  defaultDoctorId,
  busy,
  error,
  onClose,
  onCreate,
}: BookingModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState(defaultDoctorId ?? '');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState<'SCHEDULED' | 'WALK_IN'>('SCHEDULED');
  const [category, setCategory] = useState<AppointmentCategory>('RETURNING');
  const [notes, setNotes] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ patientId, doctorId, date, time, type, category, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-card rounded-xl border border-border max-w-md w-full p-6 animate-scale-in space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-border-light">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary-600" />
            Book Appointment
          </h3>
          <button
            onClick={onClose}
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

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">Patient</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all"
            >
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {!doctorScoped && (
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Assigned Physician
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all"
              >
                <option value="">Select doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">Type</label>
            <div className="flex gap-2">
              {(['SCHEDULED', 'WALK_IN'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all cursor-pointer ${
                    type === t
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-surface-card text-text-secondary border-border hover:bg-surface'
                  }`}
                >
                  {t === 'SCHEDULED' ? 'Scheduled' : 'Walk-in'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Category
            </label>
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <label
                  key={c}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    category === c
                      ? 'border-primary-400 bg-primary-50/40'
                      : 'border-border bg-surface-card hover:bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    checked={category === c}
                    onChange={() => setCategory(c)}
                    className="accent-primary-600"
                  />
                  <span className="text-sm text-text-primary font-medium">
                    {CATEGORY_LABEL[c]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason / notes (optional)"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-200 py-2.5 rounded-lg border border-border transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
