import express from 'express';
import { z } from 'zod';
import { medicineService } from './medicine.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';

const router = express.Router();

const searchSchema = z.object({
  country: z.string().max(3).optional(),
  query: z.string().optional(),
  category: z.string().optional(),
  requiresPrescription: z.boolean().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const autocompleteSchema = z.object({
  country: z.string().max(3),
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(20).optional().default(10),
});

router.get('/medicines', authenticate, loadUserRoles, async (req, res, next) => {
  try {
    const result = await medicineService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/medicines/autocomplete', authenticate, async (req, res, next) => {
  try {
    const { country, q, limit } = autocompleteSchema.parse(req.query);
    const medicines = await medicineService.autocomplete(country, q, limit);
    res.json(medicines);
  } catch (e) { next(e); }
});

router.get('/medicines/categories/:country', authenticate, async (req, res, next) => {
  try {
    const categories = await medicineService.getCategories(req.params.country as string);
    res.json(categories);
  } catch (e) { next(e); }
});

router.get('/medicines/:id', authenticate, async (req, res, next) => {
  try {
    const medicine = await medicineService.getById(req.params.id as string);
    if (!medicine) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    res.json(medicine);
  } catch (e) { next(e); }
});

export default router;