# Architecture
## Claim Reconciliation — v1

## 1. Architectural principles

1. **Backend is authoritative.** React must not independently calculate reconciliation amounts/status.
2. **Money is integer cents.** Convert to rupees only for presentation.
3. **Source history is preserved.** Do not discard unmatched remittances or earlier remittance rows.
4. **Explicit layers.** Keep HTTP routing, validation, business logic, persistence, and UI responsibilities separate.
5. **Deterministic behavior.** Same valid input and stored records produce the same results.
6. **Small scope.** Prefer a clear, testable implementation over unnecessary abstractions or premature microservices.

## 2. High-level component flow

```text
Synthetic CSV files
       |
       v
Controlled import command
       |
       +--> Parse + validate rows
       +--> Insert claims
       +--> Insert remittances / preserve unmatched source IDs
       +--> Row-level import report
       |
       v
MySQL
  claims (1) ---- (many) remittances
       |
       v
Repository / query layer
       |
       v
Reconciliation service
  - aggregates remittances
  - calculates difference
  - derives status
  - derives review flags
       |
       v
FastAPI endpoints
       |
       v
React UI
  - dashboard
  - claims table + filters
  - claim detail/history
  - unmatched remittances
```

## 3. Suggested repository layout

The exact layout may adapt to an existing starter repository, but keep responsibilities recognizable.

```text
claim-reconciliation/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── health.py
│   │   │   ├── summary.py
│   │   │   ├── claims.py
│   │   │   └── remittances.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── db/
│   │   │   ├── session.py
│   │   │   └── models.py
│   │   ├── schemas/
│   │   │   ├── claim.py
│   │   │   ├── remittance.py
│   │   │   ├── summary.py
│   │   │   └── errors.py
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── reconciliation.py
│   │   │   └── import_service.py
│   │   └── scripts/
│   │       └── import_data.py
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── requirements.txt (or pyproject.toml)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── .env.example
├── data/
│   ├── claims.csv
│   └── remittances.csv
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── RULES.md
│   ├── DESIGN.md
│   ├── TASKS.md
│   └── MEMORY.md
├── README.md
├── .gitignore
└── LICENSE (only if appropriate)
```

Do not create duplicate layers that merely forward calls without adding validation or responsibility. Keep this structure pragmatic.

## 4. Backend layer responsibilities

### API/router layer
- Defines routes and HTTP status codes.
- Validates query parameters and path IDs.
- Calls service/repository methods.
- Maps expected errors to stable response formats.
- Does not contain reconciliation formulas or ad-hoc SQL aggregation logic.

### Schema layer
- Defines request/response shapes and type constraints.
- Uses nullable `difference_cents` for no-remittance claims.
- Uses stable status and flag strings.
- Keeps money as integer cents.

### Service layer
- Owns calculation, status, denial history, and flags.
- Has pure functions for calculations where possible.
- Can be unit-tested without a database or HTTP server.
- Does not assume “balanced” means no denial or no review flags.

### Repository/data-access layer
- Owns database queries.
- Aggregates all matched remittance rows per claim.
- Supports filters and pagination.
- Avoids N+1 query patterns on the claims list.
- Ensures unmatched remittances are queryable.

### Import layer
- Reads source CSVs with explicit encodings and expected headers.
- Validates rows before insertion.
- Loads claims before remittances.
- Tracks accepted, rejected, duplicate/no-op, and conflicting rows.
- Does not overwrite an existing ID.
- Uses transaction boundaries that prevent partial writes.
- Emits a human-readable report and a nonzero process exit status only when the import policy defines the run as failed; document exact exit behavior before implementation.

## 5. Database relationships

### `claims`
- `claim_id VARCHAR(20) PRIMARY KEY`
- `patient_account VARCHAR(50) NOT NULL`
- `payer VARCHAR(100) NOT NULL`
- `service_date DATE NOT NULL`
- `cpt VARCHAR(10) NOT NULL`
- `billed_cents BIGINT NOT NULL`, constrained to nonnegative values

### `remittances`
- `remit_id VARCHAR(20) PRIMARY KEY`
- `source_claim_id VARCHAR(20) NOT NULL`: exact source reference, even when unmatched
- `claim_id VARCHAR(20) NULL`: foreign key to `claims.claim_id`
- `payer VARCHAR(100) NOT NULL`
- `paid_cents BIGINT NOT NULL`
- `adjustment_cents BIGINT NOT NULL`
- `patient_responsibility_cents BIGINT NOT NULL`
- `reason_code VARCHAR(30) NULL`
- `posted_date DATE NOT NULL`

