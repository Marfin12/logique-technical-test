# Simple Insurance Application

Phase 0 provides a testable technical foundation:

- npm workspaces and shared TypeScript contracts;
- Next.js 16 with Tailwind CSS;
- Node.js with Express;
- MongoDB as a Docker single-node replica set;
- deterministic MongoDB migration runner;
- Docker Compose with only the web port published;
- formatting, linting, strict type-checking, unit/integration tests, builds, and CI image scanning.

Business features, authentication, profiles, products, and applications begin in later phases.

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

## Documentation

- `rules.md` — normative application rules
- `design.md` — target architecture and data design
- `plan.md` — phased implementation plan
