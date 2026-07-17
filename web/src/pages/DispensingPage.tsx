import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  prescriptionApi,
  itemName,
  PRESCRIPTION_STATUS_LABELS,
  PRESCRIPTION_STATUS_BADGE,
  type Prescription,
  type PrescriptionStatus,
} from '../lib/prescriptions';
import { inventoryApi } from '../lib/inventory';
import { staffApi, type StaffMember } from '../lib/staff';
import { Pill, Loader2, CheckCircle2, Banknote, UserX, XCircle, PackageCheck } from 'lucide-react';

const FILTERS: (PrescriptionStatus | 'ALL')[] = ['ALL', 'ACTIVE', 'DISPENSED', 'PAID', 'NOT_ARRIVED', 'CANCELLED'];

function fmt(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function DispensingPage() {
  const { clinic } = useAuth();
  const [rxs, setRxs] = useState<Prescription[]>([]);
  const [filter, setFilter] = useState<PrescriptionStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [controlledItems, setControlledItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedSignatories, setSelectedSignatories] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchControlledAndStaff = async () => {
      if (!clinic) return;
      try {
        const [controlledRes, staffData] = await Promise.all([
          inventoryApi.list({ clinicId: clinic.id, regulatoryClass: 'CONTROLLED', limit: 1000 }),
          staffApi.list({ clinicId: clinic.id }),
        ]);
        setControlledItems(controlledRes.data || []);
        // Co-signers must have login credentials, so exclude SUPPORT role (who cannot log in)
        const eligibleStaff = (staffData || []).filter(s => 
          s.status === 'ACTIVE' && 
          s.clinicRoles?.some(r => r.role !== 'SUPPORT' && r.status === 'ACTIVE')
        );
        setStaffList(eligibleStaff);
      } catch (err) {
        console.error('Failed to load validation data', err);
      }
    };
    fetchControlledAndStaff();
  }, [clinic]);

  const isRxControlled = useCallback((rx: Prescription) => {
    return (rx.items ?? []).some(rxItem => 
      controlledItems.some(invItem => 
        (rxItem.medicineId && invItem.medicineId === rxItem.medicineId) ||
        (!rxItem.medicineId && invItem.customName?.toLowerCase() === rxItem.customName?.toLowerCase())
      )
    );
  }, [controlledItems]);

  const load = useCallback(async () => {
    if (!clinic) return;
    setLoading(true);
    setError('');
    try {
      const res = await prescriptionApi.list({
        clinicId: clinic.id,
        ...(filter !== 'ALL' ? { status: filter } : {}),
      });
      setRxs(res.data);
    } catch {
      setError('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [clinic, filter]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, fn: () => Promise<Prescription>, busy: string) {
    setBusyId(busy);
    setError('');
    try {
      const updated = await fn();
      setRxs(prev => prev.map(r => (r.id === id ? updated : r)));
    } catch {
      setError('Action failed — you may not have permission, or the prescription changed.');
    } finally {
      setBusyId(null);
    }
  }

  const counts = FILTERS.filter(f => f !== 'ALL').reduce((acc, f) => {
    acc[f] = rxs.filter(r => r.status === f).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5 animate-fade-in font-sans pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-primary-600" /> Dispensing Queue
        </h1>
        <button
          onClick={load}
          className="text-xs font-semibold text-text-secondary border border-border rounded-lg px-3 py-2 hover:bg-surface transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-surface-card text-text-secondary border-border hover:bg-surface'
            }`}
          >
            {f === 'ALL' ? 'All' : PRESCRIPTION_STATUS_LABELS[f]}
            {f !== 'ALL' && (
              <span className="ml-1.5 opacity-70">{counts[f] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : rxs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-xl text-text-secondary">
          <Pill className="w-8 h-8 mx-auto text-text-muted" />
          <p className="text-xs font-semibold mt-2">No prescriptions {filter !== 'ALL' ? `with status "${PRESCRIPTION_STATUS_LABELS[filter]}"` : 'yet'}</p>
          <p className="text-[11px] mt-1">Doctor-written prescriptions appear here automatically.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rxs.map(rx => (
            <div key={rx.id} className="bg-surface-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {rx.patient?.name ?? 'Unknown patient'}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Dr. {rx.doctor?.name ?? '—'} · {fmt(rx.createdAt)}
                  </p>
                  {rx.notes && (
                    <p className="text-[11px] text-text-muted mt-1 italic truncate">{rx.notes}</p>
                  )}
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${PRESCRIPTION_STATUS_BADGE[rx.status]}`}>
                  {PRESCRIPTION_STATUS_LABELS[rx.status]}
                </span>
              </div>

              {/* Items */}
              <div className="mt-3 space-y-1.5">
                {rx.items?.map(it => (
                  <div key={it.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-primary truncate">
                      {itemName(it)}
                      {it.dosage ? ` · ${it.dosage}` : ''}
                      {it.frequency ? ` · ${it.frequency}` : ''}
                    </span>
                    <span className="text-text-muted shrink-0 ml-2">
                      ×{it.quantity}
                      {it.dispensed && (
                        <span className="ml-1.5 text-green-600 font-semibold inline-flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> given
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {(rx.status === 'ACTIVE' || rx.status === 'NOT_ARRIVED') && isRxControlled(rx) && (
                  <div className="w-full flex flex-col gap-1 mb-2">
                    <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400">Co-Signer Required (Controlled Drug)</label>
                    <select
                      value={selectedSignatories[rx.id] || ''}
                      onChange={(e) => setSelectedSignatories(prev => ({ ...prev, [rx.id]: e.target.value }))}
                      className="text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-1 focus:ring-primary-500 outline-none max-w-xs"
                    >
                      <option value="">-- Select Co-Signer --</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(rx.status === 'ACTIVE' || rx.status === 'NOT_ARRIVED') && (
                  <button
                    disabled={busyId === rx.id}
                    onClick={() => {
                      const requiresSignatory = isRxControlled(rx);
                      const signatoryId = selectedSignatories[rx.id];
                      if (requiresSignatory && !signatoryId) {
                        setError('A co-signer (second signatory) is required to dispense controlled medications.');
                        return;
                      }
                      act(rx.id, () => prescriptionApi.dispense(rx.id, (rx.items ?? []).map(i => ({
                        prescriptionItemId: i.id,
                        quantity: i.quantity,
                      })), signatoryId), rx.id);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-2 rounded-lg"
                  >
                    {busyId === rx.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                    Dispense
                  </button>
                )}
                {(rx.status === 'ACTIVE' || rx.status === 'DISPENSED') && (
                  <button
                    disabled={busyId === rx.id}
                    onClick={() => act(rx.id, () => prescriptionApi.setStatus(rx.id, 'PAID'), rx.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-2 rounded-lg"
                  >
                    <Banknote className="w-3.5 h-3.5" /> Mark Paid
                  </button>
                )}
                {rx.status === 'ACTIVE' && (
                  <button
                    disabled={busyId === rx.id}
                    onClick={() => act(rx.id, () => prescriptionApi.setStatus(rx.id, 'NOT_ARRIVED'), rx.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-3 py-2 rounded-lg"
                  >
                    <UserX className="w-3.5 h-3.5" /> Not Arrived
                  </button>
                )}
                {rx.status !== 'CANCELLED' && rx.status !== 'PAID' && (
                  <button
                    disabled={busyId === rx.id}
                    onClick={() => {
                      if (!confirm('Cancel this prescription?')) return;
                      act(rx.id, () => prescriptionApi.setStatus(rx.id, 'CANCELLED'), rx.id);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-danger border border-danger/30 hover:bg-danger/10 disabled:opacity-50 px-3 py-2 rounded-lg"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