All three amount fields are nonnegative in v1. The application must validate this; database CHECK constraints may also be used if supported by the selected MySQL version. Use an index on `remittances.claim_id`; consider indexes on `claims.payer` and columns used for filtering.

Store `source_claim_id` separately from nullable `claim_id` so unmatched data is preserved while the FK remains valid.

## 6. API contracts

### `GET /api/health`
- `200`: `{"status":"ok","database":"connected"}`
- `503`: safe response if DB is unavailable.
- Do not reveal credentials, connection strings, or stack traces.

### `GET /api/summary`
Returns counts and totals:
- `total_claims`
- `balanced_claims`
- `unbalanced_claims`
- `claims_without_remittance`
- `total_billed_cents`
- `matched_paid_cents`
- `all_remittance_paid_cents`
- `unmatched_remittance_count`
- `unmatched_remittance_paid_cents`
- `claims_with_denial_history`
- `claims_flagged_for_review`

Expected values for the supplied data:
- total claims: 12
- balanced: 5
- unbalanced: 6
- no remittance: 1
- total billed: 170000 cents
- matched paid: 99000 cents
- all remittance paid: 104000 cents
- unmatched count: 1
- unmatched paid: 5000 cents
- denial-history claims: 4
- review-flagged claims (payment exceeds billed, current v1 flag count): 1

Do not return `total_outstanding` as a confirmed business KPI.

### `GET /api/claims`
Query parameters:
- `payer` optional exact payer filter (case policy must be consistent; recommend case-insensitive matching).
- `status` optional enum: `balanced`, `unbalanced`, `no_remittance`.
- `claim_id` optional exact claim ID filter.
- `page` default 1, minimum 1.
- `page_size` default 10, range 1–100.

Response shape:
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 10
}
```
`total` is the count after filters and before pagination. Each item includes claim ID, payer, billed/paid/adjustment/patient-responsibility cents, nullable difference, status, and flags. Do not return all claims if pagination is requested.

### `GET /api/claims/{claim_id}`
Returns claim source fields, aggregate totals, nullable difference, status, flags, denial-history indicator, and every matched remittance. Sort history deterministically by `posted_date`, then `remit_id`. Return `404` if the claim does not exist.

### `GET /api/remittances/unmatched`
Returns unmatched remittance fields, original `source_claim_id`, and `issue: "claim_not_found"`, plus `total`. Do not include these records in matched-claim totals.

### Errors
Use consistent JSON:
```json
{
  "error": {
    "code": "CLAIM_NOT_FOUND",
    "message": "No claim exists with ID C9999"
  }
}
```
Expected statuses: 200 success; 404 missing claim; 422 invalid query/path input; 500 unexpected server error; 503 database unavailable. Never expose raw SQL, secrets, or stack traces to clients.

## 7. Frontend architecture

- Use a small typed API client module; centralize API base URL.
- Keep API response types aligned with backend schemas.
- Use React components for summary cards, filters, table, status labels, flags, and remittance history.
- Use pages/views for dashboard, claims, claim details, and unmatched remittances.
- Treat API values as authoritative; frontend only formats/visualizes them.
- Format cents to INR without converting through imprecise binary arithmetic for calculation. For display, a carefully tested formatter is acceptable.
- Include loading, error, empty, and retry states.
- Status and warning labels must be understandable without color alone.
- Do not put secrets in frontend environment variables.

## 8. Configuration and security

- Use environment variables for DB host/name/user/password and frontend API base URL.
- Commit `.env.example`, never `.env`.
- Add `.env`, Python virtual environments, `node_modules`, build outputs, caches, and local DB files to `.gitignore`.
- Validate and constrain API inputs.
- Avoid logging patient-account identifiers unnecessarily.
- The dataset is synthetic; don't import real PHI.
- Configure CORS only for the local frontend origin(s) needed in development.
- Do not add broad CORS wildcards as a convenience without documenting why.

## 9. Reliability and performance guardrails

- No N+1 queries for list/detail routes.
- Pagination must have deterministic ordering.
- Summary values should be computed from authoritative records.
- Import one row atomically and never leave partially written data.
- Avoid hardcoded absolute file paths.
- Handle missing CSV files and incorrect headers with actionable messages.
- Use DB connection/session lifecycle correctly.
- Close files and sessions reliably.
- Ensure tests can run without depending on developer-specific local paths.
