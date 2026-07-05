export interface CreateReminderInput {
  clinicId: string;
  patientId: string;
  appointmentId?: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  templateId: string;
  templateData?: Record<string, string>;
  scheduledAt: string;
}

export interface WebhookStatusInput {
  messageId: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  timestamp?: string;
  error?: string;
}

export interface ReminderResponse {
  id: string;
  clinicId: string;
  orgId: string;
  patientId: string;
  appointmentId: string | null;
  channel: string;
  templateId: string;
  templateData: any;
  scheduledAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  status: string;
  retryCount: number;
  errorMessage: string | null;
  createdAt: Date;
  patientName?: string;
}

export interface SearchRemindersInput {
  clinicId?: string;
  patientId?: string;
  appointmentId?: string;
  status?: string;
  channel?: string;
  page?: number;
  limit?: number;
}