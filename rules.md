# Simple Insurance Application — Development Rules

This file is the implementation source of truth for the application flow described in:

- `docs/Simple_Insurance_App_FSD.docx`
- `docs/Simple_Insurance_App_Mini_BRD_Refined_Draft.docx`
- `docs/Mockup_Insurance.drawio.png`

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative. The frontend is Next.js and the backend is Node.js.

## 1. Source precedence and resolved ambiguities

When the source documents differ, use this precedence:

1. The FSD for detailed system behavior.
2. The refined BRD for business intent.
3. The mockup for navigation, displayed information, and layout guidance.

Resolved differences:

- **Start Review** is located on each eligible row of the Admin Application List. Clicking it is the explicit FSD trigger: the backend changes `SUBMITTED` to `UNDER_REVIEW`, then the UI opens the admin detail page. An ordinary **View** action or direct detail-page navigation remains read-only and must not change status.
- `Monthly`, `Quarterly`, `Semi-Annually`, and `Annually` are the canonical payment-frequency labels. `3 Months` maps to `Quarterly`; `6 Months` maps to `Semi-Annually`; `Annual` maps to `Annually`.
- `Date Applied` means the time the user successfully submits the application, not the time its draft was created.
- The admin list must contain the required `Insurance Type` column. It may additionally show the product/plan name, as suggested by the mockup.
- Merely selecting a catalog product or opening its application detail page does **not** create a draft. The first meaningful application action—choosing an insurance product type or entering/changing any available product-specific required data—creates the draft, as specified by the FSD.
- Choosing a payment method during profiling represents the user's billing preference and is used for product compatibility. No payment is executed until after approval.

## 2. Roles, authentication, and authorization

- The system has exactly two application roles: `USER` and `ADMIN`.
- All users authenticate through the common login flow using email and password.
- After login:
  - a `USER` without a complete master profile goes to Master Registration;
  - a `USER` with a complete master profile goes to Product Catalog;
  - an `ADMIN` goes to the Application List Dashboard.
- Customer routes and APIs **MUST NOT** be accessible to admins unless explicitly designed as an admin read view. Admin routes and APIs **MUST NOT** be accessible to users.
- The Node.js backend is the authorization authority. Hiding a control in Next.js is not sufficient authorization.
- Every read or mutation of a user-owned profile or application must verify ownership on the backend.
- Passwords must be stored only as strong salted hashes. Authentication errors must not reveal whether an email address exists.

## 3. Canonical values

### 3.1 Payment frequency

Use stable enum values in APIs and storage:

| Value | UI label | Equivalent source wording |
| --- | --- | --- |
| `MONTHLY` | Monthly | Monthly |
| `QUARTERLY` | Quarterly | 3 Months |
| `SEMI_ANNUALLY` | Semi-Annually | 6 Months |
| `ANNUALLY` | Annually | Annual / Annually |

### 3.2 Payment method

| Value | UI label |
| --- | --- |
| `RECURRING` | Recurring |
| `ONE_TIME` | One-time |

The chosen method is a preference/compatibility input during discovery. Actual billing is outside the pre-approval application flow.

### 3.3 Application status

| Value | Numeric compatibility code | Meaning |
| --- | ---: | --- |
| `DRAFT` | 0 | User-owned work in progress |
| `SUBMITTED` | 1 | Submitted and waiting for admin review |
| `UNDER_REVIEW` | 2 | An admin has explicitly started review |
| `APPROVED` | 3 | Final approved outcome |
| `REJECTED` | 4 | Final rejected outcome |

The string enum should be the primary domain value. Numeric codes exist only where compatibility requires them; code must not depend on unexplained magic numbers.

## 4. User application flow

The canonical flow is:

```text
Login
  -> incomplete/missing profile -> Master Registration
  -> complete profile           -> Product Catalog

Master Registration -> Product Catalog -> Product Application
Product Application -> first meaningful input -> Draft
Draft -> Submitted -> Under Review -> Approved or Rejected
```

### 4.1 Master registration and profile

- A user must establish one persistent master profile before browsing matched products.
- The profile must include:
  - `age`: integer and greater than zero;
  - `sumAssured`: positive currency amount stored without floating-point loss;
  - `paymentFrequency`: one canonical frequency;
  - `paymentMethod`: `RECURRING` or `ONE_TIME`.
