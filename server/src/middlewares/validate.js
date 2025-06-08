// src/middleware/validate.js
import createError from 'http-errors';

export default function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property]);
    if (error) {
      return next(createError(400, error.details[0].message));
    }
    req[property] = value;
    next();
  };
}
