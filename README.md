# NestJS Online Store API

REST API for a simple online store built with NestJS. The API handles JWT authentication, categories, products, cart, order checkout, health checks, and OpenAPI documentation through Scalar.

## Stack

- NestJS 11 + TypeScript
- PostgreSQL
- Prisma ORM
- Zod + `nestjs-zod`
- JWT auth with Passport
- Argon2 password hashing
- Scalar API Reference + OpenAPI
- Helmet, CORS allowlist, auth endpoint throttling
- Jest + Supertest for unit/e2e tests

## Architecture Pattern

This project uses a **module-first / feature-first architecture**. Each domain has its own module folder containing its controller, service, schema/DTO, and repository when needed.

```txt
src/
  auth/
  users/
  categories/
  products/
  carts/
  orders/
  health/
  common/
  config/
  database/
```

Why this pattern:

- Clear domain boundaries; category logic does not mix with products, cart, or orders.
- Easier to grow as features expand because feature-related files stay close together.
- Tests and endpoint documentation are easier to trace from each domain module.
- Aligns with NestJS feature modules and dependency injection concepts.

Dependency direction stays simple:

```txt
controller -> service -> repository -> Prisma
```

Domain modules use repositories for data access. Modules export only contracts used by other modules; for example Products consumes `CategoriesService` through `CategoriesModule` rather than registering category data-access providers directly. `common/` is only for cross-cutting concerns such as guards, decorators, filters, or reusable utilities. Business logic stays inside domain modules.

## API Modules

- `Auth`: registration, login, current user profile.
- `Categories`: public list/detail, admin create/update/delete.
- `Products`: public list/detail, admin create/update/delete, category relation.
- `Cart`: customer active cart and item management.
- `Orders`: atomic checkout from cart, order list/detail, admin status update.
- `Health`: app + database readiness check.

Local base URL:

```txt
http://localhost:3000/api/v1
```

Scalar docs:

```txt
http://localhost:3000/docs
```

OpenAPI JSON:

```txt
http://localhost:3000/openapi.json
```

## Requirements

- Modern Node.js version compatible with NestJS 11.
- pnpm.
- Local PostgreSQL for development and tests.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create local env file from the example:

```bash
cp .env.example .env
```

Update `DATABASE_URL`, `DATABASE_URL_TEST`, and `JWT_SECRET` for your local environment.

## Environment Variables

| Variable                | Required | Example                                                                                | Description                                                                                                                                                                      |
| ----------------------- | -------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | yes      | `development`                                                                          | Runtime environment.                                                                                                                                                             |
| `PORT`                  | yes      | `3000`                                                                                 | HTTP app port.                                                                                                                                                                   |
| `DATABASE_URL`          | yes      | `postgresql://postgres:postgres@localhost:5432/nestjs_online_store?schema=public`      | PostgreSQL connection for the app.                                                                                                                                               |
| `DATABASE_URL_TEST`     | yes      | `postgresql://postgres:postgres@localhost:5432/nestjs_online_store_test?schema=public` | PostgreSQL connection for e2e tests.                                                                                                                                             |
| `JWT_SECRET`            | yes      | `change-me-in-local-env`                                                               | Secret used to sign JWTs. Use a strong value in `.env`; never commit real secrets.                                                                                               |
| `JWT_ACCESS_EXPIRES_IN` | yes      | `15m`                                                                                  | Access token lifetime.                                                                                                                                                           |
| `CORS_ORIGINS`          | yes      | `http://localhost:3000`                                                                | Comma-separated allowed origins. **Required (non-empty) when `NODE_ENV=production`; the app refuses to start otherwise.** In development/test an empty value allows all origins. |

## Database Migration

Generate Prisma client:

```bash
pnpm run prisma:generate
```

Run development migrations:

```bash
pnpm run prisma:migrate:dev
```

Deploy migrations for non-development environments:

```bash
pnpm run prisma:migrate:deploy
```

Seed local development data:

```bash
pnpm run prisma:seed
```

Seeder creates realistic demo data: 8 categories, 40 products, 11 users, active carts, and sample orders across `PENDING`, `PAID`, `CANCELLED`, and `FULFILLED` states. Seeded users share this local-only demo password:

```txt
Password123!
```

Useful demo accounts:

```txt
admin@onlinestore.test
maya.putri@example.test
bima.pratama@example.test
```

Open Prisma Studio when needed:

```bash
pnpm run prisma:studio
```

## Run App

Development:

```bash
pnpm run start:dev
```

Production build:

```bash
pnpm run build
pnpm run start:prod
```

Health check:

```bash
curl http://localhost:3000/api/v1/health
```

## Run Tests

Lint:

```bash
pnpm run lint
```

Unit tests:

```bash
pnpm run test
```

Unit coverage:

```bash
pnpm run test:cov:unit
```

E2E tests:

```bash
pnpm run test:e2e
```

E2E coverage is available separately when needed:

```bash
pnpm run test:cov:e2e
```

Build:

```bash
pnpm run build
```

E2E specs live under `test/e2e/**/*.e2e-spec.ts` by module. Shared test bootstrap, in-memory Prisma support, auth helpers, fixtures, and assertions live under `test/support/**`.

Unit coverage excludes generated Prisma client, bootstrap/module files, and declarative schema files so the report focuses on service, guard, filter, and config logic.

