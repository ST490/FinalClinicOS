import { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Plus, Trash2, Loader2, AlertTriangle, CalendarClock } from 'lucide-react';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember } from '../lib/staff';
import {
  credentialsApi,
  CREDENTIAL_TYPES,
  CREDENTIAL_LABELS,
  expiryTier,
  daysUntil,
  type StaffCredential,
  type CredentialType,
} from '../lib/credentials';
import { exportExcel } from '../lib/excel';

const TIER_VARIANT: Record<string, 'danger' | 'warning' | 'success' | 'neutral'> = {
  expired: 'danger',
  soon: 'warning',
  ok: 'success',
  none: 'neutral',
};

const TIER_LABEL: Record<string, string> = {
  expired: 'Expired',
  soon: 'Expiring ≤90d',
  ok: 'Valid',
  none: 'No expiry',
};

export default function CredentialsPage() {
  const { clinic, organization } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [creds, setCreds] = useState<StaffCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<CredentialType>('LICENSE');
  const [number, setNumber] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const loadCreds = async () => {
    if (!clinic?.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await credentialsApi.list({ clinicId: clinic.id });
      setCreds(data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinic?.id) {
      staffApi.list({ clinicId: clinic.id }).then(setStaff).catch(() => {});
      loadCreds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id]);

  const filtered = useMemo(() => {
    return creds.filter((c) => {
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      if (tierFilter !== 'ALL' && expiryTier(c.expiresAt) !== tierFilter) return false;
      return true;
    });
  }, [creds, typeFilter, tierFilter]);

  const expiringCount = useMemo(
    () => creds.filter((c) => {
      const t = expiryTier(c.expiresAt);
      return t === 'expired' || t === 'soon';
    }).length,
    [creds],
  );

  const columns: Column<StaffCredential>[] = [
    {
      key: 'worker',
      header: 'Worker',
      render: (c) => {
        const s = staff.find((m) => m.id === c.userId);
        return <span className="font-medium text-text-primary">{s?.name ?? c.userId.slice(0, 8)}</span>;
      },
    },
    {
      key: 'type',
      header: 'Credential',
      render: (c) => <Badge variant="info">{CREDENTIAL_LABELS[c.type]}</Badge>,
    },
    { key: 'number', header: 'Number', render: (c) => <span className="text-text-secondary">{c.number ?? '—'}</span> },
    {
      key: 'issuedAt',
      header: 'Issued',
      render: (c) => <span className="text-xs text-text-muted">{c.issuedAt?.slice(0, 10) ?? '—'}</span>,
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (c) => {
        const d = daysUntil(c.expiresAt);
        return (
          <span className="text-xs text-text-secondary">
            {c.expiresAt?.slice(0, 10) ?? '—'}
            {d != null && <span className="ml-1 text-text-muted">({d >= 0 ? `${d}d` : `${Math.abs(d)}d ago`})</span>}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => {
        const t = expiryTier(c.expiresAt);
        return <Badge variant={TIER_VARIANT[t]}>{TIER_LABEL[t]}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <button
          onClick={async () => {
            if (!clinic?.id || !organization?.id) return;
            if (!confirm(`Delete ${CREDENTIAL_LABELS[c.type]} for this staff member?`)) return;
            try {
              await credentialsApi.delete(c.id, clinic.id, organization.id);
              loadCreds();
            } catch {
              /* no-op */
            }
          }}
          className="text-danger hover:bg-danger/10 p-1.5 rounded-lg transition-colors"
          aria-label="Delete credential"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  const handleAdd = async () => {
    if (!clinic?.id || !organization?.id || !userId) {
      setError('Select a staff member.');
      return;
    }
    setError('');
    try {
      await credentialsApi.create({
        clinicId: clinic.id,
        orgId: organization.id,
        userId,
        type,
        number: number || undefined,
        issuedAt: issuedAt || undefined,
        expiresAt: expiresAt || undefined,
      });
      setShowAdd(false);
      setNumber(''); setIssuedAt(''); setExpiresAt(''); setUserId('');
      await loadCreds();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to add credential.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <ShieldCheck className="w-5.5 h-5.5 text-primary-500" />
          Clinical Credentials
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Track licenses, DEA, board credentials, CME and vaccinations. Expiry alerts fire at 90 days.
        </p>
      </div>

      {expiringCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{expiringCount} credential{expiringCount > 1 ? 's are' : ' is'} expired or expiring within 90 days.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 bg-surface-card border border-border rounded-xl p-4">
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t} value={t}>{CREDENTIAL_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Status</label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            <option value="expired">Expired</option>
            <option value="soon">Expiring ≤90d</option>
            <option value="ok">Valid</option>
            <option value="none">No expiry</option>
          </select>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Credential
        </button>
        <button
          onClick={() => exportExcel(filtered.map((c) => ({
            Worker: staff.find((m) => m.id === c.userId)?.name ?? c.userId,
            Type: CREDENTIAL_LABELS[c.type],
            Number: c.number ?? '',
            Issued: c.issuedAt?.slice(0, 10) ?? '',
            Expires: c.expiresAt?.slice(0, 10) ?? '',
            Status: TIER_LABEL[expiryTier(c.expiresAt)],
          })), 'credentials.xlsx', 'Credentials')}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors"
        >
          Export
        </button>
      </div>

      {showAdd && (
        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <CalendarClock className="w-4 h-4" /> New Credential
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Staff Member</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
              >
                <option value="">Select…</option>
                {staff.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CredentialType)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
              >
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t} value={t}>{CREDENTIAL_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Number</label>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. LIC-12345"
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Issued</label>
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Expires</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-2 text-xs font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-2 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading credentials…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-text-muted">No credentials match the current filters.</div>
      ) : (
        <DataTable<StaffCredential> columns={columns} data={filtered} />
      )}
    </div>
  );
}
