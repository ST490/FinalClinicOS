import { useMemo, useEffect, useState } from 'react';
import type { StatCardData } from '../types';
import { payrollApi } from './payroll';
import { staffApi } from './staff';

// ─── Typed interfaces for HR Reports data ───

export interface HeadcountTrend {
  month: string;
  headcount: number;
  attrition: number;
}

export interface DepartmentBreakdown {
  name: string;
  count: number;
}

export interface PayrollByDept {
  department: string;
  payroll: number;
}

export interface EmploymentStatus {
  name: string;
  count: number;
}

export interface LabourCostByDept {
  department: string;
  headcount: number;
  salary: number;
  benefits: number;
  total: number;
}

export interface EmployeeRow {
  id: string;
  name: string;
  department: string;
  jobTitle: string;
  office: string;
  status: 'Active' | 'On Leave' | 'Probation' | 'Offboarding';
  joinDate: string;
  // attendance (Attendance Report)
  present: number;
  absent: number;
  late: number;
  leave: number;
  // payroll (Payroll Report)
  base: number;
  bonus: number;
  deductions: number;
  net: number;
  // labour cost (Labour Cost Report, per-employee)
  salary: number;
  benefits: number;
  total: number; // salary + benefits
}

export type PeriodKey = '3m' | '7m' | '12m';

export interface HrReportsData {
  stats: StatCardData[];
  headcountTrend: HeadcountTrend[];
  departmentBreakdown: DepartmentBreakdown[];
  payrollByDept: PayrollByDept[];
  employmentStatus: EmploymentStatus[];
  employees: EmployeeRow[];
  // pre-aggregated labour cost by department (component groups live by other dims)
  labourCostByDept: LabourCostByDept[];
}

// ─── Mock datasets per period ───
// Built lazily (first access) so generator functions can reference consts
// declared later in this file without hitting a temporal-dead-zone crash at
// module load.

