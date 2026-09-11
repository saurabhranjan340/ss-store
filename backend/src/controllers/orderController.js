const service = require('../services/orderService'); const { success } = require('../utils/apiResponse');
async function createOrder(req, res) { return success(res, { status: 201, message: 'Order created or replayed', data: await service.createOrder(req.body) }); }
async function getOrders(req, res) { return success(res, { data: await service.listOrders() }); }
async function updateOrderStatus(req, res) { return success(res, { message: 'Order status updated', data: await service.updateOrderStatus(req.params.id, req.body.status) }); }
module.exports = { createOrder, getOrders, updateOrderStatus };
