const { z } = require('zod');
const positiveMoney = z.coerce.number().finite().positive('Must be greater than 0');
const nonNegativeInt = z.coerce.number().int().min(0, 'Must be 0 or greater');
const positiveInt = z.coerce.number().int().positive('Must be a positive integer');
const phone = z.string().trim().min(7).max(20).regex(/^[+0-9()\s-]+$/, 'Must be a valid phone number');
const schemas = {
  createCategory: z.object({ name: z.string().trim().min(1).max(120) }).strict(),
  createProduct: z.object({ name: z.string().trim().min(1).max(180), price: positiveMoney, mrp: positiveMoney, stock: nonNegativeInt, imageUrl: z.string().trim().url().max(500).optional().nullable(), categoryId: positiveInt }).strict().superRefine((value, ctx) => { if (value.mrp < value.price) ctx.addIssue({ code: 'custom', path: ['mrp'], message: 'MRP must be greater than or equal to price' }); }),
  updateProduct: z.object({ name: z.string().trim().min(1).max(180).optional(), price: positiveMoney.optional(), mrp: positiveMoney.optional(), stock: nonNegativeInt.optional(), imageUrl: z.string().trim().url().max(500).optional().nullable(), categoryId: positiveInt.optional() }).strict().superRefine((value, ctx) => { if (value.mrp !== undefined && value.price !== undefined && value.mrp < value.price) ctx.addIssue({ code: 'custom', path: ['mrp'], message: 'MRP must be greater than or equal to price' }); }),
  createOrder: z.object({
    idempotencyKey: z.string().trim().min(8).max(255).optional(),
    phone,
    items: z.array(z.object({ productId: positiveInt, quantity: positiveInt }).strict()).min(1),
  }).strict(),
  updateOrderStatus: z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']) }).strict(),
};
function validateBody(schemaName) { return (req, res, next) => { const result = schemas[schemaName].safeParse(req.body); if (!result.success) return res.status(400).json({ success: false, message: 'Validation failed', details: result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) }); req.body = result.data; next(); }; }
function validateId(req, res, next) { const id = Number(req.params.id); if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid resource id' }); req.params.id = id; next(); }
function requireIdempotencyKey(req, res, next) {
  const key = req.get('Idempotency-Key') || req.body.idempotencyKey;
  if (!key || key.trim().length < 8 || key.trim().length > 255) {
    return res.status(400).json({ success: false, message: 'An Idempotency-Key header or body field is required' });
  }
  req.body.idempotencyKey = key.trim();
  next();
}
module.exports = { validateBody, validateId, requireIdempotencyKey };