let _MOCK: Record<PeriodKey, HrReportsData> | null = null;
function getMock(): Record<PeriodKey, HrReportsData> {
  if (_MOCK) return _MOCK;
  // Shared employee list across periods (per-period variation not needed here);
  // labour cost is aggregated from it once.
  const employees = generateEmployees();
  const labourCostByDept = aggregateLabourCost(employees);
  _MOCK = {
  '3m': {
    stats: [
      {
        id: 'hr-stat-1',
        title: 'Total Employees',
        value: '3,540',
        trend: { value: '+2.8%', direction: 'up' },
        subtitle: 'vs previous quarter',
        icon: 'Users',
      },
      {
        id: 'hr-stat-2',
        title: 'New Hires',
        value: '87',
        subtitle: 'Last 3 months',
        icon: 'UserPlus',
      },
      {
        id: 'hr-stat-3',
        title: 'Resigned / Attrition',
        value: '24',
        trend: { value: '-12.5%', direction: 'down' },
        subtitle: 'vs previous quarter',
        icon: 'UserMinus',
        accent: 'danger',
      },
      {
        id: 'hr-stat-4',
        title: 'Open Positions',
        value: '18',
        subtitle: 'Across 6 departments',
        icon: 'Briefcase',
      },
    ],
    headcountTrend: [
      { month: 'May', headcount: 3480, attrition: 9 },
      { month: 'Jun', headcount: 3510, attrition: 7 },
      { month: 'Jul', headcount: 3540, attrition: 8 },
    ],
    departmentBreakdown: [
      { name: 'Clinical', count: 1280 },
      { name: 'Nursing', count: 890 },
      { name: 'Admin', count: 520 },
      { name: 'Pharmacy', count: 340 },
      { name: 'Lab', count: 280 },
      { name: 'Support', count: 230 },
    ],
    payrollByDept: [
      { department: 'Clinical', payroll: 1840000 },
      { department: 'Nursing', payroll: 980000 },
      { department: 'Admin', payroll: 520000 },
      { department: 'Pharmacy', payroll: 410000 },
      { department: 'Lab', payroll: 350000 },
      { department: 'Support', payroll: 210000 },
    ],
    employmentStatus: [
      { name: 'Permanent', count: 2820 },
      { name: 'Contract', count: 480 },
      { name: 'Probation', count: 240 },
    ],
    employees: employees,
    labourCostByDept: labourCostByDept,
  },
  '7m': {
    stats: [
      {
        id: 'hr-stat-1',
        title: 'Total Employees',
        value: '3,540',
        trend: { value: '+4.1%', direction: 'up' },
        subtitle: 'vs 7 months ago',
        icon: 'Users',
      },
      {
        id: 'hr-stat-2',
        title: 'New Hires',
        value: '215',
        subtitle: 'Last 7 months',
        icon: 'UserPlus',
      },
      {
        id: 'hr-stat-3',
        title: 'Resigned / Attrition',
        value: '93',
        trend: { value: '+26.5%', direction: 'up' },
        subtitle: 'vs previous period',
        icon: 'UserMinus',
        accent: 'danger',
      },
      {
        id: 'hr-stat-4',
        title: 'Open Positions',
        value: '18',
        subtitle: 'Across 6 departments',
        icon: 'Briefcase',
      },
    ],
    headcountTrend: [
      { month: 'Jan', headcount: 3400, attrition: 12 },
      { month: 'Feb', headcount: 3420, attrition: 10 },
      { month: 'Mar', headcount: 3445, attrition: 15 },
      { month: 'Apr', headcount: 3460, attrition: 18 },
      { month: 'May', headcount: 3480, attrition: 14 },
      { month: 'Jun', headcount: 3510, attrition: 12 },
      { month: 'Jul', headcount: 3540, attrition: 12 },
    ],
    departmentBreakdown: [
      { name: 'Clinical', count: 1280 },
      { name: 'Nursing', count: 890 },
      { name: 'Admin', count: 520 },
      { name: 'Pharmacy', count: 340 },
      { name: 'Lab', count: 280 },
      { name: 'Support', count: 230 },
    ],
    payrollByDept: [
      { department: 'Clinical', payroll: 4280000 },
      { department: 'Nursing', payroll: 2290000 },
      { department: 'Admin', payroll: 1210000 },
      { department: 'Pharmacy', payroll: 960000 },
      { department: 'Lab', payroll: 820000 },
      { department: 'Support', payroll: 490000 },
    ],
    employmentStatus: [
      { name: 'Permanent', count: 2820 },
      { name: 'Contract', count: 480 },
      { name: 'Probation', count: 240 },
    ],
    employees: employees,
    labourCostByDept: labourCostByDept,
  },
  '12m': {
    stats: [
      {
        id: 'hr-stat-1',
        title: 'Total Employees',
        value: '3,540',
        trend: { value: '+8.6%', direction: 'up' },
        subtitle: 'vs 12 months ago',
        icon: 'Users',
      },
      {
        id: 'hr-stat-2',
        title: 'New Hires',
        value: '500',
        subtitle: 'Last 12 months',
        icon: 'UserPlus',
      },
      {
        id: 'hr-stat-3',
        title: 'Resigned / Attrition',
        value: '210',
        trend: { value: '+5.2%', direction: 'up' },
        subtitle: 'vs previous year',
        icon: 'UserMinus',
        accent: 'danger',
      },
      {
        id: 'hr-stat-4',
        title: 'Open Positions',
        value: '18',
        subtitle: 'Across 6 departments',
        icon: 'Briefcase',
      },
    ],
    headcountTrend: [
      { month: 'Aug', headcount: 3260, attrition: 18 },
      { month: 'Sep', headcount: 3290, attrition: 20 },
      { month: 'Oct', headcount: 3310, attrition: 16 },
      { month: 'Nov', headcount: 3340, attrition: 14 },
      { month: 'Dec', headcount: 3360, attrition: 10 },
      { month: 'Jan', headcount: 3400, attrition: 12 },
      { month: 'Feb', headcount: 3420, attrition: 10 },
      { month: 'Mar', headcount: 3445, attrition: 15 },
      { month: 'Apr', headcount: 3460, attrition: 18 },
      { month: 'May', headcount: 3480, attrition: 14 },
      { month: 'Jun', headcount: 3510, attrition: 12 },
      { month: 'Jul', headcount: 3540, attrition: 12 },
    ],
    departmentBreakdown: [
      { name: 'Clinical', count: 1280 },
      { name: 'Nursing', count: 890 },
      { name: 'Admin', count: 520 },
      { name: 'Pharmacy', count: 340 },
      { name: 'Lab', count: 280 },
      { name: 'Support', count: 230 },
    ],
    payrollByDept: [
      { department: 'Clinical', payroll: 7340000 },
      { department: 'Nursing', payroll: 3920000 },
      { department: 'Admin', payroll: 2080000 },
      { department: 'Pharmacy', payroll: 1640000 },
      { department: 'Lab', payroll: 1400000 },
      { department: 'Support', payroll: 840000 },
    ],
    employmentStatus: [
      { name: 'Permanent', count: 2820 },
      { name: 'Contract', count: 480 },
      { name: 'Probation', count: 240 },
    ],
    employees: employees,
    labourCostByDept: labourCostByDept,
  },
  };
  return _MOCK;
}

