import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/auth';
import { staffApi } from '../lib/staff';
import { statsByRole } from '../lib/constants';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';
import type { Clinic } from '../types';
import { Plus, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../lib/dashboard';
import { useApiQuery } from '../lib/useApiQuery';

// ─── Individual dashboard imports ───
import HRDashboard from './dashboards/HRDashboard';
import NurseDashboard from './dashboards/NurseDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import PharmacistDashboard from './dashboards/PharmacistDashboard';
import ReceptionistDashboard from './dashboards/ReceptionistDashboard';

// ─── Master Dashboard ───
function MasterDashboard() {
  const { clinic, clinics, refreshClinics, switchClinic } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Clinic | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data: apiStats } = useApiQuery(
    () => dashboardApi.getStats(clinic?.id ?? ''),
    { skip: !clinic?.id },
  );

  const { data: staffList } = useApiQuery(
    () => staffApi.list({ clinicId: clinic?.id }),
    { skip: !clinic?.id }
  );

  const stats = statsByRole.MASTER.map((s) => {
    if (s.id === 'stat-1') {
      const val = apiStats?.totalRevenue ? `$${Number(apiStats.totalRevenue).toLocaleString()}` : '$0';
      return { ...s, value: val, trend: undefined, subtitle: 'Total collections' };
    }
    if (s.id === 'stat-2') {
      const val = apiStats?.totalPatients ? apiStats.totalPatients.toLocaleString() : '0';
      return { ...s, value: val, trend: undefined, subtitle: 'Registered patients' };
    }
    if (s.id === 'stat-3') {
      const count = staffList ? staffList.length : 0;
      return { ...s, value: String(count), trend: undefined, subtitle: 'Across all locations' };
    }
    if (s.id === 'stat-4') {
      const low = apiStats?.lowStockItems ?? 0;
      return { ...s, value: String(low), trend: undefined, subtitle: 'Low-stock warnings' };
    }
    return s;
  });

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim()) return;
    setIsAdding(true);
    setAddError('');
    try {
      await authApi.createClinic({ name: newClinicName });
      setNewClinicName('');
      setIsAddModalOpen(false);
      await refreshClinics();
    } catch (err: any) {
      setAddError(err?.response?.data?.error?.message || err.message || 'Failed to create clinic');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClinic = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const wasActive = clinic?.id === deleteTarget.id;
      await authApi.deleteClinic(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmText('');
      await refreshClinics();
      if (wasActive) await switchClinic(null);
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error?.message || err.message || 'Failed to delete branch');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayClinics = clinics.map((c) => ({
    id: c.id,
    name: c.name,
    location: 'Main St.',
    branchManager: 'Not Assigned',
    status: 'ACTIVE' as const,
    staffCount: 0,
    patientCount: 0,
  }));

  const displayAppointmentTrends = {
    booked: Array(7).fill(0),
    completed: Array(7).fill(0),
    labels: ['Oct 5', 'Oct 10', 'Oct 15', 'Oct 22', 'Oct 24', 'Oct 25', 'Oct 30']
  };

  const displayClinicRevenues = clinics.map((c, i) => ({
    clinicName: c.name,
    revenue: 0,
    percentage: 0,
    color: ['#6fb3e0', '#8b93d9', '#14b8a6', '#f59e0b'][i % 4],
  }));

  const clinicColumns: Column<Clinic>[] = [
    {
      key: 'name', header: 'Clinic Name', render: (c) => (
        <span className="font-medium text-text-primary">{c.name}</span>
      )
    },
    { key: 'location', header: 'Location' },
    { key: 'branchManager', header: 'Branch Manager' },
    {
      key: 'status', header: 'Status', render: (c) => (
        <Badge variant={c.status === 'ACTIVE' ? 'success' : 'warning'}>{c.status === 'ACTIVE' ? 'Active' : c.status}</Badge>
      )
    },
    {
      key: 'actions', header: 'Actions', render: (c) => (
        <div className="flex gap-2">
          <button
            onClick={() => switchClinic(c as any)}
            className="text-xs font-medium text-text-secondary hover:text-primary-600 px-2.5 py-1 rounded-md border border-border hover:border-primary-300 transition-colors"
          >
            Manage Branch
          </button>
          <button
            onClick={() => switchClinic(c as any)}
            className="text-xs font-medium text-text-secondary hover:text-primary-600 px-2.5 py-1 rounded-md border border-border hover:border-primary-300 transition-colors"
          >
            View Reports
          </button>
          <button
            onClick={() => { setDeleteTarget(c as any); setDeleteConfirmText(''); setDeleteError(''); }}
            className="text-xs font-medium text-danger hover:text-danger/80 px-2.5 py-1 rounded-md border border-danger/30 hover:border-danger/50 transition-colors"
          >
            Delete Branch
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-text-primary">Organization Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Appointment Trends */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Appointment Trends (Last 30 Days)
          </h3>
          <div className="flex gap-4 mb-4">
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="w-3 h-0.5 bg-primary-600 rounded" /> Booked
            </span>
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="w-3 h-0.5 bg-primary-300 rounded" /> Completed
            </span>
          </div>
          {/* CSS-only chart approximation */}
          <div className="h-44 flex items-end gap-1 px-1">
            {displayAppointmentTrends.booked.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '140px' }}>
                  <div
                    className="flex-1 max-w-3 bg-gradient-to-t from-primary-600 to-primary-400 rounded-t transition-all duration-500"
                    style={{ height: `${(val / 32) * 100}%`, animationDelay: `${i * 0.1}s` }}
                  />
                  <div
                    className="flex-1 max-w-3 bg-gradient-to-t from-primary-200 to-primary-100 rounded-t transition-all duration-500"
                    style={{ height: `${(displayAppointmentTrends.completed[i] / 32) * 100}%`, animationDelay: `${i * 0.1 + 0.05}s` }}
                  />
                </div>
                <span className="text-[9px] text-text-muted whitespace-nowrap">
                  {displayAppointmentTrends.labels[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Revenue Breakdown by Clinic
          </h3>
          <div className="space-y-4">
            {displayClinicRevenues.length === 0 ? (
              <div className="text-xs text-text-muted py-10 text-center">
                No clinics configured. Click "Add New Clinic" to begin.
              </div>
            ) : (
              displayClinicRevenues.map((clinic) => (
                <div key={clinic.clinicName} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{clinic.clinicName}</span>
                    <span className="text-sm font-semibold text-text-primary">
                      ${(clinic.revenue / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="h-2.5 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${clinic.percentage}%`,
                        backgroundColor: clinic.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Clinics Table */}
      <DataTable<Clinic>
        title="Clinics Management"
        columns={clinicColumns}
        data={displayClinics}
        action={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Clinic
          </button>
        }
      />

      {/* Add Clinic Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-12 px-4 pb-12 overflow-y-auto">
          <div className="bg-surface-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl relative shrink-0">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary-500" />
              Add New Clinic
            </h3>
            {addError && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                {addError}
              </div>
            )}
            <form onSubmit={handleAddClinic} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Clinic Name
                </label>
                <input
                  type="text"
                  required
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                  placeholder="Apex Dental Clinic"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isAdding ? 'Adding...' : 'Create Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Branch confirmation modal — requires typing "delete" */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-12 px-4 pb-12 overflow-y-auto">
          <div className="bg-surface-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl relative shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-danger" />
              <h3 className="text-lg font-bold text-text-primary">Delete Branch</h3>
            </div>
            <p className="text-sm text-text-secondary mb-2">
              This will delete{' '}
              <span className="font-semibold text-text-primary">{deleteTarget.name}</span> and all of its
              associated data. This action cannot be undone.
            </p>
            <p className="text-sm text-text-secondary mb-4">
              Type <span className="font-mono font-semibold text-danger">delete</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete"
              autoFocus
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-danger/20 focus:border-danger/50 outline-none mb-4"
            />
            {deleteError && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); setDeleteError(''); }}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim() !== 'delete' || isDeleting}
                onClick={handleDeleteClinic}
                className="px-4 py-2 text-sm font-semibold text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Master Dashboard ───
function SubMasterDashboard() {
  const { clinic } = useAuth();
  const navigate = useNavigate();
  const { data: statsData } = useApiQuery(
    () => dashboardApi.getStats(clinic?.id ?? ''),
    { skip: !clinic?.id },
  );

  const stats = statsByRole.SUB_MASTER.map((s) => {
    if (s.id === 'stat-1') {
      const val = statsData?.totalRevenue ? `$${Number(statsData.totalRevenue).toLocaleString()}` : '$0';
      return { ...s, value: val };
    }
    if (s.id === 'stat-2') {
      const val = statsData?.totalPatients ? statsData.totalPatients.toLocaleString() : '0';
      return { ...s, value: val };
    }
    if (s.id === 'stat-3') {
      const onDuty = statsData?.staffOnDuty ?? 0;
      return { ...s, value: String(onDuty), subtitle: onDuty ? 'Clocked in today' : 'No staff assigned' };
    }
    if (s.id === 'stat-4') {
      const appts = statsData?.totalAppointmentsToday ?? 0;
      return { ...s, value: String(appts), subtitle: appts ? 'Scheduled today' : 'No appointments' };
    }
    return s;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Clinic Dashboard</h1>
        <span className="text-sm text-text-secondary">{clinic?.name || 'Clinic'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Manage Staff', desc: 'Add or edit staff members', color: 'from-primary-500 to-primary-700', to: '/staff' },
          { title: 'Inventory Check', desc: '9 items below threshold', color: 'from-amber-500 to-orange-600', to: '/inventory' },
          { title: 'View Reports', desc: 'Monthly performance report', color: 'from-blue-500 to-indigo-600', to: '/reports' },
        ].map((action) => (
          <button
            key={action.title}
            onClick={() => navigate(action.to)}
            className="bg-surface-card rounded-xl border border-border p-5 text-left hover:shadow-[var(--shadow-card-hover)] transition-all group cursor-pointer"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-sm`}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">{action.title}</h3>
            <p className="text-xs text-text-secondary">{action.desc}</p>
            <div className="flex items-center gap-1 text-xs text-primary-600 font-medium mt-3 group-hover:gap-2 transition-all">
              Go <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard Page (Role Router) ───
export default function DashboardPage() {
  const { role } = useRole();
  const { clinic } = useAuth();

  const dashboards: Record<string, () => React.ReactElement> = {
    MASTER: () => clinic ? <SubMasterDashboard /> : <MasterDashboard />,
    SUB_MASTER: SubMasterDashboard,
    DOCTOR: DoctorDashboard,
    NURSE: NurseDashboard,
    PHARMACIST: PharmacistDashboard,
    RECEPTIONIST: ReceptionistDashboard,
    HR: HRDashboard,
  };

  const Dashboard = dashboards[role] || MasterDashboard;

  return <Dashboard />;
}
