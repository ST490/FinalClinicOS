import React, { useState, useMemo } from 'react';
import { CreditCard, Filter, Plus, Search, Landmark, Check, AlertCircle, TrendingUp, Receipt } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { billingApi } from '../lib/billing';
import { patientApi } from '../lib/patients';
import { useApiQuery, apiMutate } from '../lib/useApiQuery';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import ErrorBanner from '../components/ui/ErrorBanner';

interface DueInvoice {
  id: string;
  patientName: string;
  amount: number;
  date: string;
  clinicName: string;
  status: 'PAID' | 'UNPAID';
}

export default function DuesPage() {
  const { clinic: authClinic, clinics } = useAuth();
  const [refetchKey, setRefetchKey] = useState(0);

  // Fetch from API
  const { data: apiData, loading, error: fetchError, refetch } = useApiQuery(
    () => billingApi.list({ clinicId: authClinic?.id, limit: 200 }),
    { skip: !authClinic?.id, deps: [refetchKey] },
  );

  // Map API data
  const initialDues: DueInvoice[] = useMemo(() => {
    if (!apiData?.data) return [];
    return apiData.data.map((d) => {
      const dateStr = d.createdAt
        ? `${new Date(d.createdAt).toLocaleDateString()} ${new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : '';
      return {
        id: d.id,
        patientName: d.patientName || 'Unknown Patient',
        amount: parseFloat(d.amountDue) || 0,
        date: dateStr,
        clinicName: authClinic?.name || 'Clinic',
        status: (d.status === 'PAID' ? 'PAID' : 'UNPAID') as 'PAID' | 'UNPAID',
      };
    });
  }, [apiData, authClinic]);

  const [duesList, setDuesList] = useState<DueInvoice[]>([]);
  React.useEffect(() => { setDuesList(initialDues); }, [initialDues]);

  // Fetch real patients list
  const { data: realPatients } = useApiQuery(
    () => patientApi.list({ limit: 200 }),
    { skip: !authClinic?.id }
  );

  // Filters State
  const [clinicFilter, setClinicFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState('');
  const [newClinic, setNewClinic] = useState(clinics[0]?.name ?? '');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Synchronize newPatient state with first real patient when modal opens or patients load
  React.useEffect(() => {
    if (realPatients?.data && realPatients.data.length > 0) {
      setNewPatient(realPatients.data[0].id);
    }
  }, [realPatients, isModalOpen]);

  const handleMarkAsPaid = async (id: string) => {
    // Real API
    const { error: apiErr } = await apiMutate(() =>
      billingApi.recordPayment(id, { amount: duesList.find(d => d.id === id)?.amount || 0, paymentMethod: 'CASH' }),
    );
    if (!apiErr) {
      setDuesList(prev => prev.map(due => (due.id === id ? { ...due, status: 'PAID' } : due)));
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    // Real API
    if (!newPatient) {
      setError('Please select a patient. Register a patient first if the list is empty.');
      return;
    }

    // Combine selected date (newDate is "YYYY-MM-DD") with current local time to get a timezone-safe ISO string
    let billingDateTime = new Date().toISOString();
    if (newDate) {
      const [year, month, day] = newDate.split('-').map(Number);
      const selected = new Date();
      selected.setFullYear(year, month - 1, day);
      billingDateTime = selected.toISOString();
    }

    setSaving(true);
    const { error: apiErr } = await apiMutate(() =>
      billingApi.create({
        clinicId: authClinic?.id || '',
        patientId: newPatient,
        totalAmount: parsedAmount,
        createdAt: billingDateTime,
      }),
    );
    setSaving(false);
    if (apiErr) { setError(apiErr); return; }
    setNewAmount('');
    setIsModalOpen(false);
    setRefetchKey(k => k + 1);
  };

  // Filter application logic
  const filteredDues = duesList.filter(item => {
    const matchesSearch = item.patientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClinic = clinicFilter === 'ALL' || item.clinicName === clinicFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    let matchesDate = true;
    if (dateFilter !== 'ALL') {
      const today = new Date();
      const itemDate = new Date(item.date);
      const diffTime = Math.abs(today.getTime() - itemDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === '7DAYS') {
        matchesDate = diffDays <= 7;
      } else if (dateFilter === '30DAYS') {
        matchesDate = diffDays <= 30;
      }
    }

    return matchesSearch && matchesClinic && matchesStatus && matchesDate;
  });

  // Calculate Metrics based on current lists
  const totalDuesUnpaid = filteredDues
    .filter(item => item.status === 'UNPAID')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalCollected = filteredDues
    .filter(item => item.status === 'PAID')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-5 animate-fade-in font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-600" />
            Billing & Dues Ledger
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Track multi-tenant patient outstanding balances, collected payments, and generate invoices.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Record New Invoice
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Outstanding Balance</p>
            <p className="text-2xl font-black text-danger mt-1">${totalDuesUnpaid.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-danger">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Collected Payments</p>
            <p className="text-2xl font-black text-success mt-1">${totalCollected.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-success">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Collection Ratio</p>
            <p className="text-2xl font-black text-primary-700 mt-1">
              {totalCollected + totalDuesUnpaid > 0
                ? `${Math.round((totalCollected / (totalCollected + totalDuesUnpaid)) * 100)}%`
                : '100%'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            <Landmark className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-surface-card rounded-xl border border-border p-4 shadow-sm space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Clinic filter */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1">Select Clinic</label>
            <select
              value={clinicFilter}
              onChange={(e) => setClinicFilter(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
            >
              <option value="ALL">All Clinics (All locations)</option>
              {clinics.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1">Payment Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
            >
              <option value="ALL">All Payments</option>
              <option value="UNPAID">Outstanding Dues Only</option>
              <option value="PAID">Paid Invoices Only</option>
            </select>
          </div>

          {/* Date filter */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1">Date Period</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
            >
              <option value="ALL">All Dates</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>

          {/* Search bar */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1">Search Patient</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Type patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-border rounded-lg pl-8 pr-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
        {fetchError && <ErrorBanner message={fetchError} onRetry={refetch} />}
        {loading ? (
          <div className="p-6">
            <TableSkeleton cols={6} rows={5} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Issue Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Clinic Branch</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Invoice Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredDues.length > 0 ? (
                  filteredDues.map((due) => (
                    <tr
                      key={due.id}
                      className={`hover:bg-surface/50 transition-colors ${due.status === 'UNPAID' ? 'bg-danger/[0.01]' : 'bg-success/[0.01]'
                        }`}
                    >
                      <td className="px-5 py-4 font-semibold text-text-primary">{due.patientName}</td>
                      <td className="px-5 py-4 text-text-secondary whitespace-nowrap">{due.date}</td>
                      <td className="px-5 py-4 text-text-secondary">{due.clinicName}</td>
                      <td className="px-5 py-4 font-bold text-text-primary">${due.amount.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <Badge variant={due.status === 'PAID' ? 'success' : 'warning'}>
                          {due.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {due.status === 'UNPAID' ? (
                            <button
                              onClick={() => handleMarkAsPaid(due.id)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-white bg-success hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Mark Paid
                            </button>
                          ) : (
                            <button
                              onClick={() => alert(`Billing verification: Invoice receipt requested for patient ${due.patientName}.`)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-text-primary bg-surface hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-border transition-colors cursor-pointer"
                            >
                              <Receipt className="w-3 h-3" /> Invoice Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-text-secondary">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Landmark className="w-8 h-8 text-text-muted" />
                        <p className="font-semibold text-sm">No ledger entries match your filter criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl border border-border max-w-md w-full p-6 animate-scale-in space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="text-base font-bold text-text-primary">Record New Invoice Entry</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError('');
                }}
                className="text-text-secondary hover:text-text-primary text-sm font-semibold p-1 hover:bg-surface rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-lg flex items-center gap-1.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Select Patient *</label>
                <select
                  value={newPatient}
                  onChange={(e) => setNewPatient(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
                >
                  {(realPatients?.data || []).length === 0 ? (
                    <option value="">No patients registered - please add one first</option>
                  ) : (
                    (realPatients?.data || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Select Clinic location *</label>
                <select
                  value={newClinic}
                  onChange={(e) => setNewClinic(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
                >
                  {clinics.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Due Amount ($) *</label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 150"
                  min="1"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Billing Date *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-200 py-2.5 rounded-lg border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Recording...' : 'Record Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
