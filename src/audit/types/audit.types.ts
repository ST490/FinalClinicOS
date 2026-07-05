export interface CreateAuditInput {
  orgId: string;
  clinicId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export interface AuditResponse {
  id: string;
  orgId: string;
  clinicId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: any;
  after: any;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: Date;
  userName?: string;
}

export interface SearchAuditInput {
  orgId?: string;
  clinicId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}