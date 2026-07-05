import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { MedicineResponse, SearchMedicinesInput } from './types/medicine.types.js';

export class MedicineService {
  async search(input: SearchMedicinesInput): Promise<{ data: MedicineResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineMasterWhereInput = {
      ...(input.country && { country: input.country }),
      ...(input.category && { category: input.category }),
      ...(input.requiresPrescription !== undefined && { requiresPrescription: input.requiresPrescription }),
      ...(input.query && {
        OR: [
          { genericName: { contains: input.query, mode: 'insensitive' as const } },
          { brandNames: { has: input.query } },
          { composition: { contains: input.query, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [medicines, total] = await Promise.all([
      prisma.medicineMaster.findMany({
        where,
        skip,
        take: limit,
        orderBy: { genericName: 'asc' },
      }),
      prisma.medicineMaster.count({ where }),
    ]);

    return {
      data: medicines.map(m => this.formatMedicine(m)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async autocomplete(country: string, query: string, limit = 10): Promise<MedicineResponse[]> {
    const medicines = await prisma.medicineMaster.findMany({
      where: {
        country,
        OR: [
          { genericName: { startsWith: query, mode: 'insensitive' as const } },
          { brandNames: { has: query } },
        ],
      },
      take: limit,
      orderBy: { genericName: 'asc' },
    });
    return medicines.map(m => this.formatMedicine(m));
  }

  async getById(id: string): Promise<MedicineResponse | null> {
    const medicine = await prisma.medicineMaster.findUnique({ where: { id } });
    return medicine ? this.formatMedicine(medicine) : null;
  }

  async getCategories(country: string): Promise<string[]> {
    const categories = await prisma.medicineMaster.groupBy({
      by: ['category'],
      where: { country, category: { not: null } },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
    });
    return categories.map(c => c.category!).filter(Boolean);
  }

  private formatMedicine(medicine: any): MedicineResponse {
    return {
      id: medicine.id,
      country: medicine.country,
      genericName: medicine.genericName,
      brandNames: medicine.brandNames || [],
      composition: medicine.composition,
      strength: medicine.strength,
      dosages: medicine.dosages || [],
      category: medicine.category,
      requiresPrescription: medicine.requiresPrescription,
    };
  }
}

export const medicineService = new MedicineService();