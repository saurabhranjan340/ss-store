const prisma = require('../utils/prisma');
async function listCategories() { return prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } }); }
async function createCategory(data) { return prisma.category.create({ data }); }
module.exports = { listCategories, createCategory };
