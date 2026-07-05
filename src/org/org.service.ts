import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreateOrgInput,
  CreateClinicInput,
  UpdateClinicInput,
  BrandingInput,
  OrgResponse,
  ClinicResponse,
  SearchClinicsInput,
} from './types/org.types.js';

export class OrgService {
  // ─────────────────────────────────────────────────────────────────────────────
  // ORGANIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  async createOrg(input: CreateOrgInput): Promise<OrgResponse> {
    const org = await prisma.organization.create({
      data: {
        name: input.name,
        country: input.country,
        plan: input.plan || 'basic',
        status: 'PENDING',
      },
    });

    return this.formatOrg(org);
  }

  async getOrg(id: string): Promise<OrgResponse | null> {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { clinics: true } } },
    });
    if (!org) return null;

    return this.formatOrg(org, org._count.clinics);
  }

  async updateOrg(id: string, data: { name?: string; plan?: string; status?: string }): Promise<OrgResponse> {
    const org = await prisma.organization.update({
      where: { id },
      data: { name: data.name, plan: data.plan, status: data.status as any },
    });
    return this.formatOrg(org);
  }

  async deleteOrg(id: string): Promise<void> {
    // Soft delete org and all its clinics
    await prisma.organization.update({ where: { id }, data: { status: 'SUSPENDED' } });
    await prisma.clinic.updateMany({ where: { orgId: id }, data: { status: 'DELETED', deletedAt: new Date() } });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CLINIC
  // ─────────────────────────────────────────────────────────────────────────────

  async createClinic(orgId: string, input: CreateClinicInput): Promise<ClinicResponse> {
    const clinic = await prisma.clinic.create({
      data: {
        orgId,
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country || 'IN',
        postalCode: input.postalCode,
        phone: input.phone,
        email: input.email,
        timezone: input.timezone || 'Asia/Kolkata',
        currency: input.currency || 'INR',
        locale: input.locale || 'en-IN',
        workingHours: input.workingHours,
        status: 'ACTIVE',
      },
    });

    // Audit log
    await this.logAudit(orgId, null, 'CLINIC_CREATED', 'Clinic', clinic.id, null, { name: clinic.name });

    return this.formatClinic(clinic);
  }

  async getClinic(id: string): Promise<ClinicResponse | null> {
    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: { org: { select: { name: true } } },
    });
    return clinic ? this.formatClinic(clinic) : null;
  }

  async updateClinic(id: string, input: UpdateClinicInput): Promise<ClinicResponse> {
    const existing = await prisma.clinic.findUnique({ where: { id }, select: { orgId: true } });
    if (!existing) throw new Error('Clinic not found');

    const clinic = await prisma.clinic.update({
      where: { id },
      data: {
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        phone: input.phone,
        email: input.email,
        timezone: input.timezone,
        currency: input.currency,
        locale: input.locale,
        workingHours: input.workingHours,
        status: input.status as any,
      },
      include: { org: { select: { name: true } } },
    });

    await this.logAudit(existing.orgId, id, 'CLINIC_UPDATED', 'Clinic', id, { status: 'before' }, { status: 'after' });

    return this.formatClinic(clinic);
  }

  async updateBranding(id: string, input: BrandingInput): Promise<ClinicResponse> {
    const existing = await prisma.clinic.findUnique({
      where: { id },
      select: { orgId: true, landingPageSlug: true },
    });
    if (!existing) throw new Error('Clinic not found');

    // Check slug uniqueness if changing
    if (input.landingPageSlug && input.landingPageSlug !== existing.landingPageSlug) {
      const conflict = await prisma.clinic.findFirst({
        where: { landingPageSlug: input.landingPageSlug, id: { not: id }, deletedAt: null },
      });
      if (conflict) throw new Error('Landing page slug already taken');
    }

    const clinic = await prisma.clinic.update({
      where: { id },
      data: {
        logoUrl: input.logoUrl,
        bannerUrl: input.bannerUrl,
        accentColor: input.accentColor,
        landingPageSlug: input.landingPageSlug,
      },
      include: { org: { select: { name: true } } },
    });

    return this.formatClinic(clinic);
  }

  async deleteClinic(id: string): Promise<void> {
    const clinic = await prisma.clinic.findUnique({ where: { id }, select: { orgId: true, name: true } });
    if (!clinic) throw new Error('Clinic not found');

    await prisma.clinic.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    await this.logAudit(clinic.orgId, id, 'CLINIC_DELETED', 'Clinic', id, null, { name: clinic.name });
  }

  async searchClinics(input: SearchClinicsInput): Promise<{ data: ClinicResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ClinicWhereInput = {
      deletedAt: null,
      ...(input.orgId && { orgId: input.orgId }),
      ...(input.status && { status: input.status as any }),
    };

    const [clinics, total] = await Promise.all([
      prisma.clinic.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [input.sortBy || 'createdAt']: input.sortOrder || 'desc' },
        include: { org: { select: { name: true } } },
      }),
      prisma.clinic.count({ where }),
    ]);

    return {
      data: clinics.map(c => this.formatClinic(c)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private formatOrg(org: any, clinicCount?: number): OrgResponse {
    return {
      id: org.id,
      name: org.name,
      country: org.country,
      plan: org.plan,
      status: org.status,
      clinicCount,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  private formatClinic(clinic: any): ClinicResponse {
    return {
      id: clinic.id,
      orgId: clinic.orgId,
      name: clinic.name,
      address: clinic.address,
      city: clinic.city,
      state: clinic.state,
      country: clinic.country,
      postalCode: clinic.postalCode,
      phone: clinic.phone,
      email: clinic.email,
      timezone: clinic.timezone,
      currency: clinic.currency,
      locale: clinic.locale,
      logoUrl: clinic.logoUrl,
      bannerUrl: clinic.bannerUrl,
      accentColor: clinic.accentColor,
      landingPageSlug: clinic.landingPageSlug,
      workingHours: clinic.workingHours,
      status: clinic.status,
      deletedAt: clinic.deletedAt,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
      orgName: clinic.org?.name,
    };
  }

  private async logAudit(orgId: string, clinicId: string | null, action: string, entityType: string, entityId: string, before: any, after: any): Promise<void> {
    await prisma.auditLog.create({
      data: {
        orgId,
        clinicId,
        userId: null,
        action,
        entityType,
        entityId,
        before: before || null,
        after: after || null,
      },
    }).catch(() => {/* noop — audit failures shouldn't break operations */});
  }
}

export const orgService = new OrgService();