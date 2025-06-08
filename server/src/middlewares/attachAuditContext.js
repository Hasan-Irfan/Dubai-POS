// src/middleware/attachAuditContext.js
export const attachAuditContext = (req, res, next) => {
    req.audit = {
      actor:     req.actor,            // set by jwtVerify
      ip:        req.ip,
      ua:        req.get('User-Agent')
    };
    next();
  };
  