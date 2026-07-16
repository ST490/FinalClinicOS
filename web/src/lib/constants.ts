import type { UserRole, NavItem, StatCardData } from '../types';

// Default non-clinical departments for SUPPORT staff. Custom departments can also be added.
export const DEFAULT_DEPARTMENTS = [
  'Production',
  'Warehouse',
  'Logistics',
  'Quality Control',
  'Maintenance',
  'Security',
  'Housekeeping',
] as const;

// Default leave types (free-text on the backend — clinics may use custom values too).
export const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Emergency Leave',
  'Paid Leave',
] as const;

// HR payroll / staff attributes (miror backend enums: WageType, ShiftType, EmploymentType).
export const WAGE_TYPES = ['MONTHLY', 'DAILY', 'HOURLY'] as const;
export const SHIFT_TYPES = ['DAY', 'NIGHT', 'ROTATIONAL'] as const;
export const EMPLOYMENT_TYPES = ['PERMANENT', 'CONTRACT'] as const;

// Clinic-facing labels for the enums above.
export const WAGE_TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  DAILY: 'Daily',
  HOURLY: 'Hourly',
};
export const SHIFT_TYPE_LABELS: Record<string, string> = {
  DAY: 'Day',
  NIGHT: 'Night',
  ROTATIONAL: 'Rotational',
};
export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  PERMANENT: 'Permanent',
  CONTRACT: 'Contract',
};

