# SS Store production deployment

This release kit prepares the backend for deployment but does not publish it. Publishing requires access to the GitHub repository and deployment accounts, which are not available in this workspace.

## 1. Database: Neon or Supabase

1. Create a PostgreSQL project.
2. Copy its pooled or direct connection string into the backend service as `DATABASE_URL`.
3. Keep `sslmode=require` if the provider requires it.

## 2. Backend: Railway or Render

Recommended service root: `/backend`.

Required environment variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://<your-vercel-domain>
PORT=4000
REQUEST_TIMEOUT_MS=15000
RATE_LIMIT_MAX=120
ORDER_RATE_LIMIT_MAX=20
SENTRY_DSN=https://...
SENTRY_TRACES_SAMPLE_RATE=0.05
```

The container runs `prisma migrate deploy` before starting the API. The service binds to `0.0.0.0` and uses `process.env.PORT`, with `/health` configured as the platform health check.

For Render, use `render.yaml` or create a Docker web service with Dockerfile path `backend/Dockerfile`. For Railway, use `railway.json` and a Docker deployment. Set the service root to the repository root if the config references `backend/`.

## 3. Frontend: Vercel

1. Import the GitHub repository.
2. Set root directory to `/frontend`.
3. Add this Preview and Production variable:

```env
NEXT_PUBLIC_API_URL=https://<backend-domain>/api
```

4. Deploy and verify that the browser only calls the deployed backend URL.

Important: the current ClickUp frontend artifact is a working React preview, not a checked-in Next.js repository. Move the source into the real Next.js `/frontend` app before connecting Vercel. Do not point Vercel at the artifact preview as if it were a Next.js repo.

## 4. Prisma release sequence

Run from `/backend` in CI or the platform build step:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```

Never run `prisma migrate dev` against production.

## 5. Smoke test after deploy

```bash
API_URL=https://<backend-domain> ./scripts/smoke-test.sh
```

Then manually verify:

- frontend loads from Vercel
- `/health` returns `success: true` and `status: ok`
- products and categories load
- a checkout creates one order with an `Idempotency-Key`
- retrying that request returns the same order
- insufficient stock returns `409`
- admin order status options follow the lifecycle
- cancellation restores stock
- Sentry receives a test exception

## 6. Monitoring and operations

- Platform logs capture request logs, order creation logs, stock failures, and structured API errors.
- Sentry is optional at runtime and activates only when `SENTRY_DSN` is present.
- Rate limits protect the API globally and are stricter on order creation.
- Requests time out after `REQUEST_TIMEOUT_MS`.
- PostgreSQL connectivity is checked by `/health`.
- Configure uptime monitoring against `/health` and alert on non-200 responses.

## What is not included

Payment processing, delivery assignment, authentication/authorization, real-time order events, secrets provisioning, DNS, and the actual publish step still require provider accounts and production credentials.
