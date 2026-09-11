const { Prisma } = require('@prisma/client');
const { captureException } = require('../utils/sentry');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error(JSON.stringify({ event: 'api_error', method: req.method, path: req.originalUrl, message: err.message, stack: process.env.NODE_ENV === 'production' ? undefined : err.stack }));
  captureException(err, { method: req.method, path: req.originalUrl });
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'A record with that unique value already exists' });
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Resource not found' });
    if (err.code === 'P2003') return res.status(409).json({ success: false, message: 'Resource is referenced by another record' });
    if (err.code === 'P2034') return res.status(409).json({ success: false, message: 'Concurrent update detected; retry the request with the same idempotency key' });
  }
  if (err.code === 'INSUFFICIENT_STOCK') return res.status(409).json({ success: false, message: err.message, details: err.details });
  return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : 'Internal server error', ...(err.details ? { details: err.details } : {}) });
}
module.exports = errorHandler;
