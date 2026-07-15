import type {
  UserRole, NavItem, User, Organization, Clinic, StatCardData,
  Appointment, ClinicRevenue, LeaveRequest, OnboardingEntry,
  RoleAssignment, StockItem, PendingPrescription, StockDelivery,
  CalendarAppointment, WaitlistEntry, DuesEntry,
} from './types';

// ─── Global Feature Flags ───
export const SHOW_DEMO_DATA = false;
export const SHOW_DEMO_SWITCHER = false;

// ─── Navigation Config Per Role ───
export const navigationByRole: Record<UserRole, NavItem[]> = {
  MASTER: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', href: '/analytics' },
    { id: 'clinics', label: 'Clinics Management', icon: 'Building2', href: '/clinics' },
    { id: 'billing', label: 'Billing & Subscription', icon: 'CreditCard', href: '/billing' },
    { id: 'staff', label: 'Staff & Users', icon: 'Users', href: '/staff' },
    { id: 'inventory', label: 'Inventory Overview', icon: 'Package', href: '/inventory' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', href: '/reports' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  SUB_MASTER: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'patients', label: 'Patients', icon: 'UserRound', href: '/patients' },
    { id: 'appointments', label: 'Appointments', icon: 'CalendarDays', href: '/appointments' },
    { id: 'inventory', label: 'Inventory', icon: 'Package', href: '/inventory' },
    { id: 'staff', label: 'Staff', icon: 'Users', href: '/staff' },
    { id: 'billing', label: 'Billing', icon: 'Receipt', href: '/billing' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', href: '/reports' },
    { id: 'whitelabel', label: 'White Label', icon: 'Palette', href: '/whitelabel' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  DOCTOR: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'patients', label: 'Patients', icon: 'UserRound', href: '/patients' },
    { id: 'schedule', label: 'Schedule', icon: 'CalendarDays', href: '/schedule' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText', href: '/prescriptions' },
    { id: 'clinicalnotes', label: 'Clinical Notes', icon: 'ClipboardList', href: '/clinical-notes' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', href: '/reports' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  NURSE: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/' },
    { id: 'patientqueue', label: 'Patient Queue', icon: 'ListOrdered', href: '/patient-queue', badge: 'Active' },
    { id: 'patients', label: 'Patients', icon: 'UserRound', href: '/patients' },
    { id: 'appointments', label: 'Appointments', icon: 'CalendarDays', href: '/appointments' },
    { id: 'vitals', label: 'Vitals & History', icon: 'HeartPulse', href: '/vitals' },
    { id: 'reminders', label: 'Reminders', icon: 'Bell', href: '/reminders' },
    { id: 'patientrecords', label: 'Patient Records', icon: 'FolderOpen', href: '/patient-records' },
  ],
  PHARMACIST: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'inventory', label: 'Inventory', icon: 'Package', href: '/inventory' },
    { id: 'incoming', label: 'Incoming Stock', icon: 'Truck', href: '/incoming-stock' },
    { id: 'dispensing', label: 'Dispensing', icon: 'Pill', href: '/dispensing' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText', href: '/prescriptions' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', href: '/reports' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  RECEPTIONIST: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'calendar', label: 'Calendar & Scheduling', icon: 'CalendarDays', href: '/calendar' },
    { id: 'intake', label: 'Patient Intake', icon: 'UserPlus', href: '/intake' },
    { id: 'walkins', label: 'Walk-ins', icon: 'PersonStanding', href: '/walkins' },
    { id: 'dues', label: 'Dues Ledger & Payments', icon: 'Receipt', href: '/dues' },
    { id: 'waitlist', label: 'Waitlist', icon: 'ListOrdered', href: '/waitlist' },
    { id: 'waittimes', label: 'Wait times & Flow', icon: 'Clock', href: '/wait-times' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  HR: [
    { id: 'dashboard', label: 'HR Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'directory', label: 'Staff Directory', icon: 'Users', href: '/staff-directory' },
    { id: 'attendance', label: 'Attendance & Scheduling', icon: 'CalendarCheck', href: '/attendance' },
    { id: 'payroll', label: 'Payroll Management', icon: 'Banknote', href: '/payroll' },
    { id: 'leave', label: 'Leave Requests', icon: 'CalendarOff', href: '/leave-requests' },
    { id: 'onboarding', label: 'Recruiting & Onboarding', icon: 'UserPlus', href: '/onboarding' },
    { id: 'roles', label: 'Role Assignments', icon: 'Shield', href: '/role-assignments' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  SUPPORT: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
};

// ─── Users Per Role ───
export const usersByRole: Record<UserRole, User> = {
  MASTER: {
    id: 'usr-001',
    name: 'Dr. Aris Thorne',
    email: 'aris@apexmedical.com',
    role: 'MASTER',
    roleLabel: 'CEO',
  },
  SUB_MASTER: {
    id: 'usr-002',
    name: 'Dr. Emily Chen',
    email: 'emily@apexmedical.com',
    role: 'SUB_MASTER',
    roleLabel: 'Branch Manager',
  },
  DOCTOR: {
    id: 'usr-003',
    name: 'Dr. Eleanor Vance',
    email: 'eleanor@apexmedical.com',
    role: 'DOCTOR',
    roleLabel: 'Doctor',
  },
  NURSE: {
    id: 'usr-004',
    name: 'Nurse Sarah L.',
    email: 'sarah@apexmedical.com',
    role: 'NURSE',
    roleLabel: 'Nurse',
  },
  PHARMACIST: {
    id: 'usr-005',
    name: 'Dr. Evelyn Reed',
    email: 'evelyn@apexmedical.com',
    role: 'PHARMACIST',
    roleLabel: 'Pharmacist',
  },
  RECEPTIONIST: {
    id: 'usr-006',
    name: 'Sarah J.',
    email: 'sarahj@apexmedical.com',
    role: 'RECEPTIONIST',
    roleLabel: 'Front Desk',
  },
  HR: {
    id: 'usr-007',
    name: 'Sarah Jenkins',
    email: 'sjenkins@apexmedical.com',
    role: 'HR',
    roleLabel: 'HR Manager',
  },
  SUPPORT: {
    id: 'usr-008',
    name: 'Support Staff',
    email: 'support@apexmedical.com',
    role: 'SUPPORT',
    roleLabel: 'Support Staff',
  },
};

// ─── Organization ───
export const mockOrganization: Organization = {
  id: 'org-001',
  name: 'Apex Medical Group',
  country: 'US',
  plan: 'Professional',
  status: 'ACTIVE',
};

// ─── Clinics ───
export const mockClinics: Clinic[] = [
  {
    id: 'cli-001',
    name: 'Downtown Specialty Clinic',
    location: '123 Main St, New York',
    branchManager: 'Dr. Emily Chen',
    status: 'ACTIVE',
    staffCount: 24,
    patientCount: 3450,
  },
  {
    id: 'cli-002',
    name: 'Westside Family Practice',
    location: '456 Oak Ave, New York',
    branchManager: 'Dr. Emily Chen',
    status: 'ACTIVE',
    staffCount: 18,
    patientCount: 2890,
  },
  {
    id: 'cli-003',
    name: 'Northside Urgent Care',
    location: '789 Pine Rd, Brooklyn',
    branchManager: 'Dr. Raj Patel',
    status: 'ACTIVE',
    staffCount: 31,
    patientCount: 4120,
  },
  {
    id: 'cli-004',
    name: 'East Valley Health',
    location: '321 Elm Blvd, Queens',
    branchManager: 'Dr. Lisa Tanaka',
    status: 'ACTIVE',
    staffCount: 14,
    patientCount: 1885,
  },
];

// ─── Stats by Role ───
export const statsByRole: Record<UserRole, StatCardData[]> = {
  MASTER: [
    {
      id: 'stat-1',
      title: 'Total Organization Revenue (Q3)',
      value: '$450,780',
      trend: { value: '+12.5%', direction: 'up' },
      icon: 'DollarSign',
    },
    {
      id: 'stat-2',
      title: 'Total Patient Volume',
      value: '12,345',
      trend: { value: '+8.2%', direction: 'up' },
      subtitle: 'Patients seen',
      icon: 'Users',
    },
    {
      id: 'stat-3',
      title: 'Staff Headcount',
      value: '97',
      subtitle: 'Across all locations',
      icon: 'UserCheck',
    },
    {
      id: 'stat-4',
      title: 'Total Inventory Value',
      value: '$180,000',
      subtitle: '14 Org-wide Low-Stock Alerts',
      icon: 'Package',
      breakdown: [
        { label: 'Medications', percentage: 60, color: '#0d9488' },
        { label: 'Equipment', percentage: 30, color: '#3b82f6' },
        { label: 'Supplies', percentage: 10, color: '#f59e0b' },
      ],
    },
  ],
  SUB_MASTER: [
    {
      id: 'stat-1',
      title: 'Clinic Revenue (This Month)',
      value: '$38,420',
      trend: { value: '+5.3%', direction: 'up' },
      icon: 'DollarSign',
    },
    {
      id: 'stat-2',
      title: 'Patients Seen Today',
      value: '47',
      trend: { value: '+12%', direction: 'up' },
      icon: 'UserRound',
    },
    {
      id: 'stat-3',
      title: 'Staff On Duty',
      value: '18',
      subtitle: 'Out of 24 total',
      icon: 'UserCheck',
    },
    {
      id: 'stat-4',
      title: 'Pending Appointments',
      value: '23',
      subtitle: 'Today remaining',
      icon: 'CalendarDays',
    },
  ],
  DOCTOR: [
    {
      id: 'stat-1',
      title: 'Patients',
      value: 'Today: 14',
      icon: 'UserRound',
    },
    {
      id: 'stat-2',
      title: 'Waitlist',
      value: '3',
      icon: 'ListOrdered',
    },
    {
      id: 'stat-3',
      title: 'Notes',
      value: 'Complete: 8',
      icon: 'ClipboardList',
    },
    {
      id: 'stat-4',
      title: 'Prescriptions',
      value: '5',
      icon: 'FileText',
    },
  ],
  NURSE: [
    {
      id: 'stat-1',
      title: "Today's Queue",
      value: '12',
      subtitle: '5 waiting, 7 completed',
      icon: 'ListOrdered',
    },
    {
      id: 'stat-2',
      title: 'Vitals Recorded',
      value: '28',
      subtitle: 'Today',
      icon: 'HeartPulse',
    },
    {
      id: 'stat-3',
      title: 'Pending Vitals',
      value: '4',
      icon: 'AlertCircle',
    },
    {
      id: 'stat-4',
      title: 'Walk-Ins Today',
      value: '6',
      icon: 'UserPlus',
    },
  ],
  PHARMACIST: [
    {
      id: 'stat-1',
      title: 'Total Inventory Items',
      value: '4,520',
      trend: { value: '+3% vs last month', direction: 'up' },
      icon: 'Package',
    },
    {
      id: 'stat-2',
      title: 'Low-Stock Alerts',
      value: '9 Items',
      subtitle: 'Example: Ibuprofen 400mg',
      icon: 'AlertTriangle',
      accent: 'danger',
    },
    {
      id: 'stat-3',
      title: 'Expiring Soon',
      value: '15 Items',
      subtitle: 'within 30 days',
      icon: 'Clock',
      accent: 'danger',
    },
    {
      id: 'stat-4',
      title: 'Total Items Dispensed Today',
      value: '105',
      icon: 'Pill',
    },
  ],
  RECEPTIONIST: [
    {
      id: 'stat-1',
      title: 'Patients Waiting: 7',
      value: 'Avg Wait: 12 min',
      icon: 'Clock',
    },
    {
      id: 'stat-2',
      title: 'Checked-in Today',
      value: '18',
      icon: 'UserCheck',
    },
    {
      id: 'stat-3',
      title: 'Expected Appointments',
      value: '32',
      icon: 'CalendarDays',
    },
    {
      id: 'stat-4',
      title: 'Dues Collected (Offline) Today',
      value: '$415',
      icon: 'DollarSign',
    },
  ],
  HR: [
    {
      id: 'stat-1',
      title: 'Total Staff',
      value: '85',
      subtitle: 'employees',
      icon: 'Users',
    },
    {
      id: 'stat-2',
      title: 'New Hires (This Month)',
      value: '4',
      icon: 'UserPlus',
    },
    {
      id: 'stat-3',
      title: 'Pending Leaves',
      value: '12',
      subtitle: 'requests',
      icon: 'CalendarOff',
    },
    {
      id: 'stat-4',
      title: 'Upcoming Performance Reviews',
      value: '6',
      icon: 'ClipboardCheck',
    },
  ],
  SUPPORT: [
    {
      id: 'stat-1',
      title: 'Total Staff',
      value: '85',
      subtitle: 'employees',
      icon: 'Users',
    },
  ],
};

// ─── Revenue Breakdown by Clinic (Master view) ───
export const clinicRevenues: ClinicRevenue[] = [
  { clinicName: 'Downtown Specialty Clinic', revenue: 155000, percentage: 100, color: '#0d9488' },
  { clinicName: 'Westside Family Practice', revenue: 120000, percentage: 77, color: '#14b8a6' },
  { clinicName: 'Northside Urgent Care', revenue: 95000, percentage: 61, color: '#2dd4bf' },
  { clinicName: 'East Valley Health', revenue: 80000, percentage: 52, color: '#5eead4' },
];

// ─── Appointment Trends (Mock chart data for last 30 days) ───
export const appointmentTrends = {
  labels: ['Oct 5', 'Oct 10', 'Oct 15', 'Oct 22', 'Oct 24', 'Oct 25', 'Oct 30'],
  booked: [12, 15, 18, 22, 28, 25, 30],
  completed: [10, 13, 15, 18, 24, 22, 27],
};

// ─── Today's Appointments — used by multiple dashboards ───
export const todaysAppointments: Appointment[] = [
  { id: 'apt-001', patientName: 'Sarah Chen', doctorName: 'Dr. A. Thorne', time: '09:00 AM', reason: 'Asthma Follow-up', waitTime: '8 min', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'apt-002', patientName: 'Michael Lee', doctorName: 'Dr. E. Vance', time: '09:30 AM', reason: 'Flu Symptoms', waitTime: '15 min', type: 'WALK_IN', status: 'WAITING' },
  { id: 'apt-003', patientName: 'David Brown', doctorName: 'Dr. A. Thorne', time: '10:15 AM', reason: 'General Check-up', waitTime: '0 min', type: 'WALK_IN', status: 'WAITING' },
  { id: 'apt-004', patientName: 'Olivia Garcia', doctorName: 'Dr. A. Thorne', time: '11:00 AM', reason: 'Migraine Consultation', waitTime: '', type: 'SCHEDULED', status: 'BOOKED' },
  { id: 'apt-005', patientName: 'Robert Taylor', doctorName: 'Dr. E. Vance', time: '11:45 AM', reason: 'Follow-up Hypertension', waitTime: '', type: 'SCHEDULED', status: 'BOOKED' },
  { id: 'apt-006', patientName: 'Maria Santos', doctorName: 'Dr. A. Thorne', time: '09:30 AM', reason: 'Flu Symptoms', waitTime: '5 mins', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'apt-007', patientName: 'Isabella Chen', doctorName: 'Dr. A. Thorne', time: '10:00 AM', reason: 'Annual Checkup', waitTime: '0 mins', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'apt-008', patientName: 'Kanna Chen', doctorName: 'Dr. A. Thorne', time: '10:00 AM', reason: 'Flu Symptoms', waitTime: '0 mins', type: 'WALK_IN', status: 'IN_PROGRESS' },
  { id: 'apt-009', patientName: 'Liam Brown', doctorName: 'Dr. A. Thorne', time: '09:00 AM', reason: 'Annual Checkup', waitTime: '10 mins', type: 'SCHEDULED', status: 'WAITING' },
  { id: 'apt-010', patientName: 'Benna Caren', doctorName: 'Dr. A. Thorne', time: '09:30 AM', reason: 'Post-op Follow-up', waitTime: '0 mins', type: 'SCHEDULED', status: 'IN_PROGRESS' },
];

// ─── Nurse Queue Appointments ───
export const nurseQueueAppointments: Appointment[] = [
  { id: 'nq-001', patientName: 'Liam Brown', doctorName: 'Dr. A. Thorne', time: '09:00 AM', reason: 'Annual Checkup', waitTime: '10 mins', type: 'SCHEDULED', status: 'WAITING' },
  { id: 'nq-002', patientName: 'Maria Sanchez', doctorName: 'Dr. E. Vance', time: '09:30 AM', reason: 'Flu Symptoms', waitTime: '5 mins', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'nq-003', patientName: 'Isabella Chen', doctorName: 'Dr. A. Thorne', time: '10:00 AM', reason: 'Post-op Follow-up', waitTime: '0 mins', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'nq-004', patientName: 'Maria Sanchez', doctorName: 'Dr. A. Thorne', time: '10:30 AM', reason: 'Annual Checkup', waitTime: '5 mins', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'nq-005', patientName: 'Darria Brown', doctorName: 'Dr. A. Thorne', time: '10:30 AM', reason: 'Annual Checkup', waitTime: '0 mins', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'nq-006', patientName: 'Liam Brown', doctorName: 'Dr. A. Thorne', time: '09:00 AM', reason: 'Post-op Follow-up', waitTime: '0 mins', type: 'SCHEDULED', status: 'IN_PROGRESS' },
  { id: 'nq-007', patientName: 'Maria Sanchez', doctorName: 'Dr. A. Thorne', time: '09:00 AM', reason: 'Flu Symptoms', waitTime: '5 mins', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'nq-008', patientName: 'Isabella Chen', doctorName: 'Dr. A. Thorne', time: '09:00 AM', reason: 'Annual Checkup', waitTime: '0 mins', type: 'SCHEDULED', status: 'CHECKED_IN' },
  { id: 'nq-009', patientName: 'Benna Caren', doctorName: 'Dr. A. Thorne', time: '09:30 AM', reason: 'Post-op Follow-up', waitTime: '0 mins', type: 'WALK_IN', status: 'IN_PROGRESS' },
  { id: 'nq-010', patientName: 'Liam Brown', doctorName: 'Dr. A. Thorne', time: '09:00 AM', reason: 'Post-op Follow-up', waitTime: '0 mins', type: 'WALK_IN', status: 'IN_PROGRESS' },
  { id: 'nq-011', patientName: 'Maria Sanchez', doctorName: 'Dr. E. Vance', time: '09:30 AM', reason: 'Flu Symptoms', waitTime: '5 mins', type: 'SCHEDULED', status: 'WAITING' },
  { id: 'nq-012', patientName: 'Isabella Chen', doctorName: 'Dr. A. Thorne', time: '10:00 AM', reason: 'Annual Checkup', waitTime: '0 mins', type: 'SCHEDULED', status: 'WAITING' },
  { id: 'nq-013', patientName: 'Janna Dzown', doctorName: 'Dr. A. Thorne', time: '10:00 AM', reason: 'Post-op Follow-up', waitTime: '0 mins', type: 'WALK_IN', status: 'IN_PROGRESS' },
];

// ─── HR: Leave Requests ───
export const leaveRequests: LeaveRequest[] = [
  { id: 'lr-001', employee: 'Ama Doman', type: 'Pssnce', dateRange: 'May 023 – Mar 2024', reason: 'Reasond after' },
  { id: 'lr-002', employee: 'Sarah Jenkins', type: 'Leave', dateRange: 'May 024 – Aug 2024', reason: 'Impacte months' },
  { id: 'lr-003', employee: 'Jom Thoman', type: 'Leave', dateRange: 'Nov 023 – Oct 2024', reason: 'Somtimes' },
  { id: 'lr-004', employee: 'Sarah Jenkins', type: 'Leave', dateRange: 'Dec 024 – Feb 2024', reason: 'Reason and requests' },
];

// ─── HR: Onboarding / Offboarding ───
export const onboardingEntries: OnboardingEntry[] = [
  { id: 'ob-001', name: 'Ama Grown', type: 'Onboarding', progress: 100 },
  { id: 'ob-002', name: 'Ama Harnan', type: 'Offboarding', progress: 85 },
  { id: 'ob-003', name: 'Jany Tuiner', type: 'Offboarding', progress: 90 },
  { id: 'ob-004', name: 'Jany Tuiner', type: 'Offboarding', progress: 60 },
];

// ─── HR: Role Assignments ───
export const roleAssignments: RoleAssignment[] = [
  { id: 'ra-001', employee: 'Rardan Soraman', newRole: 'New Role', date: 'Apr 11, 2024' },
  { id: 'ra-002', employee: 'Ama Boman', newRole: 'New Role', date: 'Apr 11, 2024' },
  { id: 'ra-003', employee: 'Sarah Jenkins', newRole: 'New Comerator', date: 'Apr 11, 2024' },
  { id: 'ra-004', employee: 'Sarah Jenkins', newRole: 'New Role', date: 'Apr 11, 2024' },
];

// ─── HR: Weekly Attendance ───
export const weeklyAttendance = [
  { day: 'Monday', percentage: 95 },
  { day: 'Tuesday', percentage: 92 },
  { day: 'Wednesday', percentage: 97 },
  { day: 'Thursday', percentage: 92 },
  { day: 'Friday', percentage: 93 },
];

// ─── Pharmacist: Stock Items ───
export const stockItems: StockItem[] = [
  { id: 'si-001', name: 'Atorvastatin 20mg Tabs', form: 'Tablets', currentQty: 1200, reorderPoint: 200, expiry: '2026-10-15', status: 'Good' },
  { id: 'si-002', name: 'Atorvastatin 20mg Tabs', form: 'Capsules', currentQty: 120, reorderPoint: 500, expiry: '2026-10-15', status: 'LOW STOCK' },
  { id: 'si-003', name: 'Atorvastatin 20mg Tabs', form: 'Syrup', currentQty: 1200, reorderPoint: 200, expiry: '2026-10-15', status: 'EXPIRING SOON' },
  { id: 'si-004', name: 'Atorvastatin 20mg Tabs', form: 'Tablets', currentQty: 200, reorderPoint: 200, expiry: '2026-10-15', status: 'Good' },
  { id: 'si-005', name: 'Amoxicillin 500mg', form: 'Tablets', currentQty: 12, reorderPoint: 50, expiry: '2026-09-15', status: 'LOW STOCK' },
  { id: 'si-006', name: 'Paracetamol 650mg', form: 'Tablets', currentQty: 8, reorderPoint: 100, expiry: '2027-03-20', status: 'LOW STOCK' },
  { id: 'si-007', name: 'Omeprazole 20mg', form: 'Capsules', currentQty: 3, reorderPoint: 30, expiry: '2026-08-10', status: 'LOW STOCK' },
  { id: 'si-008', name: 'Metformin 500mg', form: 'Tablets', currentQty: 15, reorderPoint: 40, expiry: '2027-01-05', status: 'LOW STOCK' },
  { id: 'si-009', name: 'Azithromycin 250mg', form: 'Tablets', currentQty: 5, reorderPoint: 25, expiry: '2026-11-30', status: 'LOW STOCK' },
  { id: 'si-010', name: 'Ibuprofen 400mg', form: 'Tablets', currentQty: 150, reorderPoint: 200, expiry: '2026-12-15', status: 'LOW STOCK' },
  { id: 'si-011', name: 'Lisinopril 10mg', form: 'Tablets', currentQty: 80, reorderPoint: 150, expiry: '2027-02-10', status: 'LOW STOCK' },
  { id: 'si-012', name: 'Ciprofloxacin 500mg', form: 'Capsules', currentQty: 90, reorderPoint: 120, expiry: '2026-08-25', status: 'LOW STOCK' },
];

// ─── Pharmacist: Notifications ───
export const pharmacyNotifications = [
  { id: 'pn-001', type: 'danger' as const, text: 'Low Stock: Ibuprofen 400mg Tabs (150/200 point)' },
  { id: 'pn-002', type: 'warning' as const, text: 'Expiring Soon: Ciprofloxacin 500mg Caps (30 days)' },
  { id: 'pn-003', type: 'info' as const, text: 'Check-in Delivery: Order #1235 MedSupply Inc. (Pending)' },
];

// ─── Pharmacist: Pending Prescriptions ───
export const pendingPrescriptions: PendingPrescription[] = [
  { id: 'pp-001', patient: 'John Doe', doctor: 'Dr. Smith', date: '2024-05-20', itemCount: 3 },
  { id: 'pp-002', patient: 'John Doe', doctor: 'Dr. Smith', date: '2024-05-20', itemCount: 3 },
  { id: 'pp-003', patient: 'Jane White', doctor: 'Dr. Vance', date: '2024-05-20', itemCount: 2 },
];

// ─── Pharmacist: Stock Deliveries ───
export const stockDeliveries: StockDelivery[] = [
  { id: 'sd-001', orderId: 'Order #1234', supplier: 'MedSupply Inc.', date: '2024-05-18', status: 'Received' },
  { id: 'sd-002', orderId: 'Order #1235', supplier: 'MedSupply Inc.', date: '2024-05-17', status: 'Partial' },
  { id: 'sd-003', orderId: 'Order #1233', supplier: 'MedSupply Inc.', date: '2024-05-16', status: 'Pending' },
];

// ─── Receptionist: Calendar Appointments ───
export const calendarAppointments: Record<string, CalendarAppointment[]> = {
  'Dr. Aris Thorne (Room 1)': [
    { id: 'ca-001', patientName: 'Jane Cooper', reason: '', time: '9:00 AM', status: 'Arrived' },
    { id: 'ca-002', patientName: 'Michael Brown', reason: 'General Consultation', time: '9:00 AM', status: 'Confirmed', hasOfflinePayment: true },
    { id: 'ca-003', patientName: 'Emily Davis', reason: 'Follow-up', time: '2:00 PM', status: 'In Progress' },
    { id: 'ca-004', patientName: 'Emily Davis', reason: 'General Consultation', time: '3:00 PM', status: 'Confirmed' },
  ],
  'Dr. Emily Chen (Room 2)': [
    { id: 'ca-005', patientName: 'Michael J. Brown', reason: 'General Consultation', time: '8:00 AM', status: 'Confirmed' },
    { id: 'ca-006', patientName: 'Emily Davis', reason: 'General Consultation', time: '1:00 PM', status: 'Confirmed' },
  ],
  'Exam Room 3': [
    { id: 'ca-007', patientName: 'Robert Smith', reason: 'General Consultation', time: '7:00 AM', status: 'Confirmed', isNewPatient: true },
    { id: 'ca-008', patientName: 'Robert Smith', reason: 'Follow-up', time: '4:00 PM', status: 'In Progress' },
    { id: 'ca-009', patientName: 'Urgent', reason: 'General Consultation', time: '5:00 PM', status: 'Waiting', hasOfflinePayment: true },
  ],
  'Consultation Room': [
    { id: 'ca-010', patientName: 'Emily Davis', reason: 'General Consultation', time: '9:00 AM', status: 'Confirmed' },
    { id: 'ca-011', patientName: 'Robert Smith', reason: 'General Consultation', time: '5:00 PM', status: 'Waiting' },
  ],
};

// ─── Receptionist: Waitlist ───
export const waitlistEntries: WaitlistEntry[] = [
  { id: 'wl-001', patient: 'Jane Cooper', arrivalTime: '9:00 AM', visitType: 'Arrived', status: 'Arrived' },
  { id: 'wl-002', patient: 'Michael J. Brown', arrivalTime: '1:00 PM', visitType: 'Confirmed', status: 'Arrived' },
  { id: 'wl-003', patient: 'Robert Smith', arrivalTime: '3:00 PM', visitType: 'In Progress', status: 'Waiting' },
  { id: 'wl-004', patient: 'Emily Davis', arrivalTime: '5:00 PM', visitType: 'Waiting', status: 'Waiting' },
];

// ─── Receptionist: Dues Ledger ───
export const duesEntries: DuesEntry[] = [
  { id: 'de-001', patient: 'Jane Cooper', date: '02/28/23', amount: 20, method: 'Cash', status: 'Cash' },
  { id: 'de-002', patient: 'Emily Davis', date: '02/28/23', amount: 50, method: 'Card', status: 'Check' },
  { id: 'de-003', patient: 'Robert Smith', date: '02/28/23', amount: 100, method: 'Card', status: 'Check' },
];

// ─── Low Stock Items (Pharmacist view) ───
export const lowStockItems = [
  { name: 'Atorvastatin 20mg Tabs (Capsules)', current: 120, threshold: 500, expiry: '2026-10-15' },
  { name: 'Amoxicillin 500mg', current: 12, threshold: 50, expiry: '2026-09-15' },
  { name: 'Paracetamol 650mg', current: 8, threshold: 100, expiry: '2027-03-20' },
  { name: 'Omeprazole 20mg', current: 3, threshold: 30, expiry: '2026-08-10' },
  { name: 'Metformin 500mg', current: 15, threshold: 40, expiry: '2027-01-05' },
  { name: 'Azithromycin 250mg', current: 5, threshold: 25, expiry: '2026-11-30' },
  { name: 'Ibuprofen 400mg', current: 150, threshold: 200, expiry: '2026-12-15' },
  { name: 'Lisinopril 10mg', current: 80, threshold: 150, expiry: '2027-02-10' },
  { name: 'Ciprofloxacin 500mg', current: 90, threshold: 120, expiry: '2026-08-25' },
];

// ─── Role display labels ───
export const roleLabels: Record<UserRole, string> = {
  MASTER: 'Organization Owner',
  SUB_MASTER: 'Clinic Owner',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  PHARMACIST: 'Pharmacist',
  RECEPTIONIST: 'Front Desk',
  HR: 'HR Manager',
  SUPPORT: 'Support Staff',
};

