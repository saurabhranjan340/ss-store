const service = require('../services/productService'); const { success } = require('../utils/apiResponse');
async function getProducts(req, res) { const take = Math.min(Math.max(Number(req.query.take) || 50, 1), 100); const skip = Math.max(Number(req.query.skip) || 0, 0); return success(res, { data: await service.listProducts({ categoryId: req.query.categoryId, search: req.query.search?.trim(), skip, take }) }); }
async function createProduct(req, res) { return success(res, { status: 201, message: 'Product created', data: await service.createProduct(req.body) }); }
async function updateProduct(req, res) { return success(res, { message: 'Product updated', data: await service.updateProduct(req.params.id, req.body) }); }
async function deleteProduct(req, res) { await service.deleteProduct(req.params.id); return success(res, { message: 'Product deleted' }); }
module.exports = { getProducts, createProduct, updateProduct, deleteProduct };
