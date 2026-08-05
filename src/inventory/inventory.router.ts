import express, { Request, Response } from 'express';
import { z } from 'zod';
import { inventoryService } from './inventory.service.js';
import { authenticate, loadUserRoles, requireClinicAccess } from '../auth/middleware/index.js';
import { hasPermission, Permission } from '../auth/types/permissions.js';
import { withTenantHandler } from '../config/tenant-session.js';

const router = express.Router();

function viewerOf(req: Request) {
  return {
    roles: req.user!.roles.map((r: any) => r.role),
    isOrgOwner: !!req.user!.isOrgOwner,
  };
}

async function verifyInventoryAccess(req: Request, res: Response, tx: any): Promise<any> {
  const item = await inventoryService.findById(req.params.id as string, tx);
  if (!item) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Inventory item not found' } });
    return null;
  }

  // Tenant check
  if (req.user!.isOrgOwner) {
    if (item.orgId !== req.user!.orgId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return null;
    }
  } else {
    const hasAccess = req.user!.roles.some(r => r.clinicId === item.clinicId);
    if (!hasAccess) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return null;
    }
  }

  // Role scope: a pharmacist may only touch pharmaceutical items — even by id.
  const viewer = viewerOf(req);
  if (!viewer.isOrgOwner && viewer.roles.includes('PHARMACIST') && item.clinicalCategory !== 'PHARMA') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Pharmacists may only access pharmaceutical items' } });
    return null;
  }

  return item;
}

// Classification enums (mirror prisma schema)
const trackingTypeEnum = z.enum(['LOT_BATCH', 'SERIAL', 'BULK']);
const regulatoryClassEnum = z.enum(['STANDARD', 'CONTROLLED', 'COLD_CHAIN']);
const costTypeEnum = z.enum(['CHARGEABLE', 'OVERHEAD']);
const stockingLevelEnum = z.enum(['CENTRAL', 'DEPARTMENT', 'CONSIGNMENT']);
const clinicalCategoryEnum = z.enum(['PHARMA', 'SURGICAL', 'DIAGNOSTIC', 'PPE', 'DIETARY', 'LINEN', 'MRO', 'OTHER']);

// Schemas
const baseCreateSchema = z.object({
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
  sellingPrice: z.number().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  ingredients: z.string().optional(),
  // Classification
  trackingType: trackingTypeEnum.optional(),
  regulatoryClass: regulatoryClassEnum.optional(),
  costType: costTypeEnum.optional(),
  stockingLevel: stockingLevelEnum.optional(),
  clinicalCategory: clinicalCategoryEnum.optional(),
  serialNo: z.string().optional(),
  consignmentOwner: z.string().optional(),
});

const createSchema = baseCreateSchema.refine((d) => !!d.medicineId || !!d.customName, {
  message: 'Inventory item requires medicineId or customName',
});

const updateSchema = baseCreateSchema.partial().omit({ clinicId: true, quantity: true });