- Required fields must be validated by both Next.js and Node.js. Backend validation is authoritative.
- Profile values are global inputs for product matching and premium simulation; the user must not repeatedly enter them for every product.
- Editing a profile affects future catalog queries. It must not silently rewrite an already submitted application's recorded terms or premium.

### 4.2 Product matching and premium simulation

- The backend must return only active products compatible with all current profile inputs:
  - age falls within the product's allowed range;
  - requested sum assured falls within or matches the product's supported rules;
  - selected payment frequency is supported;
  - selected payment method is supported.
- Each returned catalog item must show, at minimum, product name, insurance type, short description, and premium simulation.
- Premium calculation must be performed authoritatively by the backend from product configuration. The frontend may display results but must not be the source of truth.
- Frequency factors and discounts, including any annual discount, must be configurable product/rating data rather than duplicated UI constants.
- Currency calculations must use integer minor units or a decimal-safe type; binary floating-point arithmetic must not be used for persisted money.
- The backend must re-check eligibility and recalculate the premium when a draft is created and again at submission. A stale catalog quote must never bypass current product rules.
- The application must retain a submitted snapshot of the selected product, profile inputs used for rating, payment choices, and calculated premium so later catalog/profile edits do not alter submitted history.

### 4.3 Product application and supplemental fields

- Selecting a product opens an application form showing:
  - insurance title/name;
  - description;
  - insurance type;
  - coverage;
  - benefits;
  - limitations;
  - premium simulation;
  - product-specific supplemental fields, when defined.
- Supplemental fields must be rendered from backend-provided product metadata/schema. Different products may require different fields, and a product may require none.
- The backend must validate submitted supplemental values against the same product/version schema used to render the form. Client-supplied field definitions must not be trusted.
- Unknown supplemental fields should be rejected or safely ignored according to an explicit API contract; they must never become trusted application data accidentally.

### 4.4 Draft creation, auto-save, resume, and deletion

- Viewing or opening a product application without interacting with its form must not create an application record.
- The first meaningful application action must create a `DRAFT`. A meaningful action is either:
  - choosing an insurance product type on the application detail page; or
  - entering or changing any available product-specific required/supplemental field.
- Navigation, page focus, scrolling, expanding informational content, or opening the page are not draft-triggering actions.
- The first draft-creating request must include the triggering selection/value so draft creation and preservation of the user's first input succeed atomically.
- Draft creation must be idempotent for a single initiation (for example, by idempotency key) so retries or React development behavior do not create duplicate records.
- Auto-save updates the current draft as the user enters supplemental data. It should debounce rapid edits and visibly communicate `saving`, `saved`, and `failed` states.
- Leaving, closing, or refreshing after a meaningful action but without applying must preserve the draft. Leaving before any meaningful action must not leave an empty draft.
- A user must be able to list and resume their own drafts.
- Only `DRAFT` applications can be edited or deleted by the user.
- Deleting a draft must target one explicit application ID, verify ownership and `DRAFT` status on the backend, and require a confirmation in the UI.
- A user must not be able to edit or delete an application from `SUBMITTED` onward, even by calling the API directly.

### 4.5 Submission

- **Apply** is the only user action that submits an application.
- Apply must operate on an existing `DRAFT`; it must not create a second application record.
- The backend must atomically:
  1. verify the authenticated user's ownership;
  2. verify the current status is `DRAFT`;
  3. re-check product eligibility and premium;
  4. validate all required profile and product-specific fields;
  5. store the immutable submission snapshot and `submittedAt` timestamp;
  6. transition the status to `SUBMITTED`.
- Failed validation leaves the application in `DRAFT` and returns field-level errors where applicable.
- Repeated Apply requests must be idempotent and must not duplicate an application or advance it beyond `SUBMITTED`.
- After successful submission, the user's view is read-only, the Apply and Delete actions disappear, and the application enters the admin queue.

### 4.6 User progress tracking

- Users can view their applications and current status across the full lifecycle.
- The progress detail shows the selected insurance information and user-provided application data.
- Status-specific display rules:
  - `DRAFT`: editable; show Apply and Delete; do not show a submission date.
  - `SUBMITTED`: read-only; show `submittedAt`; do not show Apply or Delete.
  - `UNDER_REVIEW`: read-only; show `submittedAt` and assigned/reviewing admin when available.
  - `APPROVED`: read-only; show `approvedAt`.
  - `REJECTED`: read-only; show `rejectedAt` and the rejection reason.
