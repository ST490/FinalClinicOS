import express from 'express';
import { z } from 'zod';
import { inventoryService } from './inventory.service.js';
import { authenticate, loadUserRoles } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';

const router = express.Router();

// Schemas
const createSchema = z.object({
  clinicId: z.string().uuid(),
  medicineId: z.string().uuid().optional(),
  customName: z.string().optional(),
  customBrand: z.string().optional(),
  batchNo: z.string().optional(),
  expiryDate: z.string().optional(),
  quantity: z.number().int().min(0),
  reorderThreshold: z.number().int().optional(),
  unitPrice: z.number(),
  mrp: z.number().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ clinicId: true, quantity: true });

const adjustSchema = z.object({
  type: z.enum(['RESTOCK', 'WRITE_OFF', 'ADJUSTMENT', 'RETURN', 'SALE']),
  quantityDelta: z.number().int(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  batchNo: z.string().optional(),
  expiryDate: z.string().optional(),
});

const searchSchema = z.object({
  clinicId: z.string().uuid().optional(),
  medicineId: z.string().uuid().optional(),
  lowStock: z.boolean().optional(),
  expiringBefore: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const deductSchema = z.object({
  quantity: z.number().int().min(1),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});

function checkPerm(permission: Permission) {
  return (_req: any, res: any, next: any): void => {
    if (!_req.user) { res.status(401).json({ error: { code: 'UNAUTHORIZED' } }); return; }
    if (_req.user.isOrgOwner) { next(); return; }
    if (!hasPermission(_req.user.roles.map((r: any) => r.role), permission)) {
      res.status(403).json({ error: { code: 'FORBIDDEN' } }); return;
    }
    next();
  };
}

// CRUD
router.post('/inventory', authenticate, loadUserRoles, checkPerm('inventory:manage'), async (req, res, next) => {
  try {
    const item = await inventoryService.create({ ...createSchema.parse(req.body), createdById: req.user!.id });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.get('/inventory', authenticate, loadUserRoles, checkPerm('inventory:read'), async (req, res, next) => {
  try {
    const result = await inventoryService.search(searchSchema.parse(req.query));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/inventory/:id', authenticate, loadUserRoles, checkPerm('inventory:read'), async (req, res, next) => {
  try {
    const item = await inventoryService.findById(req.params.id as string);
    if (!item) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.patch('/inventory/:id', authenticate, loadUserRoles, checkPerm('inventory:manage'), async (req, res, next) => {
  try {
    const item = await inventoryService.update(req.params.id as string, updateSchema.parse(req.body));
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/inventory/:id', authenticate, loadUserRoles, checkPerm('inventory:manage'), async (req, res, next) => {
  try {
    await inventoryService.delete(req.params.id as string);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Stock operations
router.post('/inventory/:id/deduct', authenticate, loadUserRoles, checkPerm('inventory:manage'), async (req, res, next) => {
  try {
    const { quantity, referenceType, referenceId } = deductSchema.parse(req.body);
    const result = await inventoryService.deductStock(
      req.params.id as string, quantity, req.user!.id, referenceType, referenceId
    );
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/inventory/:id/adjust', authenticate, loadUserRoles, checkPerm('inventory:manage'), async (req, res, next) => {
  try {
    const movement = await inventoryService.adjustStock(
      req.params.id as string,
      { ...adjustSchema.parse(req.body), performedById: req.user!.id }
    );
    res.status(201).json(movement);
  } catch (e) { next(e); }
});

router.get('/inventory/:id/history', authenticate, loadUserRoles, checkPerm('inventory:read'), async (req, res, next) => {
  try {
    const history = await inventoryService.getStockHistory(req.params.id as string);
    res.json(history);
  } catch (e) { next(e); }
});

// Alerts
router.get('/alerts/low-stock/:clinicId', authenticate, loadUserRoles, checkPerm('inventory:read'), async (req, res, next) => {
  try {
    const alert = await inventoryService.getLowStockAlerts(req.params.clinicId as string);
    res.json(alert);
  } catch (e) { next(e); }
});

router.get('/alerts/expiring/:clinicId', authenticate, loadUserRoles, checkPerm('inventory:read'), async (req, res, next) => {
  try {
    const items = await inventoryService.getExpiringSoonAlerts(req.params.clinicId as string);
    res.json(items);
  } catch (e) { next(e); }
});

export default router;