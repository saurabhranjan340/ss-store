const prisma = require('../utils/prisma');
const { serializeOrder } = require('../utils/serializers');
function normalizeItems(items) { const quantities = new Map(); for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity); return [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity })); }
const allowedTransitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

function normalizePhone(phone) {
  return phone.replace(/[\s()-]/g, '');
}

function serviceError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

async function createOrder(input) {
  const requestedItems = normalizeItems(input.items);
  const idempotencyKey = input.idempotencyKey;
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey },
    include: { items: { include: { product: true } }, user: true },
  });
  if (existingOrder) {
    if (existingOrder.user?.phone && existingOrder.user.phone !== normalizePhone(input.phone)) {
      throw serviceError('Idempotency key is already associated with another phone number', 409);
    }
    return serializeOrder(existingOrder);
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { phone: normalizePhone(input.phone) },
        update: {},
        create: { phone: normalizePhone(input.phone) },
      });
      const products = await tx.product.findMany({ where: { id: { in: requestedItems.map((item) => item.productId) } }, select: { id: true, name: true, price: true, stock: true } });
      const productById = new Map(products.map((product) => [product.id, product]));
      const missing = requestedItems.filter((item) => !productById.has(item.productId)).map((item) => item.productId);
      if (missing.length) throw serviceError('One or more products do not exist', 400, { missingProductIds: missing });
      const lineItems = requestedItems.map((item) => ({ ...item, product: productById.get(item.productId) }));
      const insufficient = lineItems.filter((item) => item.product.stock < item.quantity).map((item) => ({ productId: item.productId, name: item.product.name, requested: item.quantity, available: item.product.stock }));
      if (insufficient.length) {
        const error = serviceError('Insufficient stock for one or more products', 409, { items: insufficient });
        error.code = 'INSUFFICIENT_STOCK';
        throw error;
      }
      for (const item of lineItems) {
        const updated = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (updated.count !== 1) {
          const error = serviceError(`Stock changed while ordering ${item.product.name}`, 409, { productId: item.productId });
          error.code = 'INSUFFICIENT_STOCK';
          throw error;
        }
      }
      const totalAmount = lineItems.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0).toFixed(2);
      return tx.order.create({
        data: {
          idempotencyKey,
          userId: user.id,
          totalAmount,
          items: { create: lineItems.map((item) => ({ productId: item.productId, quantity: item.quantity, price: item.product.price })) },
        },
        include: { items: { include: { product: true } }, user: true },
      });
    }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });
    console.log('Order created:', order.id);
    return serializeOrder(order);
  } catch (error) {
    const duplicateIdempotencyError = error.code === 'P2002' && JSON.stringify(error.meta?.target || '').includes('idempotencyKey');
    if (duplicateIdempotencyError || error.code === 'P2034') {
      const duplicate = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: { include: { product: true } }, user: true } });
      if (duplicate) {
        if (duplicate.user?.phone && duplicate.user.phone !== normalizePhone(input.phone)) {
          throw serviceError('Idempotency key is already associated with another phone number', 409);
        }
        return serializeOrder(duplicate);
      }
    }
    throw error;
  }
}
async function listOrders() { const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, include: { items: { include: { product: true } }, user: true } }); return orders.map(serializeOrder); }
async function updateOrderStatus(id, status) {
  return serializeOrder(await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw serviceError('Order not found', 404);
    if (order.status === status) return tx.order.findUnique({ where: { id }, include: { items: { include: { product: true } }, user: true } });
    if (!allowedTransitions[order.status].includes(status)) {
      throw serviceError(`Cannot move order from ${order.status} to ${status}`, 409, { allowedNextStatuses: allowedTransitions[order.status] });
    }

    const guarded = await tx.order.updateMany({ where: { id, status: order.status }, data: { status } });
    if (guarded.count !== 1) throw serviceError('Order changed concurrently; retry the status update', 409);

    if (status === 'CANCELLED') {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }

    return tx.order.findUnique({ where: { id }, include: { items: { include: { product: true } }, user: true } });
  }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 }));
}
module.exports = { createOrder, listOrders, updateOrderStatus, allowedTransitions };