export const navigationByRole: Record<UserRole, NavItem[]> = {
  MASTER: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', href: '/analytics' },
    { id: 'billing', label: 'Billing & Subscription', icon: 'CreditCard', href: '/billing' },
    { id: 'staff', label: 'Staff & Users', icon: 'Users', href: '/staff' },
    { id: 'inventory', label: 'Inventory Overview', icon: 'Package', href: '/inventory' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', href: '/reports' },
    { id: 'myhr', label: 'My HR', icon: 'UserRound', href: '/my-hr' },
    { id: 'orgchart', label: 'Org Chart', icon: 'Network', href: '/org-chart' },
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
    { id: 'myhr', label: 'My HR', icon: 'UserRound', href: '/my-hr' },
    { id: 'orgchart', label: 'Org Chart', icon: 'Network', href: '/org-chart' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  DOCTOR: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'patients', label: 'Patients', icon: 'UserRound', href: '/patients' },
    { id: 'appointments', label: 'Appointments', icon: 'CalendarDays', href: '/appointments' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText', href: '/prescriptions' },
    { id: 'clinicalnotes', label: 'Clinical Notes', icon: 'ClipboardList', href: '/clinical-notes' },
    { id: 'myhr', label: 'My HR', icon: 'UserRound', href: '/my-hr' },
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
    { id: 'myhr', label: 'My HR', icon: 'UserRound', href: '/my-hr' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  PHARMACIST: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'inventory', label: 'Inventory', icon: 'Package', href: '/inventory' },
    { id: 'incoming', label: 'Incoming Stock', icon: 'Truck', href: '/incoming-stock' },
    { id: 'dispensing', label: 'Dispensing', icon: 'Pill', href: '/dispensing' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText', href: '/prescriptions' },
    { id: 'myhr', label: 'My HR', icon: 'UserRound', href: '/my-hr' },
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
    { id: 'myhr', label: 'My HR', icon: 'UserRound', href: '/my-hr' },
  ],
  HR: [
    { id: 'dashboard', label: 'HR Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'directory', label: 'Staff Directory', icon: 'Users', href: '/staff-directory' },
    { id: 'attendance', label: 'Attendance & Scheduling', icon: 'CalendarCheck', href: '/attendance' },
    { id: 'schedule', label: 'Staff Scheduling', icon: 'CalendarDays', href: '/schedule' },
    { id: 'payroll', label: 'Payroll Management', icon: 'Banknote', href: '/payroll' },
    { id: 'leave', label: 'Leave Requests', icon: 'CalendarOff', href: '/leave-requests' },
    { id: 'onboarding', label: 'Recruiting & Onboarding', icon: 'UserPlus', href: '/onboarding' },
    { id: 'roles', label: 'Role Assignments', icon: 'Shield', href: '/role-assignments' },
    { id: 'hr-reports', label: 'HR Reports', icon: 'FileBarChart', href: '/hr-reports' },
    { id: 'credentials', label: 'Credentials', icon: 'ShieldCheck', href: '/credentials' },
    { id: 'employee360', label: 'Employee 360', icon: 'UserSearch', href: '/employee' },
    { id: 'orgchart', label: 'Org Chart', icon: 'Network', href: '/org-chart' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
  SUPPORT: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', badge: 'Active' },
    { id: 'myhr', label: 'My HR', icon: 'UserRound', href: '/my-hr' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
  ],
};

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

export const statsByRole: Record<UserRole, StatCardData[]> = {
  MASTER: [
    { id: 'stat-1', title: 'Total Organization Revenue (Q3)', value: '$0', icon: 'DollarSign' },
    { id: 'stat-2', title: 'Total Patient Volume', value: '0', subtitle: 'Patients seen', icon: 'Users' },
    { id: 'stat-3', title: 'Staff Headcount', value: '0', subtitle: 'Across all locations', icon: 'UserCheck' },
    { id: 'stat-4', title: 'Total Inventory Value', value: '$0', subtitle: '0 Low-Stock Alerts', icon: 'Package' },
  ],
  SUB_MASTER: [
    { id: 'stat-1', title: 'Clinic Revenue (This Month)', value: '$0', icon: 'DollarSign' },
    { id: 'stat-2', title: 'Patients Seen Today', value: '0', icon: 'UserRound' },
    { id: 'stat-3', title: 'Staff On Duty', value: '0', subtitle: 'No staff assigned', icon: 'UserCheck' },
    { id: 'stat-4', title: 'Pending Appointments', value: '0', subtitle: 'Today remaining', icon: 'CalendarDays' },
  ],
  DOCTOR: [
    { id: 'stat-1', title: 'Patients', value: 'Today: 0', icon: 'UserRound' },
    { id: 'stat-2', title: 'Waitlist', value: '0', icon: 'ListOrdered' },
    { id: 'stat-3', title: 'Notes', value: 'Complete: 0', icon: 'ClipboardList' },
    { id: 'stat-4', title: 'Prescriptions', value: '0', icon: 'FileText' },
  ],
  NURSE: [
    { id: 'stat-1', title: "Today's Queue", value: '0', subtitle: '0 waiting, 0 completed', icon: 'ListOrdered' },
    { id: 'stat-2', title: 'Vitals Recorded', value: '0', subtitle: 'Today', icon: 'HeartPulse' },
    { id: 'stat-3', title: 'Pending Vitals', value: '0', icon: 'AlertCircle' },
    { id: 'stat-4', title: 'Walk-Ins Today', value: '0', icon: 'UserPlus' },
  ],
  PHARMACIST: [
    { id: 'stat-1', title: 'Total Inventory Items', value: '0', icon: 'Package' },
    { id: 'stat-2', title: 'Low-Stock Alerts', value: '0 Items', subtitle: 'Inventory normal', icon: 'AlertTriangle', accent: 'danger' },
    { id: 'stat-3', title: 'Expiring Soon', value: '0 Items', subtitle: 'within 30 days', icon: 'Clock', accent: 'danger' },
    { id: 'stat-4', title: 'Total Items Dispensed Today', value: '0', icon: 'Pill' },
  ],
  RECEPTIONIST: [
    { id: 'stat-1', title: 'Patients Waiting: 0', value: 'Avg Wait: 0 min', icon: 'Clock' },
    { id: 'stat-2', title: 'Checked-in Today', value: '0', icon: 'UserCheck' },
    { id: 'stat-3', title: 'Expected Appointments', value: '0', icon: 'CalendarDays' },
    { id: 'stat-4', title: 'Dues Collected Today', value: '$0', icon: 'DollarSign' },
  ],
  HR: [
    { id: 'stat-1', title: 'Total Staff', value: '0', subtitle: 'employees', icon: 'Users' },
    { id: 'stat-2', title: 'New Hires (This Month)', value: '0', icon: 'UserPlus', accent: 'positive' },
    { id: 'stat-3', title: 'Pending Leaves', value: '0', subtitle: 'requests', icon: 'CalendarOff', accent: 'warning' },
    { id: 'stat-4', title: 'Upcoming Performance Reviews', value: '0', icon: 'ClipboardCheck' },
  ],
  SUPPORT: [
    { id: 'stat-1', title: 'Total Staff', value: '0', subtitle: 'employees', icon: 'Users' },
  ],
};
