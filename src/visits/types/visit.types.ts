export interface CreateVisitInput {
  clinicId: string;
  patientId: string;
  doctorId: string;
  visitDate?: string;
  type?: string;
  vitals?: any;
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
  createdById: string;
}

export interface UpdateVisitInput {
  type?: string;
  vitals?: any;
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
}

export interface VisitResponse {
  id: string;
  clinicId: string;
  orgId: string;
  patientId: string;
  doctorId: string;
  visitDate: Date;
  type: string | null;
  vitals: any;
  chiefComplaint: string | null;
  diagnosis: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: { id: string; name: string; phone: string | null };
  doctor?: { id: string; name: string };
  appointment?: { id: string; slotStart: Date; slotEnd: Date } | null;
}

export interface SearchVisitsInput {
  clinicId?: string;
  patientId?: string;
  doctorId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface VisitStats {
  patientId: string;
  totalVisits: number;
  lastVisit: Date | null;
  diagnoses: string[];
}