export interface ClockInInput {
  clinicId: string;
  userId: string;
  date?: string;
  checkIn?: string;
  status?: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  notes?: string;
  recordedById: string;
}

export interface ClockOutInput {
  checkOut?: string;
  recordedById: string;
}

export interface AttendanceResponse {
  id: string;
  clinicId: string;
  orgId: string;
  userId: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  clinicName?: string;
  userName?: string;
}

export interface SearchAttendanceInput {
  clinicId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}