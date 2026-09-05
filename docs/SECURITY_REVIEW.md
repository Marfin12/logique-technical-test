# Phase 8 security review

Review date: 2026-09-05

## Endpoint authorization matrix

| Endpoint group | Authentication | Authorization and data scope | CSRF / abuse control |
| --- | --- | --- | --- |
| `POST /api/v1/auth/register`, `POST /api/v1/auth/login` | Public | Registration always creates `USER`; login uses a non-enumerating failure | Strict origin/fetch-metadata check; 10 attempts per 15 minutes per proxy-forwarded client IP |
| `POST /api/v1/auth/logout` | Cookie optional | Clears only the caller's cookie | Strict origin/fetch-metadata check |
| `GET/PUT /api/v1/me/profile` | Required | Service requires `USER`; repository query is scoped by authenticated user ID | `PUT` has strict origin/fetch-metadata check |
| `GET /api/v1/products/*` | Required | Service requires `USER`; eligibility and premium are server-authoritative | Read-only; product IDs are validated |
| `/api/v1/me/applications/*` | Required | Service requires `USER`; reads and writes include authenticated `userId`, status, version, and `isDeleted: false` | Every POST/PATCH/DELETE has strict origin/fetch-metadata check and idempotency/version guards where applicable |
| `/api/v1/admin/*` | Required | Service requires `ADMIN`; draft records are excluded from admin repository queries | Every lifecycle POST has strict origin/fetch-metadata check and an atomic expected-status guard |
| `POST /api/v1/chat/messages` | Required | Service requires `USER`; application lookup is owner-scoped and chat cannot invoke mutations | Strict origin/fetch-metadata check; 20 requests per minute per proxy-forwarded client IP |
| `GET /internal/metrics` | Internal network only | Contains aggregate process counters and no user content | Not routed through the public Next.js proxy |

## Controls verified in code

- Sessions are signed, `HttpOnly`, `SameSite=Strict`, and expire after 30 minutes.
- The API trusts exactly one proxy hop so per-client rate limiting can use the forwarded address.
- Cross-site browser mutations are rejected using both `Origin`/host comparison and Fetch Metadata where supplied.
- React renders user/product text as escaped text. No raw HTML rendering is used.
- Request logs contain request ID, method, path, status, and duration only. Bodies, credentials, cookies, Gemini keys, prompts, and answers are excluded.
- MongoDB queries enforce role/ownership in services and owner/status/deletion constraints in repository filters.
- Draft saves use an expected version. Submission and admin transitions use transactions and expected-status filters.
- Application status filters are allow-listed against the shared canonical enum.

## Residual risks and release blockers

- Plain HTTP does not provide transport encryption or server identity. This profile is limited to loopback or an explicitly protected trusted LAN/VPN and must not carry real sensitive data on an untrusted network.
- The in-memory rate limiter and metrics reset when the API restarts and are per API replica. A shared store/collector is required before horizontal scaling.
- Demo insurance eligibility, rating, benefit, limitation, and schema values are not business-approved. They remain marked internally as `testOnly` and are disclosed as a demo configuration in the UI.
- A production release still requires business/legal approval, external vulnerability-scan evidence, restore evidence for the target environment, and cross-browser/OS sign-off.
