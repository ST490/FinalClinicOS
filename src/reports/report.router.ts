import express from 'express';
import { z } from 'zod';
import { getRevenueReport, getPatientReport, getInventoryReport, getStaffReport, getPayrollReport, getLabourCostReport, getLeaveReport } from './reports.service.js';
import { authenticate, loadUserRoles, requireClinicAccess } from '../auth/middleware/index.js';

const router = express.Router();

const dateRangeSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

router.get('/reports/revenue/:clinicId', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const { fromDate, toDate } = dateRangeSchema.parse(req.query);
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();
    const report = await getRevenueReport(req.params.clinicId as string, from, to);
    res.json(report);
  } catch (e) { next(e); }
});

router.get('/reports/patients/:clinicId', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const { fromDate, toDate } = dateRangeSchema.parse(req.query);
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();
    const report = await getPatientReport(req.params.clinicId as string, from, to);
    res.json(report);
  } catch (e) { next(e); }
});

router.get('/reports/inventory/:clinicId', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const report = await getInventoryReport(req.params.clinicId as string);
    res.json(report);
  } catch (e) { next(e); }
});

router.get('/reports/staff/:clinicId', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const { fromDate, toDate } = dateRangeSchema.parse(req.query);
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();
    const report = await getStaffReport(req.params.clinicId as string, from, to);
    res.json(report);
  } catch (e) { next(e); }
});

router.get('/reports/payroll/:clinicId', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const report = await getPayrollReport(req.params.clinicId as string, req.query.period as string | undefined);
    res.json(report);
  } catch (e) { next(e); }
});

router.get('/reports/labour-cost/:clinicId', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const report = await getLabourCostReport(req.params.clinicId as string, req.query.period as string | undefined);
    res.json(report);
  } catch (e) { next(e); }
});

router.get('/reports/leave/:clinicId', authenticate, loadUserRoles, requireClinicAccess, async (req, res, next) => {
  try {
    const { fromDate, toDate } = dateRangeSchema.parse(req.query);
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();
    const report = await getLeaveReport(req.params.clinicId as string, from, to);
    res.json(report);
  } catch (e) { next(e); }
});

export default router;