// src/middleware/errorHandler.js
import ApiError from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  // If thrown via ApiError, it has a statusCode
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Optionally hide stack in production
  const payload = {
    success: false,
    message
  };
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
};
