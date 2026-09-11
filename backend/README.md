# SS Store Backend

Express + PostgreSQL + Prisma API for products, categories, orders, and inventory-safe checkout.

## Setup

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
cp .env.example .env
# Update DATABASE_URL in .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API runs at `http://localhost:4000`.

## Endpoints

- `GET /health`
- `GET /api/products?search=soap&categoryId=1&skip=0&take=50`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/categories`
- `POST /api/categories`
- `POST /api/orders`
- `GET /api/orders`
- `PUT /api/orders/:id/status`

### Create an order

Every create request must carry an idempotency key. Prefer the standard header; the body field is supported as a fallback.

```json
{
  "phone": "+919876543210",
  "items": [
    {"productId": 1, "quantity": 2},
    {"productId": 4, "quantity": 1}
  ]
}
```

```http
POST /api/orders
Idempotency-Key: checkout-2026-09-11-abc123
Content-Type: application/json
```

The same key returns the original order instead of creating a second order. The unique database constraint is the final race-condition guard if two identical requests arrive at the same time.

### Order lifecycle

`PENDING → CONFIRMED → PACKED → OUT_FOR_DELIVERY → DELIVERED`

`PENDING` and `CONFIRMED` may transition to `CANCELLED`. `DELIVERED` and `CANCELLED` are terminal. Any other transition returns `409`.

Cancelling a `PENDING` or `CONFIRMED` order restores every reserved quantity in the same serializable transaction. Cancellation is not allowed after packing has started.

## Inventory safety

Order creation uses a serializable Prisma transaction. Each stock decrement is guarded with `WHERE stock >= quantity`; if a concurrent order consumes the stock first, the guarded update affects zero rows and the transaction rolls back. Prices are read from PostgreSQL and snapshotted into `OrderItem.price`, never trusted from the client or recalculated later.

Orders are associated with a minimal user record by normalized phone number. There is intentionally no auth or payment layer yet.

## Production notes

Before public launch, add authentication/authorization for writes, rate limiting, structured logging, API versioning, pagination/filtering on orders, payment integration, delivery assignment, and an idempotency-key fingerprint if keys become client-visible across accounts.
