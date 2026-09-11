function decimalToNumber(value) { return value === null || value === undefined ? value : Number(value); }
function serializeProduct(product) { return { ...product, price: decimalToNumber(product.price), mrp: decimalToNumber(product.mrp) }; }
function serializeOrder(order) { return { ...order, totalAmount: decimalToNumber(order.totalAmount), items: order.items?.map((item) => ({ ...item, price: decimalToNumber(item.price), product: item.product ? serializeProduct(item.product) : undefined })) }; }
module.exports = { serializeProduct, serializeOrder };
