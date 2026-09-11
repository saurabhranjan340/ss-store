const service = require('../services/categoryService'); const { success } = require('../utils/apiResponse');
async function getCategories(req, res) { return success(res, { data: await service.listCategories() }); }
async function createCategory(req, res) { return success(res, { status: 201, message: 'Category created', data: await service.createCategory(req.body) }); }
module.exports = { getCategories, createCategory };
