import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Phone,
  Clock,
} from 'lucide-react';
import type {
  Appointment,
  AppointmentCategory,
  AppointmentStatus,
} from '../lib/appointments';
import Badge from '../components/ui/Badge';
import ModalPortal from '../components/ModalPortal';
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

// Grid geometry — ponytail: fixed clinic hours, change here if needed.
const SLOT_MIN = 30;
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MIN) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
})();

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
    cls: 'text-amber-700 hover:bg-amber-50 border-amber-200 dark:text-amber-300 dark:hover:bg-amber-500/15 dark:border-amber-500/25',
    icon: <UserPlus className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: 'Complete',
    cls: 'text-success hover:bg-emerald-50 border-emerald-200 dark:hover:bg-emerald-500/15 dark:border-emerald-500/25',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  NO_SHOW: {
    label: 'No-show',
    cls: 'text-text-secondary hover:bg-slate-100 border-slate-200 dark:hover:bg-slate-500/15 dark:border-slate-500/25',
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

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function statusChipClass(status: AppointmentStatus): string {
  switch (status) {
    case 'BOOKED':
    case 'CONFIRMED':
      return 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-500/15 dark:border-sky-500/25 dark:text-sky-300';
    case 'IN_PROGRESS':
      return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/25 dark:text-amber-300';
    case 'COMPLETED':
      return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/25 dark:text-emerald-300';
    case 'CANCELLED':
      return 'bg-red-50 border-red-200 text-red-600 line-through dark:bg-red-500/15 dark:border-red-500/25 dark:text-red-300';
    case 'NO_SHOW':
      return 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-500/15 dark:border-slate-500/25 dark:text-slate-400';
    default:
      return 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-500/10 dark:border-slate-500/20 dark:text-slate-400';
  }
}

// ── date helpers ──
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday-start week
  d.setDate(d.getDate() + diff);
  return d;
}

