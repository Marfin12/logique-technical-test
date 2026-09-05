# Phase 8 release record

Review date: 2026-09-05

## Automated and locally verifiable gates

| Gate | Evidence / command | State |
| --- | --- | --- |
| Strict TypeScript, unit tests, lint, build | `npm run verify` | Passed locally on 2026-09-05: 65 tests and production build |
| Database validators, indexes, transactions, query plans | `docker compose --profile tools run --build --rm db-verify` | Run for each release candidate |
| Migration and deterministic demo seed | `docker compose up -d --build --wait`; `docker compose --profile tools run --build --rm seed` | Run for each release candidate |
| Authorization/ownership/CSRF/rate limit | Backend direct-API tests and `docs/SECURITY_REVIEW.md` | Implemented; rerun tests |
| Correlation and operational telemetry | Structured API logs and internal `/internal/metrics` | Implemented |
| Bounded load and optimistic concurrency | 50 concurrent catalog/application reads plus 8 simultaneous updates to one draft | Passed locally on 2026-09-05: no read failures; 1 update succeeded and 7 stale updates received `409` |
| Backup and recovery | `docs/OPERATIONS_RUNBOOK.md` isolated restore procedure | Procedure defined; target restore evidence required |
| Production dependency advisory scan | `npm audit --omit=dev --audit-level=high` | Passed locally on 2026-09-05: zero reported vulnerabilities |
| Container image vulnerability scan | CI Trivy jobs for API and web images | Configured; passing CI evidence still required |
| HTTP limitation | Login and authenticated UI warnings plus runbook | Implemented |

## Acceptance walkthrough

1. Register a customer and complete the profile.
2. Confirm only compatible products and server-calculated premiums appear.
3. Open and leave product detail without interaction; confirm no draft exists.
4. Select an insurance type or change a product field; confirm one saved draft.
5. Resume, edit, and submit the draft; confirm it becomes read-only.
6. Sign in as admin; confirm drafts are absent and Start Review is on the Submitted list row.
7. Start review, then approve or reject from detail. Confirm direct detail reads do not change status.
8. Sign in as the customer and confirm product details, lifecycle status, and rejection note where applicable.
9. Exercise chat scope, rate limit, local fallback, and own-application-only status behavior.

## External/manual sign-offs still required

- Approved eligibility limits, premium factors, field schemas, benefit/limitation wording, currency, and product catalog content.
- Windows, macOS, Linux/ChromeOS browser matrix at 1024×768 and above, including 200% zoom/text scaling and keyboard-only use.
- Accessibility review with assistive technology available to the team.
- Target-environment firewall/VPN and explicit plain-HTTP risk acceptance.
- Target-environment backup/restore drill, retained monitoring, alert delivery, and named operational owner.
- Passing CI vulnerability scan and any organization-specific security review.

The current catalog is a demo configuration, not an approved production insurance offering. UI labels intentionally say “Demo” instead of showing legacy `[TEST ONLY]` prefixes; the database retains `testOnly: true` so it cannot be mistaken for approved configuration.
