# Simple Insurance Application

Phase 0 provides a testable technical foundation:

- npm workspaces and shared TypeScript contracts;
- Next.js 16 with Tailwind CSS;
- Node.js with Express;
- MongoDB as a Docker single-node replica set;
- deterministic MongoDB migration runner;
- Docker Compose with only the web port published;
- formatting, linting, strict type-checking, unit/integration tests, builds, and CI image scanning.

Phase 2 adds user registration, common user/admin authentication, role-aware routing, and persistent user master profiles. Phase 3 adds profile-based product eligibility, server-calculated premiums, and product details. Applications remain in later phases.

Repository layout:

- `frontend/` — Next.js and Tailwind CSS
- `backend/` — Express and MongoDB integration
- `packages/contracts/` — shared TypeScript API contracts

The current frontend uses Server Components by default. A Client Component will be introduced only when a feature needs browser-side state, effects, event handlers, or browser APIs. Phase 0 also does not use a message queue because it has no asynchronous delivery workload yet; the decision boundary is documented in `design.md`.

## Run the complete foundation

Requirements: Docker with Docker Compose.

```sh
docker compose up --build
```

Open `http://localhost`. The API liveness check is proxied at `http://localhost/health/api`.

The listener binds to `127.0.0.1` by default. This HTTP-only setup is for local or trusted-network use and must not carry real customer data over an untrusted network.

## Configuration boundaries

`.env.example` contains infrastructure defaults only and no secrets. Any sample insurance products, premium factors, eligibility limits, or user records introduced in later phases must be clearly marked as test fixtures. Deployment values are not approved business policy until they are supplied and accepted by the product owner.

## Local development

Requirements: Node.js 22+, npm, and a MongoDB replica set.

```sh
npm install
npm run db:migrate
npm run dev
```

For a host-side migration using the Compose MongoDB service, start MongoDB first. The default URI uses `directConnection=true` so the host does not try to resolve MongoDB's internal Docker hostname:

```sh
docker compose up -d mongo
npm run build -w @insurance/backend
node backend/dist/migrations/migrate-cli.js
```

Alternatively, run the migration entirely inside Docker:

```sh
docker compose run --rm migrate
```

Next.js runs on `http://localhost:3000`; Express runs internally on `http://localhost:4000`.

The Express process retries an unavailable MongoDB connection every two seconds instead of terminating on the first failed attempt. Database failures after startup are passed through the centralized HTTP error boundary and return a structured `500` response with a request ID; repository and transaction errors are still rethrown so they cannot be mistaken for successful writes.

## Verify

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:coverage
npm run build
docker compose config
```

`npm test` includes unit tests plus a small Express integration test. The full CI flow is defined in `.github/workflows/ci.yml`.

## Phase 1 database verification

Run the MongoDB validator, exact-index, transaction, idempotency, keyset-pagination, narrow-projection, and query-plan checks in an isolated temporary database:

```sh
docker compose --profile tools run --rm db-verify
```

The verifier drops only its dedicated `insurance_phase1_verify` database when it finishes. To load the deterministic product fixtures into the development database, run:

```sh
docker compose --profile tools run --rm seed
```

Every seeded product is visibly marked as a demo configuration and remains `testOnly: true` in MongoDB. It must not be treated as approved insurance or rating policy.

Phase 1 provides canonical shared enums and DTOs, MongoDB JSON Schema validators and indexes, transactional repository primitives, decimal-safe money serialization, idempotency fingerprints and records, and keyset-paginated application queries. It does not expose user-facing product or application endpoints yet; those are introduced by later phases.

## Test Phase 2 authentication and profile

Set `AUTH_SECRET` in `.env` to a private random value containing at least 32 characters. If it is omitted, the API creates an ephemeral secret and all sessions end whenever the API restarts.

Start the application and load the deterministic test-only accounts:

```sh
docker compose up --build -d
docker compose --profile tools run --build --rm seed
```

Open `http://localhost/login` and test these isolated fixtures:

| Flow          | Email                        | Password           | Expected destination               |
| ------------- | ---------------------------- | ------------------ | ---------------------------------- |
| New user      | `new.user@example.test`      | `NewUser123!`      | Master profile setup               |
| Profiled user | `profiled.user@example.test` | `ProfiledUser123!` | Eligible product catalog           |
| Administrator | `admin@example.test`         | `AdminUser123!`    | Admin application-list placeholder |

The new-user flow accepts age, positive decimal sum assured in IDR, a canonical payment frequency, and a payment method. After saving, sign out and sign back in to verify that the persisted profile routes directly to `/products`. These accounts and credentials are test data only and must never be enabled as real deployment accounts.

The same login page provides **Create an account** for new customers. Self-registration always creates a `USER`; it cannot create an administrator. A registered user is signed in and routed directly to master-profile setup.

The automated Phase 2 checks are included in the standard suite:

```sh
npm test
npm run test:integration
```

## Test Phase 3 products and premiums

Sign in as `profiled.user@example.test`. Its default monthly/recurring profile matches both test products. The catalog displays exact premium strings calculated by the backend, and each card links to a detail page with insurance types, coverage, benefits, limitations, and supplemental-field metadata.

Change that profile to `Quarterly (3 Months)` and `One-time`. The health fixture becomes ineligible and disappears, while the life fixture remains visible with a recalculated premium. Directly opening an ineligible or inactive product returns a safe reason code instead of exposing hidden product configuration.

All eligibility limits, rates, frequency factors, method factors, and rounding settings in the repository are demo fixtures with `testOnly: true`. They are not approved insurance business values.

## Documentation

- `rules.md` — normative application rules
- `design.md` — target architecture and data design
- `plan.md` — phased implementation plan

## Phase 4: draft applications

Open a product detail page while signed in. Viewing and scrolling remain side-effect free; choosing an insurance type or changing a product-specific field creates one `DRAFT` application. Subsequent edits use optimistic versioning and display `Saving`, `Saved`, or a retryable failure. Drafts can be resumed from `/applications` and `/applications/:id`.

The draft API uses `POST /api/v1/me/applications/drafts` with an `Idempotency-Key`, `PATCH /api/v1/me/applications/:id/draft` with the current `version`, and owner-only `GET`/`DELETE` endpoints. Dynamic fields are validated against the active product version allow-list; unknown keys and wrong types are rejected.

## Phase 6: admin review

Sign in with the seeded admin account and open `/admin/applications`. Drafts are excluded. A submitted row exposes **Start Review**; the transition completes before navigation to the read-only detail page. Under-review detail pages expose **Approve** and **Reject**, with a required rejection reason. Direct detail navigation never changes status, and stale or terminal transitions return `409 Conflict`.

## Phase 7: insurance assistant

Authenticated customer pages include a persistent **Chat** launcher. The assistant uses local approved insurance/status content and may read only the authenticated customer's application status. It cannot invoke application mutations, access admin/other-customer context, or invent unsupported answers. Messages are not persisted. The endpoint is `POST /api/v1/chat/messages` and is rate-limited to 20 requests per minute per client.

The default provider remains local and requires no external account. To enable the optional Gemini API integration with automatic local fallback, follow [the Gemini setup guide](docs/GEMINI_SETUP.md).
