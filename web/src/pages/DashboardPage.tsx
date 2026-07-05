import React from 'react';
import { useRole } from '../context/RoleContext';
import {
  statsByRole, clinicRevenues, appointmentTrends, mockClinics,
} from '../mockData';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';
import type { Clinic } from '../types';
import { Plus, ArrowRight, TrendingUp } from 'lucide-react';

// ─── Individual dashboard imports ───
import HRDashboard from './dashboards/HRDashboard';
import NurseDashboard from './dashboards/NurseDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import PharmacistDashboard from './dashboards/PharmacistDashboard';
import ReceptionistDashboard from './dashboards/ReceptionistDashboard';

// ─── Master Dashboard ───
function MasterDashboard() {
  const stats = statsByRole.MASTER;

  const clinicColumns: Column<Clinic>[] = [
    { key: 'name', header: 'Clinic Name', render: (c) => (
      <span className="font-medium text-text-primary">{c.name}</span>
    )},
    { key: 'location', header: 'Location' },
    { key: 'branchManager', header: 'Branch Manager' },
    { key: 'status', header: 'Status', render: (c) => (
      <Badge variant={c.status === 'ACTIVE' ? 'success' : 'warning'}>{c.status === 'ACTIVE' ? 'Active' : c.status}</Badge>
    )},
    { key: 'actions', header: 'Actions', render: () => (
      <div className="flex gap-2">
        <button className="text-xs font-medium text-text-secondary hover:text-primary-600 px-2.5 py-1 rounded-md border border-border hover:border-primary-300 transition-colors">
          Manage Branch
        </button>
        <button className="text-xs font-medium text-text-secondary hover:text-primary-600 px-2.5 py-1 rounded-md border border-border hover:border-primary-300 transition-colors">
          View Reports
        </button>
      </div>
    )},
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
            {appointmentTrends.booked.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '140px' }}>
                  <div
                    className="flex-1 max-w-3 bg-gradient-to-t from-primary-600 to-primary-400 rounded-t transition-all duration-500"
                    style={{ height: `${(val / 32) * 100}%`, animationDelay: `${i * 0.1}s` }}
                  />
                  <div
                    className="flex-1 max-w-3 bg-gradient-to-t from-primary-200 to-primary-100 rounded-t transition-all duration-500"
                    style={{ height: `${(appointmentTrends.completed[i] / 32) * 100}%`, animationDelay: `${i * 0.1 + 0.05}s` }}
                  />
                </div>
                <span className="text-[9px] text-text-muted whitespace-nowrap">
                  {appointmentTrends.labels[i]}
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
            {clinicRevenues.map((clinic) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Clinics Table */}
      <DataTable<Clinic>
        title="Clinics Management"
        columns={clinicColumns}
        data={mockClinics}
        action={
          <button className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            Add New Clinic
          </button>
        }
      />
    </div>
  );
}

// ─── Sub-Master Dashboard ───
function SubMasterDashboard() {
  const stats = statsByRole.SUB_MASTER;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Clinic Dashboard</h1>
        <span className="text-sm text-text-secondary">Downtown Specialty Clinic</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Manage Staff', desc: 'Add or edit staff members', color: 'from-primary-500 to-primary-700' },
          { title: 'Inventory Check', desc: '9 items below threshold', color: 'from-amber-500 to-orange-600' },
          { title: 'View Reports', desc: 'Monthly performance report', color: 'from-blue-500 to-indigo-600' },
        ].map((action) => (
          <button
            key={action.title}
            className="bg-surface-card rounded-xl border border-border p-5 text-left hover:shadow-[var(--shadow-card-hover)] transition-all group"
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

  const dashboards: Record<string, () => React.ReactElement> = {
    MASTER: MasterDashboard,
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
