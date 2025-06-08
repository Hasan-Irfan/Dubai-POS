import { asyncHandler } from "../utils/asyncHandler.js";
import * as userService from '../services/userService.js';

/**
 * GET /api/v1/users
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - role: Optional role filter
 * - username: Optional username search
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    role,
    username
  } = req.query;

  // Validate numeric parameters
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const { users, total } = await userService.getAllUsers({
    page: pageNum,
    limit: limitNum,
    role,
    username
  }, req.audit);

  res.status(200).json({
    success: true,
    users,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

/**
 * GET /api/v1/users/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.getUserById(id, req.audit);
  res.status(200).json({ success: true, user });
});

/**
 * PUT /api/v1/users/:id
 * Body: { username?, email?, role? }
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const user = await userService.updateUser(id, data, req.audit);
  res.status(200).json({ success: true, user });
});

/**
 * DELETE /api/v1/users/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.deleteUser(id, req.audit);
  res.status(200).json({ success: true, user });
});