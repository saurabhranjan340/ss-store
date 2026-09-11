let Sentry = null;

try {
  Sentry = require('@sentry/node');
} catch {
  Sentry = null;
}

function setupSentry(app) {
  if (!Sentry || !process.env.SENTRY_DSN) return;
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development', tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05) });
}

function captureException(error, context = {}) {
  if (!Sentry || !process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => { scope.setExtras(context); Sentry.captureException(error); });
}

module.exports = { setupSentry, captureException };