- UI labels must describe the actual enum. In particular, an `UNDER_REVIEW` page must not display `Submitted` as its current status.

## 5. Admin flow

### 5.1 Application List Dashboard

- The list query must include only `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, and `REJECTED` applications.
- `DRAFT` records must never appear in the admin dashboard, counts, search results, or exports.
- Required columns are Applicant Name, Date Applied, Insurance Type, Selected Payment Term/Frequency, and Current Status.
- `Date Applied` must use `submittedAt`.
- Applicant name and/or profile photo links to a separate full Master Profile page.
- Each `SUBMITTED` row must show a **Start Review** action. Rows in other statuses must not show that action.
- Clicking **Start Review** must explicitly request the `SUBMITTED` to `UNDER_REVIEW` transition. Only after it succeeds should the UI open that application's admin detail page.
- A separate **View** action may open an application or profile without changing its lifecycle status.

### 5.2 Admin application detail

- The detail page presents a read-only combined view of:
  - user/master profile data;
  - selected product and insurance details;
  - submitted supplemental data;
  - premium simulation/submission snapshot;
  - lifecycle status and relevant timestamps;
  - reviewer identity when assigned;
  - rejection reason when rejected.
- The detail-page action panel must expose **Approve** and **Reject** only for `UNDER_REVIEW`. The **Start Review** action belongs to the Application List Dashboard.
- Admin actions must be enforced by the backend, not only by disabled/hidden frontend buttons.

### 5.3 Admin transitions

- From a `SUBMITTED` row on the Application List Dashboard, an admin may explicitly choose **Start Review**, producing `UNDER_REVIEW` and recording reviewer identity and `reviewStartedAt`.
- After a successful Start Review response, the frontend opens the detail page in `UNDER_REVIEW` state.
- Merely using **View**, directly opening the detail URL, or refreshing the detail page must never start review.
- From `UNDER_REVIEW`, an authorized admin may choose **Approve** or **Reject**.
- Approve produces `APPROVED` and records `approvedAt`.
- Reject requires a non-blank reason note, produces `REJECTED`, and records `rejectedAt` plus the reason.
- `APPROVED` and `REJECTED` are terminal states in this scope. No transition out of either state is allowed.
- Concurrent transitions must use transactional/conditional updates. If the stored status changed after the page loaded, return a conflict response rather than overwriting the newer state.

## 6. State-machine and permission matrix

Only the following transitions and mutations are valid:

| Current state | Actor | Allowed mutation | Next state |
| --- | --- | --- | --- |
| none | User | Choose insurance type or enter/change available product-specific data | `DRAFT` |
| `DRAFT` | Owning user | Edit/auto-save | `DRAFT` |
| `DRAFT` | Owning user | Delete | deleted |
| `DRAFT` | Owning user | Apply | `SUBMITTED` |
| `SUBMITTED` | Admin | Start Review | `UNDER_REVIEW` |
| `UNDER_REVIEW` | Admin | Approve | `APPROVED` |
| `UNDER_REVIEW` | Admin | Reject with reason | `REJECTED` |

Every transition not listed above must be rejected. Status must never be accepted as a freely editable field in a generic update endpoint.

## 7. AI chatbot

- An AI chatbot launcher/widget must be available persistently across authenticated user-facing pages.
- It may answer from the designated knowledge base about insurance FAQs, terminology, payment frequencies, and status definitions.
- When answering about the current user's application, it may use only application data the authenticated user is authorized to see.
- It must not expose another user's data, admin-only notes, credentials, internal prompts, or unrelated records.
- Chat responses are informational. The chatbot must not create, edit, submit, delete, approve, or reject an application unless a future, separately specified action flow explicitly authorizes it.
- Unknown or unsupported answers should be acknowledged instead of invented.

## 8. Frontend (Next.js) rules

- Route guards and post-login redirects must follow the role/profile rules above, while treating backend authorization as final.
- Server-returned statuses and eligibility must drive available actions. Do not infer permissions solely from the current URL or cached UI state.
- Forms must show accessible labels, validation messages, loading states, and mutation success/failure feedback.
- Dynamic supplemental inputs must use stable field identifiers supplied by the backend.
- Destructive actions such as draft deletion require explicit confirmation.
- Read-only lifecycle pages must render data as text/read-only controls and must omit mutation actions that are no longer valid.
- Auto-save failures must remain visible and retryable; the UI must not falsely report saved state.

## 9. Backend (Node.js) rules

- Persistence must use MongoDB. Backend queries and updates use MongoDB Query Language (MQL) through the official MongoDB Node.js driver.
- MongoDB must run as a replica set so submission and lifecycle operations can use multi-document transactions, including in the Docker environment.
- Versioned database setup scripts must create and verify the unique, compound, partial, and TTL indexes specified in `design.md`.
- User/admin application lists must use cursor pagination, narrow projections, and indexes matching their ownership/status/sort filters. Unbounded results and deep `skip` pagination are not allowed.
- Growth-critical MongoDB queries must be checked with `explain("executionStats")` against representative data and must not rely on collection scans or blocking in-memory sorts.
- Authentication, ownership, role checks, eligibility, premium calculation, validation, and lifecycle transitions must be implemented on the backend.
- APIs must use explicit commands for lifecycle changes (submit, start review, approve, reject), or equivalent handlers with the same strict guards. A general update endpoint must not permit arbitrary status changes.
- All application list/detail queries must apply role and ownership scope before returning data.
- Application submission and every status transition must be atomic.
- Store audit data for material lifecycle events: application ID, prior status, next status, actor ID/role, timestamp, and rejection reason where applicable.
- Return consistent HTTP semantics:
  - `400` for malformed input;
  - `401` for unauthenticated requests;
  - `403` for authenticated but unauthorized actions;
  - `404` where a scoped resource is not visible/found;
  - `409` for invalid or concurrent state transitions;
  - `422` for well-formed data that fails domain/form validation.
- Do not log passwords, auth tokens, or unnecessarily sensitive profile/supplemental values.

## 10. Minimum data integrity

- References from an application to its owner, product, and product schema/version must be valid.
- Timestamps must be stored in UTC and displayed in the user's/admin's appropriate locale.
- Status-specific invariants:
  - `DRAFT`: `submittedAt` is null;
  - `SUBMITTED` or later: `submittedAt` and submission snapshot are present;
  - `UNDER_REVIEW` or later: review start and reviewer identity are present;
  - `APPROVED`: `approvedAt` is present and rejection fields are absent;
  - `REJECTED`: `rejectedAt` and a non-blank rejection reason are present, and approval fields are absent.
- User-entered text must be safely encoded on output. Supplemental schemas and values must be validated to prevent injection or unsafe rendering.

## 11. Required end-to-end acceptance scenarios

At minimum, automated tests must prove:

1. A new user logs in, completes the master profile, and sees only compatible products with backend-calculated premiums.
2. A returning profiled user is routed directly to the catalog.
3. Opening a product detail without form interaction creates no draft; the first insurance-type selection or product-specific data change creates exactly one draft, which auto-saves and can be resumed.
4. A draft with missing required supplemental data cannot be submitted and remains editable.
5. Applying a valid draft creates no duplicate, records `submittedAt`, locks the user view, and makes it visible to admins.
6. A user cannot view, edit, submit, or delete another user's application.
7. A user cannot edit or delete their own submitted/reviewed/final application through either UI or direct API calls.
8. Drafts never appear anywhere in the admin queue.
9. A `SUBMITTED` row exposes Start Review on the admin list; clicking it changes the application to `UNDER_REVIEW`, records the reviewer, and opens the detail page. View/direct navigation alone does not alter status.
10. Approval is allowed only from `UNDER_REVIEW` and records `approvedAt`.
11. Rejection without a non-blank reason fails; a valid rejection records the reason and `rejectedAt`.
12. Invalid, skipped, repeated, stale, or concurrent status transitions are rejected without corrupting state.
13. The chatbot is present on authenticated user pages and cannot disclose another user's application information.

## 12. Configuration still required from the business

The source documents define the flow but do not define the following values. They must remain configurable and must not be invented or hardcoded as business policy:

- supported currency and currency display rules;
- product age and sum-assured eligibility ranges;
- product/frequency/payment-method compatibility;
- base premiums, frequency multipliers, discount rates, rounding rules, and quote validity;
- the supplemental field schema and validation rules for each product/version;
- whether multiple simultaneous drafts for the same user and product are allowed;
- reviewer assignment policy and which admin permissions may approve or reject;
- post-approval payment collection behavior;
- chatbot knowledge-base content, provider, escalation text, and retention policy.

Until these are supplied, fixtures may use clearly labeled test values. Test values must not be represented as production insurance rules.