const adjustSchema = z.object({
  type: z.enum(['RESTOCK', 'WRITE_OFF', 'ADJUSTMENT', 'RETURN', 'SALE']),
  quantityDelta: z.number().int(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  batchNo: z.string().optional(),
  expiryDate: z.string().optional(),
  secondSignatoryId: z.string().uuid().optional(),
});

const searchSchema = z.object({
  clinicId: z.string().uuid().optional(),
  medicineId: z.string().uuid().optional(),
  lowStock: z.coerce.boolean().optional(),
  expiringBefore: z.string().optional(),
  ingredients: z.string().optional(),
  trackingType: trackingTypeEnum.optional(),
  regulatoryClass: regulatoryClassEnum.optional(),
  costType: costTypeEnum.optional(),
  stockingLevel: stockingLevelEnum.optional(),
  clinicalCategory: clinicalCategoryEnum.optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(200).optional().default(20),
});

const deductSchema = z.object({
  quantity: z.number().int().min(1),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  secondSignatoryId: z.string().uuid().optional(),
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
router.post('/inventory', authenticate, loadUserRoles, checkPerm('inventory:manage'), requireClinicAccess, withTenantHandler(async (req, res, next, tx) => {
  try {
    const item = await inventoryService.create({ ...createSchema.parse(req.body), createdById: req.user!.id }, tx);
    res.status(201).json(item);
  } catch (e) { next(e); }
}));

router.get('/inventory', authenticate, loadUserRoles, checkPerm('inventory:read'), requireClinicAccess, withTenantHandler(async (req, res, next, tx) => {
  try {
    const result = await inventoryService.search({ ...searchSchema.parse(req.query), viewer: viewerOf(req) }, tx);
    res.json(result);
  } catch (e) { next(e); }
}));

router.get('/inventory/:id', authenticate, loadUserRoles, checkPerm('inventory:read'), withTenantHandler(async (req, res, next, tx) => {
  try {
    const item = await verifyInventoryAccess(req, res, tx);
    if (!item) return;
    res.json(item);
  } catch (e) { next(e); }
}));

router.patch('/inventory/:id', authenticate, loadUserRoles, checkPerm('inventory:manage'), withTenantHandler(async (req, res, next, tx) => {
  try {
    const item = await verifyInventoryAccess(req, res, tx);
    if (!item) return;
    const updated = await inventoryService.update(req.params.id as string, updateSchema.parse(req.body), tx);
    res.json(updated);
  } catch (e) { next(e); }
}));

router.delete('/inventory/:id', authenticate, loadUserRoles, checkPerm('inventory:manage'), withTenantHandler(async (req, res, next, tx) => {
  try {
    const item = await verifyInventoryAccess(req, res, tx);
    if (!item) return;
    await inventoryService.delete(req.params.id as string, tx);
    res.json({ success: true });
  } catch (e) { next(e); }
}));

// Stock operations
router.post('/inventory/:id/deduct', authenticate, loadUserRoles, checkPerm('inventory:manage'), withTenantHandler(async (req, res, next, tx) => {
  try {
    const item = await verifyInventoryAccess(req, res, tx);
    if (!item) return;
    const { quantity, referenceType, referenceId, secondSignatoryId } = deductSchema.parse(req.body);
    const result = await inventoryService.deductStock(
      req.params.id as string, quantity, req.user!.id, referenceType, referenceId, secondSignatoryId, tx
    );
    res.json(result);
  } catch (e) { next(e); }
}));

router.post('/inventory/:id/adjust', authenticate, loadUserRoles, checkPerm('inventory:manage'), withTenantHandler(async (req, res, next, tx) => {
  try {
    const item = await verifyInventoryAccess(req, res, tx);
    if (!item) return;
    const movement = await inventoryService.adjustStock(
      req.params.id as string,
      { ...adjustSchema.parse(req.body), performedById: req.user!.id }, tx
    );
    res.status(201).json(movement);
  } catch (e) { next(e); }
}));

router.get('/inventory/:id/history', authenticate, loadUserRoles, checkPerm('inventory:read'), withTenantHandler(async (req, res, next, tx) => {
  try {
    const item = await verifyInventoryAccess(req, res, tx);
    if (!item) return;
    const history = await inventoryService.getStockHistory(req.params.id as string, 50, tx);
    res.json(history);
  } catch (e) { next(e); }
}));

// Alerts
router.get('/alerts/low-stock/:clinicId', authenticate, loadUserRoles, checkPerm('inventory:read'), requireClinicAccess, withTenantHandler(async (req, res, next, tx) => {
  try {
    const alert = await inventoryService.getLowStockAlerts(req.params.clinicId as string, tx);
    res.json(alert);
  } catch (e) { next(e); }
}));

router.get('/alerts/expiring/:clinicId', authenticate, loadUserRoles, checkPerm('inventory:read'), requireClinicAccess, withTenantHandler(async (req, res, next, tx) => {
  try {
    const items = await inventoryService.getExpiringSoonAlerts(req.params.clinicId as string, tx);
    res.json(items);
  } catch (e) { next(e); }
}));

export default router;