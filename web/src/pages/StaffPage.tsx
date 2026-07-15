import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember, type StaffInvite } from '../lib/staff';
import { DEFAULT_DEPARTMENTS } from '../lib/constants';
import {
  UserPlus, Mail, Phone, UserMinus, Search, Copy, Check, Loader2,
  Users, RefreshCw, AlertTriangle, ShieldCheck, XCircle, UserCheck
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import DataTable, { type Column } from '../components/ui/DataTable';

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

export default function StaffPage() {
  const { user, clinic, organization } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'invites'>('active');
  
  // Data State
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('DOCTOR');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Direct-add modal state (non-clinical staff, no login)
  const [isDirectAddOpen, setIsDirectAddOpen] = useState(false);
  const [directName, setDirectName] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directRole, setDirectRole] = useState<string>('SUPPORT');
  const [directDepartment, setDirectDepartment] = useState<string>('Security');
  const [directCustomDept, setDirectCustomDept] = useState('');
  const [directSalary, setDirectSalary] = useState('');
  const [directAdding, setDirectAdding] = useState(false);
  const [directError, setDirectError] = useState('');

  // Load Data
  const loadData = async () => {
    if (!clinic?.id) {
      setStaff([]);
      setInvites([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const staffList = await staffApi.list({ clinicId: clinic.id });
      const invitesList = await staffApi.listInvites({ clinicId: clinic.id });
      setStaff(staffList);
      setInvites(invitesList);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to fetch staff data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinic?.id]);

  // Handle Invite
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) {
      setError('Please select a clinic first.');
      return;
    }
    if (!inviteEmail && !invitePhone) {
      setError('Please provide either an email address or a phone number.');
      return;
    }
    
    setInviting(true);
    setError('');
    setInviteSuccess(null);

    try {
      const result = await staffApi.invite({
        orgId: organization?.id || '',
        clinicId: clinic.id,
        email: inviteEmail || undefined,
        phone: invitePhone || undefined,
        role: inviteRole as any
      });
      setInviteEmail('');
      setInvitePhone('');
      setInviteSuccess(result);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Handle Direct Add (non-clinical staff → ACTIVE, no login)
  const handleDirectAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) {
      setDirectError('Please select a clinic first.');
      return;
    }
    if (!directName.trim()) {
      setDirectError('Please enter a name.');
      return;
    }

    setDirectAdding(true);
    setDirectError('');
    try {
      await staffApi.directAdd({
        clinicId: clinic.id,
        name: directName.trim(),
        email: directEmail.trim() || undefined,
        phone: directPhone.trim() || undefined,
        role: directRole as any,
        department:
          directDepartment === '__custom__' ? directCustomDept.trim() || undefined : directDepartment || undefined,
        salary: directSalary ? Number(directSalary) : undefined,
      });
      setDirectName('');
      setDirectEmail('');
      setDirectPhone('');
      setDirectRole('SUPPORT');
      setDirectDepartment('Security');
      setDirectCustomDept('');
      setDirectSalary('');
      setIsDirectAddOpen(false);
      await loadData();
    } catch (err: any) {
      setDirectError(err?.response?.data?.error?.message || err.message || 'Failed to add staff member');
    } finally {
      setDirectAdding(false);
    }
  };

  // Handle Deactivate
  const handleDeactivate = async (userId: string) => {
    if (!clinic?.id) return;
    if (!window.confirm('Are you sure you want to remove/deactivate this staff member?')) return;
    try {
      await staffApi.deactivate(userId, clinic.id);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err.message || 'Failed to deactivate staff member');
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!window.confirm('Cancel this pending invitation? The invite link will no longer work.')) return;
    try {
      await staffApi.cancelInvite(inviteId);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err.message || 'Failed to cancel invitation');
    }
  };

  // Filtering
  const filteredStaff = staff.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      (member.email && member.email.toLowerCase().includes(query)) ||
      (member.phone && member.phone.includes(query))
    );
  });

  const filteredInvites = invites.filter((invite) => {
    const query = searchQuery.toLowerCase();
    return (
      (invite.email && invite.email.toLowerCase().includes(query)) ||
      (invite.phone && invite.phone.includes(query))
    );
  });

  const staffColumns: Column<StaffMember>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {item.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              {item.name}
              {item.isOrgOwner && (
                <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full border border-red-200 font-medium">Owner</span>
              )}
              {item.clinicRoles?.some(r => r.role === 'SUPPORT') && (() => {
                const dept = item.clinicRoles.find(r => r.clinicId === clinic?.id)?.department;
                return dept ? (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200 font-medium">{dept}</span>
                ) : null;
              })()}
            </div>
            <div className="text-xs text-text-muted">Joined {new Date(item.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (item) => (
        <div className="space-y-1">
          {item.email && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Mail className="w-3.5 h-3.5" />
              <span>{item.email}</span>
            </div>
          )}
          {item.phone && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Phone className="w-3.5 h-3.5" />
              <span>{item.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role & Clinic',
      render: (item) => {
        const roleObj = item.clinicRoles?.find(r => !clinic?.id || r.clinicId === clinic?.id);
        const role = roleObj?.role || (item.isOrgOwner ? 'MASTER' : 'STAFF');
        const clinicName = roleObj?.clinicName || clinic?.name || 'All Clinics';
        return (
          <div className="space-y-1">
            <Badge variant={ROLE_COLORS[role] || 'neutral'}>
              {ROLE_LABELS[role] || role}
            </Badge>
            <div className="text-xs text-text-muted">{clinicName}</div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => {
        if (item.isOrgOwner || item.id === user?.id) return null;
        return (
          <button
            onClick={() => handleDeactivate(item.id)}
            className="flex items-center gap-1 text-xs font-semibold text-danger hover:bg-red-50 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
          >
            <UserMinus className="w-3.5 h-3.5" />
            Remove
          </button>
        );
      },
    },
  ];

  const inviteColumns: Column<StaffInvite>[] = [
    {
      key: 'recipient',
      header: 'Recipient',
      render: (item) => (
        <div className="space-y-1">
          {item.email && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <Mail className="w-3.5 h-3.5 text-text-secondary" />
              <span>{item.email}</span>
            </div>
          )}
          {item.phone && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Phone className="w-3.5 h-3.5" />
              <span>{item.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (item) => (
        <div className="space-y-1">
          <Badge variant={ROLE_COLORS[item.role] || 'neutral'}>
            {ROLE_LABELS[item.role] || item.role}
          </Badge>
          <div className="text-xs text-text-muted">{item.clinicName}</div>
        </div>
      ),
    },
    {
      key: 'token',
      header: 'Invitation Token',
      render: (item) => (
        <div className="flex items-center gap-2">
          <code className="text-xs px-2 py-1 bg-surface border border-border rounded font-mono text-text-secondary max-w-[150px] truncate select-all">
            {item.token}
          </code>
          <button
            onClick={() => handleCopyToken(item.token)}
            title="Copy invitation token"
            className="p-1 hover:bg-surface border border-border rounded text-text-secondary hover:text-primary-600 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge variant={item.status === 'pending' ? 'warning' : item.status === 'accepted' ? 'success' : 'neutral'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Sent Date',
      render: (item) => (
        <span className="text-xs text-text-secondary">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        item.status === 'pending' ? (
          <button
            onClick={() => handleCancelInvite(item.id)}
            className="flex items-center gap-1 text-xs font-semibold text-danger hover:bg-red-50 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel
          </button>
        ) : (
          <span className="text-xs text-text-muted italic">—</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Users className="w-5.5 h-5.5 text-primary-500" />
            Staff Management
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Manage your clinic's medical staff, adjust their roles, and invite new members.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2 border border-border rounded-lg bg-surface-card hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setInviteSuccess(null);
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Invite Staff Member
          </button>
          <button
            onClick={() => { setDirectError(''); setIsDirectAddOpen(true); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            Add Staff Directly
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Active Staff ({filteredStaff.length})
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'invites'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Pending Invitations ({filteredInvites.length})
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter staff by name or email..."
          className="w-full text-xs border border-border rounded-lg pl-9 pr-4 py-2.5 bg-surface-card text-text-primary outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/10 transition-colors"
        />
      </div>

      {/* Tables container */}
      {loading && staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-xs text-text-muted">Loading staff list...</span>
        </div>
      ) : activeTab === 'active' ? (
        <DataTable<StaffMember>
          columns={staffColumns}
          data={filteredStaff}
        />
      ) : (
        <DataTable<StaffInvite>
          columns={inviteColumns}
          data={filteredInvites}
        />
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-surface-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-500" />
              Invite Staff Member
            </h3>

            {inviteSuccess ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-semibold">Invitation Created Successfully!</div>
                    <p className="text-xs text-emerald-600 mt-1">
                      In the development environment, you can copy the invitation token below to register the staff member.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 p-3.5 bg-surface border border-border rounded-xl">
                  <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                    Invitation Token
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm font-mono text-primary-700 bg-primary-50 px-2 py-1 rounded truncate flex-1">
                      {inviteSuccess.token}
                    </code>
                    <button
                      onClick={() => handleCopyToken(inviteSuccess.token)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-border hover:bg-surface rounded-lg text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-text-secondary p-3 bg-surface border border-border border-dashed rounded-lg">
                  <span className="font-bold text-text-primary">How to register:</span> Submit a POST request to 
                  <code className="bg-surface px-1.5 py-0.5 rounded text-[11px] font-mono ml-1 text-danger">
                    /api/v1/staff/accept
                  </code> 
                  with the fields: <code className="bg-surface px-1 rounded text-[11px] font-mono">token</code>, 
                  <code className="bg-surface px-1 rounded text-[11px] font-mono">name</code>, and 
                  <code className="bg-surface px-1 rounded text-[11px] font-mono">password</code>.
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteSuccess(null);
                    }}
                    className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg cursor-pointer transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="doctor@clinic.com"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                    Phone Number (optional)
                  </label>
                  <input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="+91 90000 00001"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                    Staff Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="NURSE">Nurse</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="HR">HR / Administrator</option>
                    <option value="SUB_MASTER">Branch Manager</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {inviting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{inviting ? 'Inviting...' : 'Send Invitation'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Direct Add Modal — non-clinical staff, no invite/login */}
      {isDirectAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-surface-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              Add Staff Directly
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Support staff (cleaners, security, lab techs, accountants, etc.) are added as active roster members
              with no login. Receptionist and HR are still added via "Invite Staff Member".
            </p>

            {directError && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{directError}</span>
              </div>
            )}

            <form onSubmit={handleDirectAdd} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Staff Role
                </label>
                <select
                  value={directRole}
                  onChange={(e) => setDirectRole(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                >
                  <option value="SUPPORT">Support Staff</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Department
                </label>
                <select
                  value={directDepartment}
                  onChange={(e) => setDirectDepartment(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                >
                  {DEFAULT_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="__custom__">+ Custom department…</option>
                </select>
                {directDepartment === '__custom__' && (
                  <input
                    type="text"
                    value={directCustomDept}
                    onChange={(e) => setDirectCustomDept(e.target.value)}
                    placeholder="e.g. Canteen"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2.5 mt-2 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Monthly Salary
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={directSalary}
                  onChange={(e) => setDirectSalary(e.target.value)}
                  placeholder="Used for payroll (optional)"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                  placeholder="jane@clinic.com"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={directPhone}
                  onChange={(e) => setDirectPhone(e.target.value)}
                  placeholder="+91 90000 00001"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDirectAddOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directAdding}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {directAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{directAdding ? 'Adding...' : 'Add Staff'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