E2E tests use `DATABASE_URL_TEST`. Make sure the test database exists and is safe for test setup reset operations.

## Auth Flow Example

Register customer:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@example.com","password":"Password123","name":"Customer"}'
```

Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@example.com","password":"Password123"}'
```

Login response includes `accessToken`. Use the token for protected endpoints:

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H 'Authorization: Bearer <accessToken>'
```

Admin endpoints such as category/product creation require a user with the `ADMIN` role.

For local development, create an admin by registering a normal user, then update only that local/test database row to `ADMIN` through Prisma Studio or a one-off local script. Do not hardcode admin credentials or commit seed passwords. Production admin creation should use an approved operational path against the target environment.

## Core Endpoints

| Method   | Path                             | Auth   | Description                        |
| -------- | -------------------------------- | ------ | ---------------------------------- |
| `GET`    | `/api/v1/health`                 | Public | App + DB health.                   |
| `POST`   | `/api/v1/auth/register`          | Public | Register customer.                 |
| `POST`   | `/api/v1/auth/login`             | Public | Login and receive JWT.             |
| `GET`    | `/api/v1/auth/me`                | Bearer | Current user.                      |
| `GET`    | `/api/v1/categories`             | Public | List active categories.            |
| `GET`    | `/api/v1/categories/:id`         | Public | Category detail.                   |
| `POST`   | `/api/v1/categories`             | Admin  | Create category.                   |
| `PATCH`  | `/api/v1/categories/:id`         | Admin  | Update category.                   |
| `DELETE` | `/api/v1/categories/:id`         | Admin  | Deactivate category.               |
| `GET`    | `/api/v1/products`               | Public | List active products with filters. |
| `GET`    | `/api/v1/products/:id`           | Public | Product detail with category.      |
| `POST`   | `/api/v1/products`               | Admin  | Create product.                    |
| `PATCH`  | `/api/v1/products/:id`           | Admin  | Update product.                    |
| `DELETE` | `/api/v1/products/:id`           | Admin  | Deactivate product.                |
| `GET`    | `/api/v1/cart`                   | Bearer | Active cart.                       |
| `POST`   | `/api/v1/cart/items`             | Bearer | Add cart item.                     |
| `PATCH`  | `/api/v1/cart/items/:id`         | Bearer | Update item quantity.              |
| `DELETE` | `/api/v1/cart/items/:id`         | Bearer | Remove item.                       |
| `POST`   | `/api/v1/orders/checkout`        | Bearer | Checkout active cart atomically.   |
| `GET`    | `/api/v1/orders?page=1&limit=10` | Bearer | List own orders with pagination.   |
| `GET`    | `/api/v1/orders/:id`             | Bearer | Order detail.                      |
| `PATCH`  | `/api/v1/orders/:id/status`      | Admin  | Update order status.               |

## API Docs

Run the app and open:

```txt
http://localhost:3000/docs
```

Docs include tags per module, request/response schemas from Zod DTOs, standard error response schemas (`400`, `401`, `403`, `404`, `409`) for important endpoints, and bearer auth scheme for protected endpoints.

## Domain Policies

- Category and product `slug` fields are optional on create/update. When omitted with `name`, the API generates a URL-friendly slug from `name`; if that generated slug already exists, a random hex suffix is appended (for example `books-a1b2c3`). Explicit duplicate slugs still return `409`.
- Category deactivation is soft-delete style: the category becomes inactive, but existing products keep their own `isActive` value unchanged.
- Public product queries require both product and category to be active, so products under inactive categories disappear from public catalog responses.
- Cart add-item uses the same visibility rule and rejects inactive products or products under inactive categories.
- Existing order item snapshots stay unchanged when category/product visibility changes.

## Security Notes

- Do not commit `.env` or real secrets.
- Replace `JWT_SECRET` in local/prod with a strong value.
- Passwords are hashed with Argon2 and never returned in responses.
- CORS is controlled through `CORS_ORIGINS`.
- Auth endpoints use basic throttling.
- The app uses `helmet` for common security headers.
- Graceful shutdown is enabled via `app.enableShutdownHooks()` (SIGTERM/SIGINT trigger `OnModuleDestroy` lifecycle hooks, including Prisma `$disconnect`).

## Prisma 7 Generated Client

The Prisma schema uses the new `prisma-client` generator which emits **TypeScript** source files into `src/generated/prisma/`. Those sources reference each other with literal `.ts` import paths (e.g. `import "./internal/class.ts"`).

The following `tsconfig.json` compiler options are required so that the emitted JavaScript (both `nest build` output and ts-jest in-memory output) can resolve the dependencies at runtime:

```jsonc
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
  },
}
```

For tests, `test/jest-resolver.cjs` is wired as the Jest `resolver` in both `package.json` (unit) and `test/jest-e2e.json` (e2e). It maps `.js` requires that originate from `src/generated/**` back to the corresponding `.ts` source files (which are the only files on disk for that directory; the actual `.js` files only exist in `dist/` after `nest build`).

If you regenerate the Prisma client with a different output strategy (e.g. move it to `node_modules/.prisma/client`, or switch back to the legacy `prisma-client-js` generator), the custom resolver and the two `tsconfig` flags can be removed.
