// src/middleware/authorize.js
import ApiError from '../utils/ApiError.js';

export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, 'Forbidden'));
  }
  next();
};