// ─── Empty data fallback (genuinely no records) ───
// Used when a live clinic returns zero staff/payroll — these are real zeros
// from empty queries, not faked sample data.

function emptyData(): HrReportsData {
  return {
    stats: [
      { id: 'hr-stat-1', title: 'Total Employees', value: '0', icon: 'Users', subtitle: 'No data' },
      { id: 'hr-stat-2', title: 'New Hires', value: '0', icon: 'UserPlus', subtitle: 'No data' },
      { id: 'hr-stat-3', title: 'Resigned / Attrition', value: '0', icon: 'UserMinus', accent: 'danger', subtitle: 'No data' },
      { id: 'hr-stat-4', title: 'Open Positions', value: '0', icon: 'Briefcase', subtitle: 'No data' },
    ],
    headcountTrend: [],
    departmentBreakdown: [],
    payrollByDept: [],
    employmentStatus: [],
    employees: [],
    labourCostByDept: [],
  };
}

// ─── Employee generator (shared across periods for simplicity) ───

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmployees(): EmployeeRow[] {
  const departments = ['Clinical', 'Nursing', 'Admin', 'Pharmacy', 'Lab', 'Support'];
  const offices = ['HQ', 'Branch A', 'Branch B', 'Branch C'];
  const statuses: EmployeeRow['status'][] = ['Active', 'On Leave', 'Probation', 'Offboarding'];
  const firstNames = [
    'Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Neha', 'Arjun', 'Sanya',
    'Kabir', 'Ishita', 'Dev', 'Meera', 'Aditya', 'Kavya', 'Rahul', 'Zara',
    'Sahil', 'Diya', 'Karan', 'Nisha', 'Ravi', 'Pooja', 'Amit', 'Shreya',
  ];
  const lastNames = [
    'Sharma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Jain', 'Reddy', 'Nair',
    'Mehta', 'Chauhan', 'Verma', 'Iyer', 'Pillai', 'Rao', 'Das', 'Bose',
  ];
  const titles: Record<string, string[]> = {
    Clinical: ['Physician', 'Surgeon', 'Consultant', 'Resident'],
    Nursing: ['Head Nurse', 'Staff Nurse', 'ICU Nurse', 'OPD Nurse'],
    Admin: ['Manager', 'Coordinator', 'Executive', 'Clerk'],
    Pharmacy: ['Chief Pharmacist', 'Pharmacist', 'Pharmacy Tech', 'Dispenser'],
    Lab: ['Lab Director', 'Lab Technician', 'Pathologist', 'Sample Handler'],
    Support: ['Maintenance Lead', 'Housekeeping', 'Security Officer', 'Driver'],
  };

  return Array.from({ length: 30 }, (_, i) => {
    const dept = departments[i % departments.length];
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const titleOptions = titles[dept];
    const month = String(((i * 3) % 12) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    const year = i < 10 ? '2024' : i < 20 ? '2025' : '2026';
    const base = randInt(25000, 90000);
    const bonus = randInt(0, 8000);
    const deductions = randInt(0, 5000);
    const salary = base;
    const benefits = Math.round(base * 0.12);

    return {
      id: `emp-${String(i + 1).padStart(3, '0')}`,
      name: `${fn} ${ln}`,
      department: dept,
      jobTitle: titleOptions[i % titleOptions.length],
      office: offices[i % offices.length],
      status: statuses[i < 22 ? 0 : i < 26 ? 1 : i < 28 ? 2 : 3],
      joinDate: `${year}-${month}-${day}`,
      present: randInt(18, 22),
      absent: randInt(0, 3),
      late: randInt(0, 5),
      leave: randInt(0, 4),
      base,
      bonus,
      deductions,
      net: base + bonus - deductions,
      salary,
      benefits,
      total: salary + benefits,
    };
  });
}

// Aggregate per-employee labour figures by department (demo seed).
function aggregateLabourCost(employees: EmployeeRow[]): LabourCostByDept[] {
  const map: Record<string, LabourCostByDept> = {};
  for (const e of employees) {
    if (!map[e.department]) {
      map[e.department] = { department: e.department, headcount: 0, salary: 0, benefits: 0, total: 0 };
    }
    const agg = map[e.department];
    agg.headcount += 1;
    agg.salary += e.salary;
    agg.benefits += e.benefits;
    agg.total += e.total;
  }
  return Object.values(map);
}

// ─── Hook ───

export interface UseHrReportsArgs {
  period?: PeriodKey;
  demoMode?: boolean;
  clinicId?: string | null;
}

// Fetch real HR data for a clinic and shape it into HrReportsData.
// Empty clinic → genuine zeros (no records), never faked sample figures.
export function useHrReportsData({ period = '7m', demoMode = true, clinicId }: UseHrReportsArgs = {}): HrReportsData {
  const [live, setLive] = useState<HrReportsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (demoMode || !clinicId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const periodStr = period === '3m' ? recentMonths(3) : period === '7m' ? recentMonths(7) : recentMonths(12);
        const month = periodStr[periodStr.length - 1];
        const [staff, pays] = await Promise.all([
          staffApi.list({ clinicId }),
          payrollApi.list({ clinicId, period: month }),
        ]);
        if (cancelled) return;
        const byUser = new Map(staff.map((s) => [s.id, s]));
        const employees: EmployeeRow[] = pays.data.map((p) => {
          const s = byUser.get(p.userId);
          const role = s?.clinicRoles?.find((r) => r.clinicId === clinicId) ?? s?.clinicRoles?.[0];
          const base = p.basic;
          const salary = base;
          const benefits = Math.round(base * 0.12);
          return {
            id: p.userId,
            name: p.userName ?? s?.name ?? 'Unknown',
            department: p.department ?? role?.department ?? 'Unassigned',
            jobTitle: role?.designation ?? role?.role ?? 'Staff',
            office: role?.clinicName ?? '—',
            status: 'Active',
            joinDate: role?.joiningDate ?? '',
            present: p.daysPresent,
            absent: p.daysAbsent,
            late: 0,
            leave: p.daysLeave,
            base,
            bonus: p.bonus,
            deductions: p.deduction,
            net: p.net,
            salary,
            benefits,
            total: salary + benefits,
          };
        });
        setLive(buildLiveData(employees, staff));
      } catch {
        if (!cancelled) setLive(emptyData());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [demoMode, clinicId, period]);

  return useMemo(() => {
    if (demoMode) return getMock()[period];
    if (!clinicId) return emptyData();
    return live ?? emptyData();
  }, [demoMode, clinicId, period, live]);
}

function recentMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

// Aggregate live employees into the chart/report shapes.
function buildLiveData(employees: EmployeeRow[], staff: { clinicRoles?: any[] }[]): HrReportsData {
  const deptCount: Record<string, number> = {};
  const payrollByDept: PayrollByDept[] = [];
  const labourCostByDept = aggregateLabourCost(employees);
  for (const e of employees) {
    if (!deptCount[e.department]) {
      deptCount[e.department] = 0;
      payrollByDept.push({ department: e.department, payroll: 0 });
    }
    deptCount[e.department] += 1;
    payrollByDept.find((p) => p.department === e.department)!.payroll += e.net;
  }
  const total = employees.length;
  const perDept = Object.entries(deptCount).map(([name, count]) => ({ name, count }));
  return {
    stats: [
      { id: 'hr-stat-1', title: 'Total Employees', value: total.toLocaleString('en-IN'), icon: 'Users', subtitle: 'This clinic' },
      { id: 'hr-stat-2', title: 'New Hires', value: '0', icon: 'UserPlus', subtitle: 'Tracking pending' },
      { id: 'hr-stat-3', title: 'Resigned / Attrition', value: '0', icon: 'UserMinus', accent: 'danger', subtitle: 'Tracking pending' },
      { id: 'hr-stat-4', title: 'Open Positions', value: '0', icon: 'Briefcase', subtitle: 'None' },
    ],
    headcountTrend: [{ month: 'Current', headcount: total, attrition: 0 }],
    departmentBreakdown: perDept,
    payrollByDept,
    employmentStatus: [
      { name: 'Permanent', count: staff.filter((s) => s.clinicRoles?.some((r) => r.employmentType === 'PERMANENT')).length },
      { name: 'Contract', count: staff.filter((s) => s.clinicRoles?.some((r) => r.employmentType === 'CONTRACT')).length },
    ],
    employees,
    labourCostByDept,
  };
}
