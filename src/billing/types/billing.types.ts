export interface CreateDueInput {
  clinicId: string;
  patientId: string;
  totalAmount: number;
  paymentMethod?: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'INSURANCE' | 'OTHER';
  paymentNotes?: string;
  amountPaid?: number;
  appointmentId?: string;
  prescriptionId?: string;
  dueDate?: Date | string;
  recordedById: string;
  createdAt?: Date | string;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod?: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'INSURANCE' | 'OTHER';
  notes?: string;
  recordedById: string;
}

export interface WaiveDueInput {
  reason: string;
  waivedById: string;
}

export interface DueResponse {
  id: string;
  clinicId: string;
  orgId: string;
  patientId: string;
  totalAmount: any;
  amountPaid: any;
  amountDue: any;
  paymentMethod: string | null;
  paymentNotes: string | null;
  status: string;
  appointmentId: string | null;
  prescriptionId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: { id: string; name: string; phone: string | null };
  recordedBy?: { id: string; name: string };
}

export interface PatientBalanceResponse {
  patientId: string;
  patientName: string;
  totalDues: string;
  totalPaid: string;
  balance: string;
  pendingDues: DueResponse[];
}

export interface SearchDuesInput {
  clinicId?: string;
  patientId?: string;
  status?: 'PAID' | 'PARTIAL' | 'DUE' | 'WAIVED';
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}