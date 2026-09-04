# Simple Insurance Application

Phase 0 provides a testable technical foundation:

- npm workspaces and shared TypeScript contracts;
- Next.js 16 with Tailwind CSS;
- Node.js with Express;
- MongoDB as a Docker single-node replica set;
- deterministic MongoDB migration runner;
- Docker Compose with only the web port published;
- formatting, linting, strict type-checking, unit/integration tests, builds, and CI image scanning.

Phase 2 adds common user/admin authentication, role-aware routing, and persistent user master profiles. Product matching and applications remain in later phases.

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

Every seeded product is visibly marked `[TEST ONLY]` and must not be treated as approved insurance or rating policy.

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
| Profiled user | `profiled.user@example.test` | `ProfiledUser123!` | Product catalog placeholder        |
| Administrator | `admin@example.test`         | `AdminUser123!`    | Admin application-list placeholder |

The new-user flow accepts age, positive decimal sum assured in IDR, a canonical payment frequency, and a payment method. After saving, sign out and sign back in to verify that the persisted profile routes directly to `/products`. These accounts and credentials are test data only and must never be enabled as real deployment accounts.

The automated Phase 2 checks are included in the standard suite:

```sh
npm test
npm run test:integration
```

## Documentation

- `rules.md` — normative application rules
- `design.md` — target architecture and data design
- `plan.md` — phased implementation plan
