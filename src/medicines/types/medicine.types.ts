export interface MedicineResponse {
  id: string;
  country: string;
  genericName: string;
  brandNames: string[];
  composition: string | null;
  strength: string | null;
  dosages: string[];
  category: string | null;
  requiresPrescription: boolean;
}

export interface SearchMedicinesInput {
  country?: string;
  query?: string;
  category?: string;
  requiresPrescription?: boolean;
  page?: number;
  limit?: number;
}