function slotKeyOf(iso: string): string {
  const d = new Date(iso);
  const mins = d.getHours() * 60 + d.getMinutes();
  const rounded = Math.floor(mins / SLOT_MIN) * SLOT_MIN;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function AppointmentsPage() {
  const { clinic, user } = useAuth();
  const role = useRole().role;
  const doctorScoped = role === 'DOCTOR';

  const canBook = CAN_BOOK.includes(role);
  const canCancel = CAN_CANCEL.includes(role);
  const canManage = CAN_MANAGE.includes(role);

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AppointmentCategory>('ALL');
  const [doctorFilter, setDoctorFilter] = useState<'ALL' | string>('ALL');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [refetchKey, setRefetchKey] = useState(0);
  const [search, setSearch] = useState('');

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(weekStart.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }, [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    }),
    [weekStart],
  );
  const todayKey = dateKey(new Date());

  const listParams = useMemo(() => {
    const p: any = {
      clinicId: clinic?.id,
      fromDate: weekStart.toISOString(),
      toDate: weekEnd.toISOString(),
      limit: 1000,
    };
    if (doctorScoped && user) p.doctorId = user.id;
    else if (doctorFilter !== 'ALL') p.doctorId = doctorFilter;
    if (categoryFilter !== 'ALL') p.category = categoryFilter;
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id, doctorScoped, user?.id, doctorFilter, categoryFilter, anchor, refetchKey]);

  const { data: apptPage, loading, refetch } = useApiQuery(
    () => appointmentApi.list(listParams),
    {
      skip: !clinic?.id,
      deps: [clinic?.id, doctorScoped, user?.id, doctorFilter, categoryFilter, anchor, refetchKey],
    },
  );

  const { data: patientsPage } = useApiQuery(
    () => patientApi.list({ clinicId: clinic?.id ?? undefined, limit: 200 }),
    { skip: !user },
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
  const showDoctor = !doctorScoped && doctorFilter === 'ALL';

  // Filter the visible week by patient/doctor name (client-side on fetched data)
  const filteredAppts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter((a) => {
      const p = a.patient?.name?.toLowerCase() ?? '';
      const d = a.doctor?.name?.toLowerCase() ?? '';
      return p.includes(q) || d.includes(q);
    });
  }, [appointments, search]);

  // Appointments per weekday (for the header counts)
  const dayCounts = useMemo(() => {
    const counts = days.map(() => 0);
    for (const a of filteredAppts) {
      const k = dateKey(new Date(a.slotStart));
      const idx = days.findIndex((d) => dateKey(d) === k);
      if (idx >= 0) counts[idx]++;
    }
    return counts;
  }, [filteredAppts, days]);

  // Live marker: today's date + current 30-min slot (only when week includes today)
  const nowMark = useMemo(() => {
    const now = new Date();
    const wk = dateKey(now);
    if (!days.some((d) => dateKey(d) === wk)) return null;
    return `${wk}_${slotKeyOf(now.toISOString())}`;
  }, [days]);

  const refresh = () => setRefetchKey((k) => k + 1);

  // ── Auto-update: poll every 20s; pause while tab hidden ──
  // ponytail: no websocket/SSE infra yet — polling keeps the board live across
  // staff. Upgrade to SSE when realtime infra lands.
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) refetch();
    };
    const id = setInterval(tick, 20000);
    const onVis = () => {
      if (!document.hidden) refetch();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refetch]);

  // Bucket appointments into day+slot cells
  const apptMap = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    for (const a of filteredAppts) {
      if (!a.slotStart) continue;
      const key = `${dateKey(new Date(a.slotStart))}_${slotKeyOf(a.slotStart)}`;
      (m[key] ||= []).push(a);
    }
    return m;
  }, [appointments]);

  // ── Stats ──
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byCategory: Record<AppointmentCategory, number> = {
      FIRST_TIME: 0,
      RETURNING: 0,
      FREE_CHECKUP: 0,
    };
    for (const a of filteredAppts) {
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

  const walkIns = filteredAppts
    .filter(
      (a) =>
        a.type === 'WALK_IN' &&
        (a.status === 'BOOKED' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS'),
    )
    .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));

  // ── Modals ──
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [bookInitial, setBookInitial] = useState<{ date: string; time: string }>({
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
  });
  const [editApt, setEditApt] = useState<Appointment | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [bookErr, setBookErr] = useState('');
  const [busy, setBusy] = useState(false);

  const openBook = (date?: string, time?: string) => {
    setBookErr('');
    setEditApt(null);
    setBookInitial({
      date: date ?? new Date().toISOString().slice(0, 10),
      time: time ?? '09:00',
    });
    setIsBookOpen(true);
  };

  const openReschedule = (apt: Appointment) => {
    setBookErr('');
    setSelectedApt(null);
    setEditApt(apt);
    setBookInitial({
      date: (apt.slotStart || new Date().toISOString()).slice(0, 10),
      time: (apt.slotStart || new Date().toISOString()).slice(11, 16),
    });
    setIsBookOpen(true);
  };

  const handleReschedule = async (
    id: string,
    form: {
      date: string;
      time: string;
      type: 'SCHEDULED' | 'WALK_IN';
      category: AppointmentCategory;
      notes: string;
    },
  ) => {
    const start = new Date(`${form.date}T${form.time}`);
    if (isNaN(start.getTime())) {
      setBookErr('Please choose a valid date and time.');
      return;
    }
    const end = new Date(start.getTime() + 30 * 60000);
    setBusy(true);
    const { error } = await apiMutate(() =>
      appointmentApi.update(id, {
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
        type: form.type,
        category: form.category,
        notes: form.notes || undefined,
      }),
    );
    setBusy(false);
    if (error) {
      setBookErr(error);
      return;
    }
    setIsBookOpen(false);
    setEditApt(null);
    setBookErr('');
    refresh();
  };

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

  const rangeLabel = `${days[0].toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

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
            Weekly schedule board. Click any time slot to book; click a booking to update its status.
          </p>
        </div>
        {canBook && (
          <button
            onClick={() => openBook()}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        )}
      </div>

      {/* Toolbar */}
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

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient or doctor…"
            className="text-xs border border-border rounded-full pl-8 pr-3 py-1.5 bg-surface-card text-text-secondary outline-none focus:ring-2 focus:ring-primary-500/20 w-52"
          />
        </div>

        {!doctorScoped && (
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="text-xs border border-border rounded-full px-3 py-1.5 bg-surface-card text-text-secondary outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
          >
            <option value="ALL">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-1.5 border border-border rounded-full p-1 bg-surface-card">
          <button
            onClick={() => setAnchor((a) => {
              const n = new Date(a);
              n.setDate(n.getDate() - 7);
              return n;
            })}
            className="p-1.5 rounded-full hover:bg-surface text-text-secondary cursor-pointer"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer text-text-secondary hover:text-text-primary"
          >
            Today
          </button>
          <button
            onClick={() => setAnchor((a) => {
              const n = new Date(a);
              n.setDate(n.getDate() + 7);
              return n;
            })}
            className="p-1.5 rounded-full hover:bg-surface text-text-secondary cursor-pointer"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
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
        {/* Weekly day × time grid */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              Week of {rangeLabel}
            </h3>
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-text-muted">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-info/70" />Booked</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-warning/70" />In progress</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success/70" />Done</span>
            </div>
          </div>

          <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full text-xs select-none" style={{ minWidth: 860 }}>
              <thead className="sticky top-0 z-10 bg-surface-card">
                <tr className="border-b border-border-light">
                  <th className="sticky left-0 z-20 bg-surface-card w-16 px-2 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase">
                    Time
                  </th>
                  {days.map((d, i) => {
                    const isToday = dateKey(d) === todayKey;
                    return (
                      <th
                        key={i}
                        className={`px-2 py-2 text-center font-semibold border-l border-border-light ${
                          isToday ? 'text-primary-700 bg-primary-50/40' : 'text-text-secondary'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] uppercase tracking-wide">{WEEKDAYS[i]}</span>
                          <span className={`text-sm ${isToday ? 'font-black' : 'font-medium'}`}>
                            {d.getDate()}
                          </span>
                          <span className="text-[10px] text-text-muted mt-0.5">
                            {dayCounts[i]} appt{dayCounts[i] === 1 ? '' : 's'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot} className="divide-x divide-border-light">
                    <td className="sticky left-0 z-10 bg-surface-card px-2 py-1.5 text-[10px] font-medium text-text-muted whitespace-nowrap border-b border-border-light/60">
                      {fmtTime(new Date(`${todayKey}T${slot}:00`))}
                    </td>
                    {days.map((d, i) => {
                      const key = `${dateKey(d)}_${slot}`;
                      const cellAppts = apptMap[key] ?? [];
                      const isTodayCol = dateKey(d) === todayKey;
                      const isNow = key === nowMark;
                      return (
                        <td
                          key={i}
                          onClick={() => openBook(dateKey(d), slot)}
                          className={`align-top p-1 h-12 border-b border-border-light/60 transition-colors cursor-pointer ${
                            isTodayCol ? 'bg-primary-50/20' : ''
                          } ${isNow ? 'ring-2 ring-inset ring-primary-400' : ''} hover:bg-primary-50/40`}
                        >
                          <div className="space-y-1">
                            {cellAppts.map((a) => (
                              <button
                                key={a.id}
                                title={a.notes ? `${a.patient?.name ?? 'Patient'} — ${a.notes}` : a.patient?.name ?? 'Patient'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApt(a);
                                }}
                                className={`w-full text-left rounded-lg border px-2 py-1 text-[11px] leading-tight transition-shadow hover:shadow-sm ${statusChipClass(
                                  a.status,
                                )}`}
                              >
                                <div className="font-semibold truncate">
                                  {a.patient?.name ?? 'Patient'}
                                </div>
                                {showDoctor && (
                                  <div className="truncate opacity-80">
                                    {a.doctor?.name ?? 'Unassigned'}
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-1 opacity-80">
                                  <span>{fmtTime(a.slotStart)}</span>
                                  {a.type === 'WALK_IN' && (
                                    <span className="font-bold">WI</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <p className="text-xs text-text-secondary p-3">Loading…</p>
            )}
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
                  onClick={() => openBook()}
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
          defaultDoctorId={doctorScoped && user ? user.id : doctorFilter !== 'ALL' ? doctorFilter : undefined}
          initialDate={bookInitial.date}
          initialTime={bookInitial.time}
          editAppointment={editApt}
          busy={busy}
          error={bookErr}
          onClose={() => setIsBookOpen(false)}
          onCreate={handleCreate}
          onReschedule={handleReschedule}
        />
      )}

      {/* Detail / status modal */}
      {selectedApt && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-12 px-4 pb-12 overflow-y-auto">
          <div className="bg-surface-card rounded-xl border border-border max-w-sm w-full p-6 animate-scale-in space-y-4 shadow-xl shrink-0">
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
              {selectedApt.patient?.phone && (
                <p className="text-xs text-text-secondary flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {selectedApt.patient.phone}
                </p>
              )}
              <p className="text-xs text-text-secondary">
                Doctor: <span className="font-medium text-text-primary">{selectedApt.doctor?.name ?? 'Unassigned'}</span>
              </p>
              <p className="text-xs text-text-secondary">
                Scheduled: <span className="font-medium text-text-primary">{fmtDateTime(selectedApt.slotStart)}</span>
              </p>
              {selectedApt.type === 'WALK_IN' && selectedApt.queuePosition != null && (
                <p className="text-xs text-text-secondary">
                  Queue: <span className="font-medium text-text-primary">#{selectedApt.queuePosition}</span>
                </p>
              )}
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
              <p className="text-[10px] text-text-muted pt-1">
                Created {fmtDateTime(selectedApt.createdAt)}
                {selectedApt.updatedAt && ` · Updated ${fmtDateTime(selectedApt.updatedAt)}`}
              </p>
            </div>

            {(canManage || (canBook && !TERMINAL.includes(selectedApt.status))) && (
              <div className="space-y-2 pt-2 border-t border-border-light">
                {canBook && !TERMINAL.includes(selectedApt.status) && (
                  <button
                    onClick={() => openReschedule(selectedApt)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary-700 border border-primary-200 hover:bg-primary-50 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Reschedule
                  </button>
                )}
                {canManage && nextActions(selectedApt.status).length > 0 && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
        </div></ModalPortal>
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
  initialDate: string;
  initialTime: string;
  editAppointment?: Appointment | null;
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
  onReschedule?: (
    id: string,
    form: {
      date: string;
      time: string;
      type: 'SCHEDULED' | 'WALK_IN';
      category: AppointmentCategory;
      notes: string;
    },
  ) => void;
}

function BookingModal({
  patients,
  doctors,
  doctorScoped,
  defaultDoctorId,
  initialDate,
  initialTime,
  editAppointment,
  busy,
  error,
  onClose,
  onCreate,
  onReschedule,
}: BookingModalProps) {
  const isEdit = !!editAppointment;
  const [patientId, setPatientId] = useState(
    isEdit ? editAppointment!.patientId : '',
  );
  const [doctorId, setDoctorId] = useState(
    isEdit ? editAppointment!.doctorId ?? defaultDoctorId ?? '' : defaultDoctorId ?? '',
  );
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [type, setType] = useState<'SCHEDULED' | 'WALK_IN'>(
    isEdit ? editAppointment!.type : 'SCHEDULED',
  );
  const [category, setCategory] = useState<AppointmentCategory>(
    isEdit ? editAppointment!.category : 'RETURNING',
  );
  const [notes, setNotes] = useState(isEdit ? editAppointment!.notes ?? '' : '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = { patientId, doctorId, date, time, type, category, notes };
    if (isEdit && editAppointment && onReschedule) {
      onReschedule(editAppointment.id, {
        date,
        time,
        type,
        category,
        notes,
      });
      return;
    }
    onCreate(form);
  };

  return (
    <ModalPortal><div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-12 px-4 pb-12 overflow-y-auto">
      <div className="bg-surface-card rounded-xl border border-border max-w-md w-full p-6 animate-scale-in space-y-4 shadow-xl shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-border-light">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary-600" />
            {isEdit ? 'Reschedule Appointment' : 'Book Appointment'}
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
          {isEdit ? (
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Patient</label>
              <div className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface text-text-primary">
                {editAppointment?.patient?.name ??
                  patients.find((p) => p.id === editAppointment?.patientId)?.name ??
                  'Patient'}
              </div>
            </div>
          ) : (
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
          )}

          {isEdit && !doctorScoped ? (
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Assigned Physician
              </label>
              <div className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface text-text-primary">
                {editAppointment?.doctor?.name ?? 'Unassigned'}
              </div>
            </div>
          ) : (
            !doctorScoped && (
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
            )
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
              {isEdit ? 'Save Changes' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div></ModalPortal>
  );
}
