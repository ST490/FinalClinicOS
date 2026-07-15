import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember } from '../lib/staff';
import { DEFAULT_DEPARTMENTS } from '../lib/constants';
import {
  Users, Search, Loader2, Mail, Phone, AlertTriangle, Crown, Star,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';

type RoleFilter = 'ALL' | string;
type StatusFilter = 'ALL' | 'ACTIVE' | 'DISABLED' | 'PENDING';

const ROLE_LABELS: Record<string, string> = {
  MASTER: 'CEO / Admin',
  SUB_MASTER: 'Branch Manager',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  PHARMACIST: 'Pharmacist',
  RECEPTIONIST: 'Receptionist',
  HR: 'Human Resources',
  SUPPORT: 'Support Staff',
};

const ROLE_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  MASTER: 'danger',
  SUB_MASTER: 'warning',
  DOCTOR: 'info',
  NURSE: 'success',
  PHARMACIST: 'neutral',
  RECEPTIONIST: 'neutral',
  HR: 'neutral',
  SUPPORT: 'neutral',
};

const STATUS_COLORS: Record<string, 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  DISABLED: 'danger',
  PENDING: 'warning',
};

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export default function StaffDirectoryPage() {
  const { clinic } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Resolve the role/department/status for the current clinic context.
  const primaryRoleFor = (m: StaffMember) => {
    const role = m.clinicRoles?.find((r) => r.clinicId === clinic?.id) || m.clinicRoles?.[0];
    return role;
  };

  const loadData = async () => {
    if (!clinic?.id) {
      setStaff([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await staffApi.list({ clinicId: clinic.id });
      setStaff(list);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to fetch staff directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id]);

  // Department options come from defaults + any present in the data.
  const departmentOptions = useMemo(() => {
    const fromData = Array.from(new Set(
      staff
        .map((m) => primaryRoleFor(m)?.department)
        .filter(Boolean) as string[],
    ));
    return Array.from(new Set([...DEFAULT_DEPARTMENTS, ...fromData]));
  }, [staff]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staff.filter((m) => {
      const role = primaryRoleFor(m);
      if (roleFilter !== 'ALL' && role?.role !== roleFilter) return false;
      if (departmentFilter !== 'ALL' && (role?.department ?? '') !== departmentFilter) return false;
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (q && !`${m.name} ${m.email ?? ''} ${m.phone ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [staff, searchQuery, roleFilter, departmentFilter, statusFilter]);

  const columns: Column<StaffMember>[] = [
    {
      key: 'name',
      header: 'Staff',
      render: (m) => {
        const role = primaryRoleFor(m);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
              {initials(m.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-medium text-text-primary">
                <span className="truncate">{m.name}</span>
                {m.isOrgOwner && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                {role?.isPrimary && <Star className="w-3.5 h-3.5 text-sky-500" />}
              </div>
              <div className="text-xs text-text-muted truncate">{m.email ?? m.phone ?? 'No contact'}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (m) => {
        const role = primaryRoleFor(m);
        return role ? <Badge variant={ROLE_COLORS[role.role] ?? 'neutral'}>{ROLE_LABELS[role.role] ?? role.role}</Badge> : <span className="text-xs text-text-muted">—</span>;
      },
    },
    {
      key: 'department',
      header: 'Department',
      render: (m) => {
        const dept = primaryRoleFor(m)?.department;
        return dept ? (
          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200">
            {dept}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => <Badge variant={STATUS_COLORS[m.status] ?? 'neutral'}>{m.status}</Badge>,
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (m) => (
        <div className="flex flex-col gap-0.5 text-xs text-text-secondary">
          {m.email && (
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</span>
          )}
          {m.phone && (
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>
          )}
          {!m.email && !m.phone && <span className="text-text-muted">—</span>}
        </div>
      ),
    },
  ];

  const roleOptions = useMemo(() => {
    const present = Array.from(new Set(staff.map((m) => primaryRoleFor(m)?.role).filter(Boolean) as string[]));
    return present;
  }, [staff]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Users className="w-5.5 h-5.5 text-primary-500" />
          Staff Directory
        </h1>
        <p className="text-xs text-text-secondary mt-1">Search and filter everyone at this clinic. Add or manage staff in Staff.</p>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-surface-card border border-border rounded-xl p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, email or phone…"
              className="w-full text-sm border border-border rounded-lg pl-9 pr-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Department</label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/10"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading directory…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-text-muted">No staff match the current filters.</div>
      ) : (
        <DataTable<StaffMember> columns={columns} data={filtered} />
      )}
    </div>
  );
}
