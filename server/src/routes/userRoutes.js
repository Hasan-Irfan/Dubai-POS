import { Router } from 'express';
import validate from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';

import {
  getAllUsersSchema,
  getUserByIdSchema,
  updateUserSchema,
  deleteUserSchema
} from '../validators/user.validator.js';

import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/userController.js';

const router = Router();

// GET  /api/v1/users
router.get(
  "/",
  authorize('admin','superAdmin'),
  validate(getAllUsersSchema, 'query'),
  getAllUsers
);

// GET /api/v1/users/:id
router.get(
  '/:id',
  authorize('admin','superAdmin'),
  validate(getUserByIdSchema, 'params'),
  getUserById
);

// PUT /api/v1/users/:id
router.put(
  '/:id',
  authorize('admin','superAdmin'),
  validate(getUserByIdSchema, 'params'),
  validate(updateUserSchema, 'body'),
  updateUser
);

// DELETE /api/v1/users/:id
router.delete(
  '/:id',
  authorize('superAdmin'),
  validate(deleteUserSchema, 'params'),
  deleteUser
);

export default router;
