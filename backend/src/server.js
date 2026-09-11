require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const prisma = require('./utils/prisma');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { rateLimit, requestTimeout } = require('./middlewares/requestGuard');
const { setupSentry } = require('./utils/sentry');

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim()) : true;

setupSentry(app);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(requestTimeout(Number(process.env.REQUEST_TIMEOUT_MS || 15_000)));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 60_000, max: Number(process.env.RATE_LIMIT_MAX || 120) }));
app.use('/api/orders', rateLimit({ windowMs: 60_000, max: Number(process.env.ORDER_RATE_LIMIT_MAX || 20), message: 'Too many order attempts. Please wait a moment.' }));

app.get('/health', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, status: 'ok', message: 'SS Store API is healthy', data: { uptime: process.uptime(), timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const server = app.listen(port, '0.0.0.0', () => console.log(`SS Store API listening on port ${port}`));
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

async function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
