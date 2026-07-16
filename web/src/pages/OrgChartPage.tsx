import { useState, useEffect, useMemo } from 'react';
import { Network, Loader2, AlertTriangle, Crown, Star } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember } from '../lib/staff';

// Seniority tiers — the only hierarchy the data model exposes (no manager link yet).
// ponytail: true reports-to edges need a managerId field; this is a role-tier view until then.
const TIERS: { label: string; roles: string[] }[] = [
  { label: 'Ownership', roles: ['MASTER', 'SUB_MASTER'] },
  { label: 'Clinical & HR Leads', roles: ['DOCTOR', 'HR'] },
  { label: 'Care & Ops', roles: ['NURSE', 'PHARMACIST', 'RECEPTIONIST'] },
  { label: 'Support', roles: ['SUPPORT'] },
];

const ROLE_LABELS: Record<string, string> = {
  MASTER: 'Owner',
  SUB_MASTER: 'Branch Manager',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  PHARMACIST: 'Pharmacist',
  RECEPTIONIST: 'Receptionist',
  HR: 'HR',
  SUPPORT: 'Support',
};

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export default function OrgChartPage() {
  const { clinic } = useAuth();
  const clinicId = clinic?.id;
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    staffApi.list({ clinicId })
      .then(setStaff)
      .catch((err: any) => setError(err?.response?.data?.error?.message || err.message || 'Failed to load org chart.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const byTier = useMemo(() => {
    return TIERS.map((tier) => ({
      ...tier,
      members: staff.filter((m) => {
        const role = m.clinicRoles?.find((r) => r.clinicId === clinicId) ?? m.clinicRoles?.[0];
        return tier.roles.includes(role?.role ?? '');
      }),
    })).filter((t) => t.members.length > 0);
  }, [staff, clinicId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Network className="w-5.5 h-5.5 text-primary-500" />
          Org Chart
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Staff grouped by role seniority. Manager↔report links will replace this once a manager field is added.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading org chart…</span>
        </div>
      ) : byTier.length === 0 ? (
        <div className="text-center py-16 text-sm text-text-muted">No staff at this clinic yet.</div>
      ) : (
        <div className="space-y-6">
          {byTier.map((tier, i) => (
            <div key={tier.label} className="relative">
              {i > 0 && <div className="h-6 w-px bg-border mx-auto mb-2" />}
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 text-center">{tier.label}</div>
              <div className="flex flex-wrap justify-center gap-3">
                {tier.members.map((m) => {
                  const role = m.clinicRoles?.find((r) => r.clinicId === clinicId) ?? m.clinicRoles?.[0];
                  return (
                    <div key={m.id} className="w-44 bg-surface-card border border-border rounded-xl p-3 text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                        {initials(m.name)}
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-text-primary">
                        <span className="truncate">{m.name}</span>
                        {m.isOrgOwner && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                        {role?.isPrimary && <Star className="w-3 h-3 text-sky-500 shrink-0" />}
                      </div>
                      <div className="mt-1">
                        <Badge variant="neutral">{ROLE_LABELS[role?.role ?? ''] ?? role?.role ?? '—'}</Badge>
                      </div>
                      {role?.department && <div className="text-[10px] text-text-muted mt-1 truncate">{role.department}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
