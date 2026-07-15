import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember, type StaffSchedule } from '../lib/staff';
import { CalendarDays, Loader2, AlertTriangle, Pencil, Plus, RefreshCw } from 'lucide-react';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulingPage() {
  const { clinic } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Edit modal state
  const [editing, setEditing] = useState<{ userId: string; userName: string; dayOfWeek: number } | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState(30);
  const [editError, setEditError] = useState('');

  const load = async (silent = false) => {
    if (!clinic?.id) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const [st, sc] = await Promise.all([
        staffApi.list({ clinicId: clinic.id }),
        staffApi.schedules(clinic.id),
      ]);
      setStaff(st);
      setSchedules(sc);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load schedule');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (clinic?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => (!q ? true : s.name.toLowerCase().includes(q)));
  }, [staff, search]);

  // map[userId][dayOfWeek] -> schedule
  const grid = useMemo(() => {
    const m = new Map<string, StaffSchedule>();
    schedules.forEach((s) => m.set(`${s.userId}|${s.dayOfWeek}`, s));
    return m;
  }, [schedules]);

  const openEdit = (userId: string, userName: string, dayOfWeek: number) => {
    const existing = grid.get(`${userId}|${dayOfWeek}`);
    setEditing({ userId, userName, dayOfWeek });
    setStartTime(existing?.startTime ?? '09:00');
    setEndTime(existing?.endTime ?? '17:00');
    setSlotDuration(existing?.slotDuration ?? 30);
    setEditError('');
  };

  const saveCell = async () => {
    if (!clinic?.id || !editing) return;
    if (endTime <= startTime) { setEditError('End time must be after start time'); return; }
    setSaving(true);
    setEditError('');
    try {
      await staffApi.setSchedule({
        clinicId: clinic.id,
        userId: editing.userId,
        dayOfWeek: editing.dayOfWeek,
        startTime,
        endTime,
        slotDuration,
      });
      setEditing(null);
      await load(true);
    } catch (err: any) {
      setEditError(err?.response?.data?.error?.message || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <CalendarDays className="w-5.5 h-5.5 text-primary-500" />
            Staff Scheduling
          </h1>
          <p className="text-xs text-text-secondary mt-1">Weekly shift grid. Click a cell to set a staff member's hours for that weekday.</p>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 bg-surface-card border border-border rounded-xl p-4">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff"
            className="text-sm border border-border rounded-lg pl-3 pr-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10 w-48"
          />
        </div>
        <span className="text-xs text-text-muted">
          {staff.length} staff · {schedules.filter((s) => s.isActive).length} active shifts
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading schedule…</span>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-16 text-sm text-text-muted">No staff in this clinic.</div>
      ) : (
        <div className="bg-surface-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 720 }}>
            <thead>
              <tr className="bg-surface border-b border-border-light">
                <th className="px-4 py-3 text-left font-semibold text-text-secondary sticky left-0 bg-surface z-10">Staff</th>
                {DAYS.map((d) => (
                  <th key={d} className="px-3 py-3 text-center font-semibold text-text-secondary">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {filteredStaff.map((s) => (
                <tr key={s.id} className="hover:bg-surface/50">
                  <td className="px-4 py-2.5 sticky left-0 bg-surface-card z-10">
                    <div className="font-medium text-text-primary">{s.name}</div>
                    <div className="text-[10px] text-text-muted">
                      {s.clinicRoles.find((r) => r.clinicId === clinic?.id)?.department ?? s.clinicRoles[0]?.role}
                    </div>
                  </td>
                  {DAYS.map((_, dow) => {
                    const cell = grid.get(`${s.id}|${dow}`);
                    const active = cell?.isActive !== false;
                    return (
                      <td key={dow} className="px-2 py-2 text-center border-l border-border-light">
                        <button
                          onClick={() => openEdit(s.id, s.name, dow)}
                          className={`w-full min-w-[78px] rounded-lg px-2 py-2 text-xs border transition-colors cursor-pointer ${
                            cell && active
                              ? 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100'
                              : 'border-dashed border-border text-text-muted hover:border-primary-300 hover:text-primary-600'
                          }`}
                        >
                          {cell && active ? (
                            <span className="font-medium font-mono whitespace-nowrap">
                              {cell.startTime}–{cell.endTime}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Set</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-sm bg-surface-card border border-border rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text-primary mb-1">
              {DAYS[editing.dayOfWeek]} shift
            </h2>
            <p className="text-xs text-text-secondary mb-4">{editing.userName}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary">Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary">End</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-text-secondary">Slot duration (min)</label>
              <input type="number" min={5} step={5} value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value) || 30)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10" />
            </div>
            {editError && <div className="text-xs text-danger mt-2">{editError}</div>}
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setEditing(null)} className="text-xs font-semibold text-text-secondary border border-border hover:bg-surface px-3.5 py-2 rounded-lg cursor-pointer">Cancel</button>
              <button type="button" onClick={saveCell} disabled={saving} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg cursor-pointer disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
