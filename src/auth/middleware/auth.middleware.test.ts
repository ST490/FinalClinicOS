import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireClinicAccess } from './auth.middleware.js';
import { prisma } from '../../config/database.js';

// Mock database
vi.mock('../../config/database.js', () => ({
  prisma: {
    clinic: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Clinic Access Middleware (Tenant Isolation)', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: {},
      body: {},
      query: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('should return 401 if user is not authenticated', async () => {
    await requireClinicAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    );
  });

  it('should return 400 if clinicId is not provided and activeClinicId is not set', async () => {
    req.user = { id: 'user-1', roles: [] };
    await requireClinicAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CLINIC_ID_REQUIRED' }),
      })
    );
  });

  it('should fall back to activeClinicId if clinicId is omitted', async () => {
    req.user = { id: 'user-1', activeClinicId: 'clinic-active', roles: [{ clinicId: 'clinic-active', role: 'NURSE' }] };
    await requireClinicAccess(req, res, next);
    expect(req.query.clinicId).toBe('clinic-active');
    expect(req.body.clinicId).toBe('clinic-active');
    expect(next).toHaveBeenCalled();
  });

  it('should allow Org Owner (MASTER) to access clinic in their org', async () => {
    req.user = { id: 'owner-1', orgId: 'org-1', isOrgOwner: true };
    req.params.clinicId = 'clinic-1';

    vi.mocked(prisma.clinic.findUnique).mockResolvedValue({
      id: 'clinic-1',
      orgId: 'org-1',
      name: 'Owner Clinic',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await requireClinicAccess(req, res, next);
    expect(prisma.clinic.findUnique).toHaveBeenCalledWith({ where: { id: 'clinic-1' } });
    expect(next).toHaveBeenCalled();
  });

  it('should deny Org Owner (MASTER) access to a clinic in another org', async () => {
    req.user = { id: 'owner-1', orgId: 'org-1', isOrgOwner: true };
    req.params.clinicId = 'clinic-2';

    vi.mocked(prisma.clinic.findUnique).mockResolvedValue({
      id: 'clinic-2',
      orgId: 'org-other',
      name: 'Other Clinic',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await requireClinicAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CLINIC_ACCESS_DENIED' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow staff to access a clinic in their roles list', async () => {
    req.user = { id: 'staff-1', roles: [{ clinicId: 'clinic-1', role: 'NURSE' }] };
    req.params.clinicId = 'clinic-1';

    await requireClinicAccess(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny staff access to a clinic not in their roles list', async () => {
    req.user = { id: 'staff-1', roles: [{ clinicId: 'clinic-1', role: 'NURSE' }] };
    req.params.clinicId = 'clinic-denied';

    await requireClinicAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CLINIC_ACCESS_DENIED' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
