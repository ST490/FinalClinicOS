// ─── Role Types ───
export type UserRole =
  | 'MASTER'
  | 'SUB_MASTER'
  | 'DOCTOR'
  | 'NURSE'
  | 'PHARMACIST'
  | 'RECEPTIONIST'
  | 'HR';

// ─── Navigation ───
export interface NavItem {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  href: string;
  badge?: string;
}

// ─── User ───
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  avatarUrl?: string;
}

// ─── Organization ───
export interface Organization {
  id: string;
  name: string;
  country: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  logoUrl?: string;
}

// ─── Clinic ───
export interface Clinic {
  id: string;
  name: string;
  location: string;
  branchManager: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  staffCount: number;
  patientCount: number;
}

// ─── Stats ───
export interface StatCardData {
  id: string;
  title: string;
  value: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  subtitle?: string;
  icon: string;
  accent?: 'default' | 'danger';
  breakdown?: { label: string; percentage: number; color: string }[];
}

// ─── Appointment ───
export interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  time: string;
  reason: string;
  waitTime: string;
  type: 'SCHEDULED' | 'WALK_IN';
  status: 'BOOKED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'WAITING' | 'CHECKED_IN';
}

// ─── Revenue by Clinic ───
export interface ClinicRevenue {
  clinicName: string;
  revenue: number;
  percentage: number;
  color: string;
}

// ─── HR: Leave Request ───
export interface LeaveRequest {
  id: string;
  employee: string;
  type: string;
  dateRange: string;
  reason: string;
}

// ─── HR: Onboarding Entry ───
export interface OnboardingEntry {
  id: string;
  name: string;
  type: 'Onboarding' | 'Offboarding';
  progress: number;
}

// ─── HR: Role Assignment ───
export interface RoleAssignment {
  id: string;
  employee: string;
  newRole: string;
  date: string;
}

// ─── Pharmacist: Stock Item ───
export interface StockItem {
  id: string;
  name: string;
  form: string;
  currentQty: number;
  reorderPoint: number;
  expiry: string;
  status: 'Good' | 'LOW STOCK' | 'EXPIRING SOON';
}

// ─── Pharmacist: Pending Prescription ───
export interface PendingPrescription {
  id: string;
  patient: string;
  doctor: string;
  date: string;
  itemCount: number;
}

// ─── Pharmacist: Stock Delivery ───
export interface StockDelivery {
  id: string;
  orderId: string;
  supplier: string;
  date: string;
  status: 'Received' | 'Partial' | 'Pending';
}

// ─── Receptionist: Calendar Appointment ───
export interface CalendarAppointment {
  id: string;
  patientName: string;
  reason: string;
  time: string;
  status: 'Arrived' | 'Confirmed' | 'In Progress' | 'Waiting';
  isNewPatient?: boolean;
  hasOfflinePayment?: boolean;
}

// ─── Receptionist: Waitlist Entry ───
export interface WaitlistEntry {
  id: string;
  patient: string;
  arrivalTime: string;
  visitType: string;
  status: 'Arrived' | 'Confirmed' | 'In Progress' | 'Waiting';
}

// ─── Receptionist: Dues Entry ───
export interface DuesEntry {
  id: string;
  patient: string;
  date: string;
  amount: number;
  method: string;
  status: string;
}
