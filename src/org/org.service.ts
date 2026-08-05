import { Prisma } from '@prisma/client';
import { defaultTx } from '../config/database.js';
import type { Tx } from '../config/database.js';
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
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ORGANIZATION
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async createOrg(input: CreateOrgInput, tx: Tx = defaultTx): Promise<OrgResponse> {
    const org = await tx.organization.create({
      data: {
        name: input.name,
        country: input.country,
        plan: input.plan || 'basic',
        status: 'PENDING',
      },
    });

    return this.formatOrg(org);
  }

  async getOrg(id: string, tx: Tx = defaultTx): Promise<OrgResponse | null> {
    const org = await tx.organization.findUnique({
      where: { id },
      include: { _count: { select: { clinics: true } } },
    });
    if (!org) return null;

    return this.formatOrg(org, org._count.clinics);
  }

  async updateOrg(id: string, data: { name?: string; plan?: string; status?: string }, tx: Tx = defaultTx): Promise<OrgResponse> {
    const org = await tx.organization.update({
      where: { id },
      data: { name: data.name, plan: data.plan, status: data.status as any },
    });
    return this.formatOrg(org);
  }

  async deleteOrg(id: string, tx: Tx = defaultTx): Promise<void> {
    // Soft delete org and all its clinics
    await tx.organization.update({ where: { id }, data: { status: 'SUSPENDED' } });
    await tx.clinic.updateMany({ where: { orgId: id }, data: { status: 'DELETED', deletedAt: new Date() } });
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // CLINIC
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async createClinic(orgId: string, input: CreateClinicInput, tx: Tx = defaultTx): Promise<ClinicResponse> {
    const clinic = await tx.clinic.create({
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
    await this.logAudit(orgId, null, 'CLINIC_CREATED', 'Clinic', clinic.id, null, { name: clinic.name }, tx);

    return this.formatClinic(clinic);
  }

  async getClinic(id: string, tx: Tx = defaultTx): Promise<ClinicResponse | null> {
    const clinic = await tx.clinic.findUnique({
      where: { id },
      include: { org: { select: { name: true } } },
    });
    return clinic ? this.formatClinic(clinic) : null;
  }

  async updateClinic(id: string, input: UpdateClinicInput, tx: Tx = defaultTx): Promise<ClinicResponse> {
    const existing = await tx.clinic.findUnique({ where: { id }, select: { orgId: true } });
    if (!existing) throw new Error('Clinic not found');

    const clinic = await tx.clinic.update({
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

    await this.logAudit(existing.orgId, id, 'CLINIC_UPDATED', 'Clinic', id, { status: 'before' }, { status: 'after' }, tx);

    return this.formatClinic(clinic);
  }

  async updateBranding(id: string, input: BrandingInput, tx: Tx = defaultTx): Promise<ClinicResponse> {
    const existing = await tx.clinic.findUnique({
      where: { id },
      select: { orgId: true, landingPageSlug: true },
    });
    if (!existing) throw new Error('Clinic not found');

    // Check slug uniqueness if changing
    if (input.landingPageSlug && input.landingPageSlug !== existing.landingPageSlug) {
      const conflict = await tx.clinic.findFirst({
        where: { landingPageSlug: input.landingPageSlug, id: { not: id }, deletedAt: null },
      });
      if (conflict) throw new Error('Landing page slug already taken');
    }

    const clinic = await tx.clinic.update({
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

  async deleteClinic(id: string, tx: Tx = defaultTx): Promise<void> {
    const clinic = await tx.clinic.findUnique({ where: { id }, select: { orgId: true, name: true } });
    if (!clinic) throw new Error('Clinic not found');

    await tx.clinic.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    await this.logAudit(clinic.orgId, id, 'CLINIC_DELETED', 'Clinic', id, null, { name: clinic.name }, tx);
  }

  async searchClinics(input: SearchClinicsInput, tx: Tx = defaultTx): Promise<{ data: ClinicResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ClinicWhereInput = {
      deletedAt: null,
      ...(input.orgId && { orgId: input.orgId }),
      ...(input.clinicIds?.length && { id: { in: input.clinicIds } }),
      ...(input.status && { status: input.status as any }),
    };

    const [clinics, total] = await Promise.all([
      tx.clinic.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [input.sortBy || 'createdAt']: input.sortOrder || 'desc' },
        include: { org: { select: { name: true } } },
      }),
      tx.clinic.count({ where }),
    ]);

    return {
      data: clinics.map(c => this.formatClinic(c)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // HELPERS
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  private async logAudit(orgId: string, clinicId: string | null, action: string, entityType: string, entityId: string, before: any, after: any, tx: Tx = defaultTx): Promise<void> {
    await tx.auditLog.create({
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
    }).catch(() => {/* noop â€” audit failures shouldn't break operations */});
  }
}

export const orgService = new OrgService();