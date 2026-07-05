import { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { 
  BarChart3, TrendingUp, Users, Package, Calendar, Lock, Globe, 
  Building2, HeartPulse, Clock, FileText, 
  ListOrdered, Pill, AlertTriangle, ShieldCheck, CheckCircle2, UserCheck
} from 'lucide-react';

const CLINICS = [
  'Downtown Specialty Clinic',
  'Westside Family Practice',
  'Northside Urgent Care',
  'East Valley Health',
];

// ────────────────────────────────────────────────────────
// 1. DATASETS FOR EACH ROLE
// ────────────────────────────────────────────────────────

const REPORTS_DATA = {
  MASTER: {
    revenue: '$450,780',
    revenueGrowth: '+14.2%',
    patientsSeen: '12,345',
    patientsGrowth: '+9.8%',
    avgTicket: '$52.10',
    ticketGrowth: '+3.5%',
    revenueMonthly: [
      { month: 'Jan', val: 380000, height: '50%' },
      { month: 'Feb', val: 410000, height: '65%' },
      { month: 'Mar', val: 395000, height: '60%' },
      { month: 'Apr', val: 450000, height: '82%' },
      { month: 'May', val: 425000, height: '75%' },
      { month: 'Jun', val: 450780, height: '90%' },
    ],
    patientTrends: [
      { day: 'Mon', scheduled: 180, walkin: 45, hSched: '75%', hWalk: '18%' },
      { day: 'Tue', scheduled: 165, walkin: 50, hSched: '68%', hWalk: '20%' },
      { day: 'Wed', scheduled: 210, walkin: 35, hSched: '88%', hWalk: '14%' },
      { day: 'Thu', scheduled: 155, walkin: 60, hSched: '64%', hWalk: '24%' },
      { day: 'Fri', scheduled: 190, walkin: 30, hSched: '78%', hWalk: '12%' },
    ],
    inventoryBreakdown: [
      { label: 'Dispensed Rx', pct: 58, color: 'bg-primary-600', val: '3,200 units' },
      { label: 'Restocked Items', pct: 35, color: 'bg-emerald-500', val: '1,950 units' },
      { label: 'Expired / Discarded', pct: 7, color: 'bg-danger', val: '380 units' },
    ],
  },
  SUB_MASTER: {
    revenue: '$38,420',
    revenueGrowth: '+5.3%',
    patientsSeen: '840',
    patientsGrowth: '+12.4%',
    avgTicket: '$45.70',
    ticketGrowth: '+1.2%',
    revenueMonthly: [
      { month: 'Jan', val: 28000, height: '55%' },
      { month: 'Feb', val: 31000, height: '62%' },
      { month: 'Mar', val: 29500, height: '58%' },
      { month: 'Apr', val: 35000, height: '78%' },
      { month: 'May', val: 32000, height: '70%' },
      { month: 'Jun', val: 38420, height: '90%' },
    ],
    patientTrends: [
      { day: 'Mon', scheduled: 42, walkin: 12, hSched: '70%', hWalk: '20%' },
      { day: 'Tue', scheduled: 38, walkin: 15, hSched: '64%', hWalk: '25%' },
      { day: 'Wed', scheduled: 48, walkin: 10, hSched: '80%', hWalk: '16%' },
      { day: 'Thu', scheduled: 35, walkin: 18, hSched: '58%', hWalk: '30%' },
      { day: 'Fri', scheduled: 44, walkin: 8, hSched: '73%', hWalk: '13%' },
    ],
    inventoryBreakdown: [
      { label: 'Dispensed Rx', pct: 65, color: 'bg-primary-600', val: '450 units' },
      { label: 'Restocked Items', pct: 25, color: 'bg-emerald-500', val: '170 units' },
      { label: 'Expired / Discarded', pct: 10, color: 'bg-danger', val: '70 units' },
    ],
  },
  DOCTOR: {
    totalConsultations: '234',
    consultationsGrowth: '+18.5%',
    avgDuration: '16.8 min',
    durationGrowth: '-4.2% (Faster)',
    rxRate: '88.5%',
    rxRateGrowth: '+2.1%',
    consultationsMonthly: [
      { month: 'Jan', val: 180, height: '50%' },
      { month: 'Feb', val: 195, height: '58%' },
      { month: 'Mar', val: 202, height: '62%' },
      { month: 'Apr', val: 220, height: '72%' },
      { month: 'May', val: 215, height: '68%' },
      { month: 'Jun', val: 234, height: '90%' },
    ],
    diagnosisTrends: [
      { day: 'Mon', chronic: 15, acute: 5, hChronic: '75%', hAcute: '25%' },
      { day: 'Tue', chronic: 12, acute: 8, hChronic: '60%', hAcute: '40%' },
      { day: 'Wed', chronic: 18, acute: 4, hChronic: '90%', hAcute: '20%' },
      { day: 'Thu', chronic: 10, acute: 10, hChronic: '50%', hAcute: '50%' },
      { day: 'Fri', chronic: 14, acute: 3, hChronic: '70%', hAcute: '15%' },
    ],
    outcomesBreakdown: [
      { label: 'Improved / Stable', pct: 82, color: 'bg-primary-600', val: '192 patients' },
      { label: 'Referred to Specialist', pct: 12, color: 'bg-emerald-500', val: '28 patients' },
      { label: 'Readmitted', pct: 6, color: 'bg-danger', val: '14 patients' },
    ],
  },
  NURSE: {
    totalIntakes: '382',
    intakesGrowth: '+10.4%',
    vitalsSuccess: '99.2%',
    vitalsGrowth: '+0.5%',
    pendingReminders: '4',
    remindersGrowth: '-50% (Cleared)',
    intakesWeekly: [
      { month: 'Mon', val: 24, height: '60%' },
      { month: 'Tue', val: 28, height: '72%' },
      { month: 'Wed', val: 32, height: '85%' },
      { month: 'Thu', val: 22, height: '55%' },
      { month: 'Fri', val: 35, height: '90%' },
    ],
    screeningBreakdown: [
      { day: 'Mon', routine: 18, urgent: 6, hRoutine: '75%', hUrgent: '25%' },
      { day: 'Tue', routine: 20, urgent: 8, hRoutine: '80%', hUrgent: '32%' },
      { day: 'Wed', routine: 25, urgent: 7, hRoutine: '95%', hUrgent: '28%' },
      { day: 'Thu', routine: 17, urgent: 5, hRoutine: '70%', hUrgent: '20%' },
      { day: 'Fri', routine: 30, urgent: 5, hRoutine: '98%', hUrgent: '20%' },
    ],
    tasksProgress: [
      { label: 'Intakes Completed', pct: 88, color: 'bg-primary-600', val: '336 cases' },
      { label: 'Pending Documentation', pct: 9, color: 'bg-emerald-500', val: '34 cases' },
      { label: 'Missed Follow-ups', pct: 3, color: 'bg-danger', val: '12 cases' },
    ],
  },
  PHARMACIST: {
    dispensedRx: '1,420',
    dispensedGrowth: '+15.2%',
    lowStockResolved: '14 Items',
    resolvedGrowth: '9 Left in Queue',
    expiryDisposed: '2 items',
    expiryGrowth: '-60% waste',
    dispensationMonthly: [
      { month: 'Jan', val: 950, height: '50%' },
      { month: 'Feb', val: 1100, height: '62%' },
      { month: 'Mar', val: 1050, height: '58%' },
      { month: 'Apr', val: 1250, height: '75%' },
      { month: 'May', val: 1300, height: '80%' },
      { month: 'Jun', val: 1420, height: '90%' },
    ],
    dispensedCategories: [
      { day: 'Mon', prescription: 40, otc: 12, hPresc: '80%', hOtc: '24%' },
      { day: 'Tue', prescription: 35, otc: 15, hPresc: '70%', hOtc: '30%' },
      { day: 'Wed', prescription: 45, otc: 10, hPresc: '90%', hOtc: '20%' },
      { day: 'Thu', prescription: 30, otc: 18, hPresc: '60%', hOtc: '36%' },
      { day: 'Fri', prescription: 38, otc: 8, hPresc: '76%', hOtc: '16%' },
    ],
    stockDeltaSummary: [
      { label: 'Dispensed Stock', pct: 72, color: 'bg-primary-600', val: '1,022 units' },
      { label: 'Restocked/Received', pct: 23, color: 'bg-emerald-500', val: '326 units' },
      { label: 'Expiry Discards', pct: 5, color: 'bg-danger', val: '72 units' },
    ],
  },
  RECEPTIONIST: {
    checkedIn: '640',
    checkedInGrowth: '+11.5%',
    avgWait: '11.8 min',
    waitGrowth: '-14% (Optimized)',
    cancellationRate: '4.2%',
    cancelGrowth: '-1.5% (Good)',
    checkinsMonthly: [
      { month: 'Jan', val: 420, height: '50%' },
      { month: 'Feb', val: 480, height: '62%' },
      { month: 'Mar', val: 510, height: '68%' },
      { month: 'Apr', val: 590, height: '82%' },
      { month: 'May', val: 570, height: '78%' },
      { month: 'Jun', val: 640, height: '90%' },
    ],
    patientFlowType: [
      { day: 'Mon', scheduled: 32, walkin: 14, hSched: '80%', hWalk: '35%' },
      { day: 'Tue', scheduled: 28, walkin: 16, hSched: '70%', hWalk: '40%' },
      { day: 'Wed', scheduled: 36, walkin: 12, hSched: '90%', hWalk: '30%' },
      { day: 'Thu', scheduled: 25, walkin: 20, hSched: '62%', hWalk: '50%' },
      { day: 'Fri', scheduled: 30, walkin: 8, hSched: '75%', hWalk: '20%' },
    ],
    flowCompleteness: [
      { label: 'Fully Intake Processed', pct: 85, color: 'bg-primary-600', val: '544 patients' },
      { label: 'Pending Dues Ledger', pct: 11, color: 'bg-emerald-500', val: '70 patients' },
      { label: 'No-Show / Cancelled', pct: 4, color: 'bg-danger', val: '26 patients' },
    ],
  },
  HR: {
    staffCount: '97',
    staffGrowth: '+5 new hires',
    attendance: '95.2%',
    attendanceGrowth: '+1.5%',
    leaveResolved: '94%',
    leaveGrowth: '4 Pending',
    attendanceWeekly: [
      { day: 'Mon', percentage: 95, height: '95%' },
      { day: 'Tue', percentage: 92, height: '92%' },
      { day: 'Wed', percentage: 97, height: '97%' },
      { day: 'Thu', percentage: 92, height: '92%' },
      { day: 'Fri', percentage: 93, height: '93%' },
    ],
    onboardingTrends: [
      { day: 'Mon', active: 8, offboarding: 2, hSched: '80%', hWalk: '20%' },
      { day: 'Tue', active: 9, offboarding: 1, hSched: '90%', hWalk: '10%' },
      { day: 'Wed', active: 7, offboarding: 3, hSched: '70%', hWalk: '30%' },
      { day: 'Thu', active: 9, offboarding: 2, hSched: '90%', hWalk: '20%' },
      { day: 'Fri', active: 10, offboarding: 1, hSched: '100%', hWalk: '10%' },
    ],
    payrollCompletion: [
      { label: 'Paid / Payroll Confirmed', pct: 93, color: 'bg-primary-600', val: '90 employees' },
      { label: 'Pending Leave Calculations', pct: 5, color: 'bg-emerald-500', val: '5 employees' },
      { label: 'On Hold / Dispute', pct: 2, color: 'bg-danger', val: '2 employees' },
    ],
  },
};

export default function ReportsPage() {
  const { role } = useRole();
  const isMaster = role === 'MASTER';
  const isSubMaster = role === 'SUB_MASTER';

  // Toggle viewScope for master between clinic or organization view
  const [viewScope, setViewScope] = useState<'CLINIC' | 'ORG'>(() => {
    return isMaster ? 'ORG' : 'CLINIC';
  });

  const [selectedClinic, setSelectedClinic] = useState(CLINICS[0]);
  const [dateRange, setDateRange] = useState('Month to Date');

  // Reset viewScope if role dynamically switches
  useEffect(() => {
    if (isMaster) {
      setViewScope('ORG');
    } else {
      setViewScope('CLINIC');
    }
  }, [role, isMaster]);

  // ────────────────────────────────────────────────────────
  // 2. RENDER APPROPRIATE MODULE ACCORDING TO ROLE
  // ────────────────────────────────────────────────────────

  // Master Dashboard OR Sub-Master Dashboard (Financial/Organizational money reports)
  if (isMaster || isSubMaster) {
    const data = viewScope === 'ORG' ? REPORTS_DATA.MASTER : REPORTS_DATA.SUB_MASTER;
    return (
      <div className="space-y-6 animate-fade-in font-sans pb-12">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Financial & Administration Intelligence
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Monitor clinics net revenues, average check-in billing, and organization logistics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Scope Select */}
            <div className="flex rounded-lg border border-border bg-surface p-1 shadow-sm">
              <button
                onClick={() => setViewScope('CLINIC')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  viewScope === 'CLINIC'
                    ? 'bg-surface-card text-primary-700 shadow-sm border border-border/20'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Clinic Scope
              </button>
              
              <button
                disabled={!isMaster}
                onClick={() => setViewScope('ORG')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 relative ${
                  !isMaster ? 'opacity-50 cursor-not-allowed text-text-muted' : 'cursor-pointer'
                } ${
                  viewScope === 'ORG'
                    ? 'bg-surface-card text-primary-700 shadow-sm border border-border/20'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {!isMaster && <Lock className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-text-muted" />}
                <Globe className="w-3.5 h-3.5" />
                Org Scope
              </button>
            </div>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs font-semibold border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none cursor-pointer border-slate-200"
            >
              <option value="Month to Date">Month to Date</option>
              <option value="Last 90 Days">Last 90 Days</option>
              <option value="Year to Date">Year to Date</option>
            </select>

            {viewScope === 'ORG' && (
              <select
                value={selectedClinic}
                onChange={(e) => setSelectedClinic(e.target.value)}
                className="text-xs font-semibold border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none cursor-pointer border-slate-200 animate-scale-in"
              >
                {CLINICS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Scoped Net Revenue</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.revenue}</span>
                <span className="text-xs font-bold text-success">{data.revenueGrowth}</span>
              </div>
              <p className="text-[10px] text-text-muted">Total billing collections</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient Encounters</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.patientsSeen}</span>
                <span className="text-xs font-bold text-success">{data.patientsGrowth}</span>
              </div>
              <p className="text-[10px] text-text-muted">Recorded encounters</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Average Ticket Value</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.avgTicket}</span>
                <span className="text-xs font-bold text-success">{data.ticketGrowth}</span>
              </div>
              <p className="text-[10px] text-text-muted">Per check-in visit</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Revenue Distribution (Monthly)</h3>
            <div className="h-[220px] flex items-end gap-3 sm:gap-6 pt-6 border-b border-border-light pb-2 select-none">
              {data.revenueMonthly.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                    ${item.val.toLocaleString()}
                  </div>
                  <div className="w-full bg-gradient-to-t from-primary-600 via-primary-500 to-teal-400 rounded-t-md transition-all duration-500 group-hover:brightness-105" style={{ height: item.height }}></div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Patient Volume Breakdown</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-primary-600"></span> Scheduled</span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-slate-300"></span> Walk-ins</span>
              </div>
            </div>
            <div className="h-[220px] flex items-end justify-between pt-6 border-b border-border-light pb-2 select-none px-2 sm:px-4">
              {data.patientTrends.map((item) => (
                <div key={item.day} className="flex flex-col items-center h-full justify-end cursor-pointer group relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10 flex gap-2">
                    <span>Sch: {item.scheduled}</span> <span>Walk: {item.walkin}</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-full">
                    <div className="w-4 bg-primary-600 hover:bg-primary-700 rounded-t-sm transition-all duration-500" style={{ height: item.hSched }}></div>
                    <div className="w-4 bg-slate-300 hover:bg-slate-400 rounded-t-sm transition-all duration-500" style={{ height: item.hWalk }}></div>
                  </div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4 lg:col-span-2" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Stock Inventory Movement Distribution</h3>
            <div className="space-y-4 pt-2">
              <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner">
                {data.inventoryBreakdown.map((item) => (
                  <div key={item.label} className={`${item.color} h-full transition-all duration-700 hover:opacity-90 flex items-center justify-center text-[9px] text-white font-bold`} style={{ width: `${item.pct}%` }}>
                    {item.pct >= 10 && `${item.pct}%`}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {data.inventoryBreakdown.map((item) => (
                  <div key={item.label} className="p-3.5 rounded-xl border border-border bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-primary">{item.val}</p>
                      <p className="text-[9px] text-text-muted font-semibold uppercase mt-0.5">{item.pct}% of total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Doctor Dashboard (Consultations & Clinical Outcomes)
  if (role === 'DOCTOR') {
    const data = REPORTS_DATA.DOCTOR;
    return (
      <div className="space-y-6 animate-fade-in font-sans pb-12">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary-600" />
            Physician Clinical Insights
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Overview of total patient consultations, diagnosing categories, and therapeutic outcomes.
          </p>
        </div>

        {/* Doctor KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Consultations</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.totalConsultations}</span>
                <span className="text-xs font-bold text-success">{data.consultationsGrowth}</span>
              </div>
              <p className="text-[10px] text-text-muted">Patients treated this period</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Avg Consult Duration</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.avgDuration}</span>
                <span className="text-xs font-bold text-success">{data.durationGrowth}</span>
              </div>
              <p className="text-[10px] text-text-muted">Pill-to-consult contact times</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Rx Prescription Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.rxRate}</span>
                <span className="text-xs font-bold text-success">{data.rxRateGrowth}</span>
              </div>
              <p className="text-[10px] text-text-muted">Consultations resulting in Rx</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Doctor Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Monthly Consultations</h3>
            <div className="h-[220px] flex items-end gap-3 sm:gap-6 pt-6 border-b border-border-light pb-2 select-none">
              {data.consultationsMonthly.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                    {item.val} cases
                  </div>
                  <div className="w-full bg-gradient-to-t from-teal-600 to-primary-500 rounded-t-md transition-all duration-500 group-hover:brightness-105" style={{ height: item.height }}></div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Diagnoses Categorization</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-primary-600"></span> Chronic Diseases</span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-slate-300"></span> Acute Illness</span>
              </div>
            </div>
            <div className="h-[220px] flex items-end justify-between pt-6 border-b border-border-light pb-2 select-none px-2 sm:px-4">
              {data.diagnosisTrends.map((item) => (
                <div key={item.day} className="flex flex-col items-center h-full justify-end cursor-pointer group relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10 flex gap-2">
                    <span>Chronic: {item.chronic}</span> <span>Acute: {item.acute}</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-full">
                    <div className="w-4 bg-primary-600 hover:bg-primary-700 rounded-t-sm transition-all duration-500" style={{ height: item.hChronic }}></div>
                    <div className="w-4 bg-slate-300 hover:bg-slate-400 rounded-t-sm transition-all duration-500" style={{ height: item.hAcute }}></div>
                  </div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4 lg:col-span-2" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Patient Outcome Statistics</h3>
            <div className="space-y-4 pt-2">
              <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner">
                {data.outcomesBreakdown.map((item) => (
                  <div key={item.label} className={`${item.color} h-full transition-all duration-700 hover:opacity-90 flex items-center justify-center text-[9px] text-white font-bold`} style={{ width: `${item.pct}%` }}>
                    {item.pct}%
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {data.outcomesBreakdown.map((item) => (
                  <div key={item.label} className="p-3.5 rounded-xl border border-border bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-primary">{item.val}</p>
                      <p className="text-[9px] text-text-muted font-semibold uppercase mt-0.5">{item.pct}% total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nurse Dashboard (Intakes & Vitals Screenings)
  if (role === 'NURSE') {
    const data = REPORTS_DATA.NURSE;
    return (
      <div className="space-y-6 animate-fade-in font-sans pb-12">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary-600" />
            Patient Care & Screenings Reports
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Monitor intake workflows, screening accuracy, and vitals recording metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Intakes Processed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.totalIntakes}</span>
                <span className="text-xs font-bold text-success">{data.intakesGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Vitals Screening Accuracy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.vitalsSuccess}</span>
                <span className="text-xs font-bold text-success">{data.vitalsGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Active Reminders Queue</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.pendingReminders}</span>
                <span className="text-xs font-bold text-success">{data.remindersGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Daily Screening Encounters</h3>
            <div className="h-[220px] flex items-end gap-3 sm:gap-6 pt-6 border-b border-border-light pb-2 select-none">
              {data.intakesWeekly.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                    {item.val} screens
                  </div>
                  <div className="w-full bg-gradient-to-t from-teal-600 to-primary-500 rounded-t-md transition-all duration-500 group-hover:brightness-105" style={{ height: item.height }}></div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Screening Type Distribution</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-primary-600"></span> Routine Care</span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-slate-300"></span> Urgent Triage</span>
              </div>
            </div>
            <div className="h-[220px] flex items-end justify-between pt-6 border-b border-border-light pb-2 select-none px-2 sm:px-4">
              {data.screeningBreakdown.map((item) => (
                <div key={item.day} className="flex flex-col items-center h-full justify-end cursor-pointer group relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10 flex gap-2">
                    <span>Routine: {item.routine}</span> <span>Urgent: {item.urgent}</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-full">
                    <div className="w-4 bg-primary-600 hover:bg-primary-700 rounded-t-sm transition-all duration-500" style={{ height: item.hRoutine }}></div>
                    <div className="w-4 bg-slate-300 hover:bg-slate-400 rounded-t-sm transition-all duration-500" style={{ height: item.hUrgent }}></div>
                  </div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4 lg:col-span-2" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Intake Task Resolution</h3>
            <div className="space-y-4 pt-2">
              <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner">
                {data.tasksProgress.map((item) => (
                  <div key={item.label} className={`${item.color} h-full transition-all duration-700 hover:opacity-90 flex items-center justify-center text-[9px] text-white font-bold`} style={{ width: `${item.pct}%` }}>
                    {item.pct}%
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {data.tasksProgress.map((item) => (
                  <div key={item.label} className="p-3.5 rounded-xl border border-border bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-primary">{item.val}</p>
                      <p className="text-[9px] text-text-muted font-semibold uppercase mt-0.5">{item.pct}% total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pharmacist Dashboard (Inventory dispensation & movements)
  if (role === 'PHARMACIST') {
    const data = REPORTS_DATA.PHARMACIST;
    return (
      <div className="space-y-6 animate-fade-in font-sans pb-12">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary-600" />
            Medication Dispensation & Inventory Logs
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Analyze dispensation volumes, resolved stock levels, and drug expiry indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Prescriptions Dispensed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.dispensedRx}</span>
                <span className="text-xs font-bold text-success">{data.dispensedGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Pill className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Low Stock Resolved</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.lowStockResolved}</span>
                <span className="text-xs font-bold text-text-secondary">{data.resolvedGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Expiry / Discarded Waste</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.expiryDisposed}</span>
                <span className="text-xs font-bold text-success">{data.expiryGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Medication Dispensed (Monthly units)</h3>
            <div className="h-[220px] flex items-end gap-3 sm:gap-6 pt-6 border-b border-border-light pb-2 select-none">
              {data.dispensationMonthly.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                    {item.val} units
                  </div>
                  <div className="w-full bg-gradient-to-t from-teal-600 to-primary-500 rounded-t-md transition-all duration-500 group-hover:brightness-105" style={{ height: item.height }}></div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Dispensation Categories</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-primary-600"></span> Prescriptions</span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-slate-300"></span> Over-The-Counter</span>
              </div>
            </div>
            <div className="h-[220px] flex items-end justify-between pt-6 border-b border-border-light pb-2 select-none px-2 sm:px-4">
              {data.dispensedCategories.map((item) => (
                <div key={item.day} className="flex flex-col items-center h-full justify-end cursor-pointer group relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10 flex gap-2">
                    <span>Rx: {item.prescription}</span> <span>OTC: {item.otc}</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-full">
                    <div className="w-4 bg-primary-600 hover:bg-primary-700 rounded-t-sm transition-all duration-500" style={{ height: item.hPresc }}></div>
                    <div className="w-4 bg-slate-300 hover:bg-slate-400 rounded-t-sm transition-all duration-500" style={{ height: item.hOtc }}></div>
                  </div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4 lg:col-span-2" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Stock Transactions Summary</h3>
            <div className="space-y-4 pt-2">
              <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner">
                {data.stockDeltaSummary.map((item) => (
                  <div key={item.label} className={`${item.color} h-full transition-all duration-700 hover:opacity-90 flex items-center justify-center text-[9px] text-white font-bold`} style={{ width: `${item.pct}%` }}>
                    {item.pct}%
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {data.stockDeltaSummary.map((item) => (
                  <div key={item.label} className="p-3.5 rounded-xl border border-border bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-primary">{item.val}</p>
                      <p className="text-[9px] text-text-muted font-semibold uppercase mt-0.5">{item.pct}% total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Receptionist Dashboard (Check-ins, Wait times, flow completeness)
  if (role === 'RECEPTIONIST') {
    const data = REPORTS_DATA.RECEPTIONIST;
    return (
      <div className="space-y-6 animate-fade-in font-sans pb-12">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-primary-600" />
            Front Desk Flow & Check-In Reports
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Monitor client check-in volumes, lobby wait times, and intake status conversions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Patients Checked-In</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.checkedIn}</span>
                <span className="text-xs font-bold text-success">{data.checkedInGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Avg Receptionist Wait Time</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.avgWait}</span>
                <span className="text-xs font-bold text-success">{data.waitGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Appointment Cancellation Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.cancellationRate}</span>
                <span className="text-xs font-bold text-success">{data.cancelGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Monthly Patient Arrivals</h3>
            <div className="h-[220px] flex items-end gap-3 sm:gap-6 pt-6 border-b border-border-light pb-2 select-none">
              {data.checkinsMonthly.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                    {item.val} patients
                  </div>
                  <div className="w-full bg-gradient-to-t from-teal-600 to-primary-500 rounded-t-md transition-all duration-500 group-hover:brightness-105" style={{ height: item.height }}></div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Daily Flow Typology</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-primary-600"></span> Scheduled</span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-slate-300"></span> Walk-ins</span>
              </div>
            </div>
            <div className="h-[220px] flex items-end justify-between pt-6 border-b border-border-light pb-2 select-none px-2 sm:px-4">
              {data.patientFlowType.map((item) => (
                <div key={item.day} className="flex flex-col items-center h-full justify-end cursor-pointer group relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10 flex gap-2">
                    <span>Sched: {item.scheduled}</span> <span>Walk: {item.walkin}</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-full">
                    <div className="w-4 bg-primary-600 hover:bg-primary-700 rounded-t-sm transition-all duration-500" style={{ height: item.hSched }}></div>
                    <div className="w-4 bg-slate-300 hover:bg-slate-400 rounded-t-sm transition-all duration-500" style={{ height: item.hWalk }}></div>
                  </div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4 lg:col-span-2" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Patient Intake Completeness</h3>
            <div className="space-y-4 pt-2">
              <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner">
                {data.flowCompleteness.map((item) => (
                  <div key={item.label} className={`${item.color} h-full transition-all duration-700 hover:opacity-90 flex items-center justify-center text-[9px] text-white font-bold`} style={{ width: `${item.pct}%` }}>
                    {item.pct}%
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {data.flowCompleteness.map((item) => (
                  <div key={item.label} className="p-3.5 rounded-xl border border-border bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-primary">{item.val}</p>
                      <p className="text-[9px] text-text-muted font-semibold uppercase mt-0.5">{item.pct}% total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // HR Dashboard (Staff attendance & payroll completion)
  if (role === 'HR') {
    const data = REPORTS_DATA.HR;
    return (
      <div className="space-y-6 animate-fade-in font-sans pb-12">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary-600" />
            Human Resources & Attendance Reports
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Monitor weekly attendance statistics, leave resolutions, and onboarding logistics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Staff Registered</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.staffCount}</span>
                <span className="text-xs font-bold text-success">{data.staffGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Average Attendance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.attendance}</span>
                <span className="text-xs font-bold text-success">{data.attendanceGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Leave Resolution Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-text-primary">{data.leaveResolved}</span>
                <span className="text-xs font-bold text-text-secondary">{data.leaveGrowth}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Weekly Attendance Rate</h3>
            <div className="h-[220px] flex items-end gap-3 sm:gap-6 pt-6 border-b border-border-light pb-2 select-none">
              {data.attendanceWeekly.map((item) => (
                <div key={item.day} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                    {item.percentage}% Present
                  </div>
                  <div className="w-full bg-gradient-to-t from-teal-600 to-primary-500 rounded-t-md transition-all duration-500 group-hover:brightness-105" style={{ height: item.height }}></div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Staff Operations Activity</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-primary-600"></span> Active Onboarding</span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-text-secondary"><span className="w-2.5 h-2.5 rounded bg-slate-300"></span> Offboarding</span>
              </div>
            </div>
            <div className="h-[220px] flex items-end justify-between pt-6 border-b border-border-light pb-2 select-none px-2 sm:px-4">
              {data.onboardingTrends.map((item) => (
                <div key={item.day} className="flex flex-col items-center h-full justify-end cursor-pointer group relative">
                  <div className="absolute bottom-[92%] opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10 flex gap-2">
                    <span>Onboard: {item.active}</span> <span>Offboard: {item.offboarding}</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-full">
                    <div className="w-4 bg-primary-600 hover:bg-primary-700 rounded-t-sm transition-all duration-500" style={{ height: item.hSched }}></div>
                    <div className="w-4 bg-slate-300 hover:bg-slate-400 rounded-t-sm transition-all duration-500" style={{ height: item.hWalk }}></div>
                  </div>
                  <span className="text-[10px] font-semibold text-text-secondary mt-2.5">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-4 lg:col-span-2" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-bold text-text-primary">Payroll Calculations Status</h3>
            <div className="space-y-4 pt-2">
              <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner">
                {data.payrollCompletion.map((item) => (
                  <div key={item.label} className={`${item.color} h-full transition-all duration-700 hover:opacity-90 flex items-center justify-center text-[9px] text-white font-bold`} style={{ width: `${item.pct}%` }}>
                    {item.pct}%
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {data.payrollCompletion.map((item) => (
                  <div key={item.label} className="p-3.5 rounded-xl border border-border bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-primary">{item.val}</p>
                      <p className="text-[9px] text-text-muted font-semibold uppercase mt-0.5">{item.pct}% total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback placeholder report
  return (
    <div className="py-24 text-center space-y-4 bg-surface-card border border-border rounded-xl">
      <BarChart3 className="w-12 h-12 text-text-muted mx-auto" />
      <div className="space-y-1">
        <h3 className="text-base font-bold text-text-primary">Reports Panel Unavailable</h3>
        <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
          No custom role-specific analytics ledger configuration was found for the current user role: {role}.
        </p>
      </div>
    </div>
  );
}
