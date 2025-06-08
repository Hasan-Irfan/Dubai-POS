import { asyncHandler } from '../utils/asyncHandler.js';
import * as vendorService from '../services/vendorService.js';

/**
 * POST /api/v1/vendors
 * Body: { name, contact:{ phone, email, address }, openingBalance? }
 */
export const createVendor = asyncHandler(async (req, res) => {
  const vendorData = req.body;
  const vendor = await vendorService.createVendor(vendorData, req.audit);
  res.status(201).json({ success: true, vendor });
});

/**
 * GET /api/v1/vendors
 * Query: page, limit, status, search
 */
export const getAllVendors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = ''
  } = req.query;

  const result = await vendorService.getAllVendors({
    search,
    page: Number(page),
    limit: Number(limit)
  });

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/vendors/:id
 */
export const getVendorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await vendorService.getVendorById(id);
  res.status(200).json({ success: true, vendor });
});

/**
 * PUT /api/v1/vendors/:id
 * Body: any of { name, contact, openingBalance, email }
 */
export const updateVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const vendor = await vendorService.updateVendor(id, updateData, req.audit);
  res.status(200).json({ success: true, vendor });
});

/**
 * DELETE /api/v1/vendors/:id
 */
export const deleteVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await vendorService.deleteVendor(id, req.audit);
  res.status(200).json({ success: true, vendor });
});
