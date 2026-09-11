const prisma = require('../utils/prisma');
const { serializeProduct } = require('../utils/serializers');
async function listProducts({ categoryId, search, skip = 0, take = 50 }) {
  const where = { ...(categoryId ? { categoryId: Number(categoryId) } : {}), ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) };
  const [products, total] = await prisma.$transaction([prisma.product.findMany({ where, orderBy: { name: 'asc' }, skip, take, include: { category: true } }), prisma.product.count({ where })]);
  return { items: products.map(serializeProduct), total, skip, take };
}
async function createProduct(data) { return serializeProduct(await prisma.product.create({ data, include: { category: true } })); }
async function updateProduct(id, data) { return serializeProduct(await prisma.product.update({ where: { id }, data, include: { category: true } })); }
async function deleteProduct(id) { await prisma.product.delete({ where: { id } }); }
module.exports = { listProducts, createProduct, updateProduct, deleteProduct };
