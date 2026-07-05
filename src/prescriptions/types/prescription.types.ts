export interface CreatePrescriptionInput {
  clinicId: string;
  patientId: string;
  doctorId: string;
  visitId?: string;
  notes?: string;
  signature?: string;
  items: PrescriptionItemInput[];
  createdById: string;
}

export interface PrescriptionItemInput {
  medicineId?: string;
  customName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface PrescriptionResponse {
  id: string;
  clinicId: string;
  orgId: string;
  patientId: string;
  doctorId: string;
  visitId: string | null;
  notes: string | null;
  signature: string | null;
  status: string;
  cancelledAt: Date | null;
  cancelledById: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: { id: string; name: string; phone: string | null };
  doctor?: { id: string; name: string };
  items?: PrescriptionItemResponse[];
}

export interface PrescriptionItemResponse {
  id: string;
  prescriptionId: string;
  medicineId: string | null;
  customName: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  quantity: number;
  unitPrice: any;
  totalPrice: any;
  dispensed: boolean;
  dispensedQty: number;
  createdAt: Date;
  medicine?: { id: string; genericName: string; brandNames: string[] };
}

export interface SearchPrescriptionsInput {
  clinicId?: string;
  patientId?: string;
  doctorId?: string;
  visitId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface DispenseItemInput {
  prescriptionItemId: string;
  quantity: number;
}

export interface DispensePrescriptionInput {
  items: DispenseItemInput[];
  performedById: string;
}