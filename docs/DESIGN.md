# Technical Design and API Contract
## Claim Reconciliation — v1

This document expands the API/database plan into implementable contracts. It is subordinate to `RULES.md` for business behavior.

## 1. API conventions

- Prefix: `/api`.
- JSON response bodies use `snake_case`.
- Money is integer cents.
- Dates use ISO `YYYY-MM-DD`.
- Empty optional reason code is represented as JSON `null`.
- Status strings: `balanced`, `unbalanced`, `no_remittance`.
- Flag strings: `denial_history`, `payment_exceeds_billed`, `payer_mismatch`.
- List responses are paginated or have an explicit `total`.
- Query validation errors use HTTP 422.
- Do not return SQL, secrets, local filesystem paths, or stack traces.

## 2. `GET /api/health`

Success 200:
```json
{
  "status": "ok",
  "database": "connected"
}
```

If the DB check fails, return 503 with a safe shape such as:
```json
{
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "The service is temporarily unavailable"
  }
}
```

Do not include actual DB host, credentials, or raw exception messages.

## 3. `GET /api/summary`

Response schema:
```json
{
  "total_claims": 12,
  "balanced_claims": 5,
  "unbalanced_claims": 6,
  "claims_without_remittance": 1,
  "total_billed_cents": 170000,
  "matched_paid_cents": 99000,
  "all_remittance_paid_cents": 104000,
  "unmatched_remittance_count": 1,
  "unmatched_remittance_paid_cents": 5000,
  "claims_with_denial_history": 4,
  "claims_flagged_for_review": 1
}
```

Numbers above are expected for the supplied dataset. Summary calculations must be based on DB contents, not hardcoded fixture values.

Definitions:
- `total_claims`: count of rows in claims.
- `balanced_claims`, `unbalanced_claims`, `claims_without_remittance`: counts based on status rules.
- `total_billed_cents`: sum of claims.billed_cents.
- `matched_paid_cents`: sum of paid_cents where remittance.claim_id is not null.
- `all_remittance_paid_cents`: sum across every remittance, matched and unmatched.
- `unmatched_remittance_count`: remittance count where claim_id is null.
- `unmatched_remittance_paid_cents`: paid sum where claim_id is null.
- `claims_with_denial_history`: count distinct linked claims with a reason code in the specified denial set.
- `claims_flagged_for_review`: for v1 expected count of claims with `payment_exceeds_billed` or `payer_mismatch`; a claim with both flags counts once. The sample has one such claim, C1006.

Do not include `total_outstanding`.

## 4. `GET /api/claims`

Query:
- `payer`: optional, case-insensitive exact match after trimming.
- `status`: optional enum `balanced|unbalanced|no_remittance`.
- `claim_id`: optional exact match after trimming; not a fuzzy substring search in v1.
- `page`: integer, default 1, min 1.
- `page_size`: integer, default 10, min 1, max 100.

Example:
`GET /api/claims?status=unbalanced&page=1&page_size=5`

Response:
```json
{
  "items": [
    {
      "claim_id": "C1003",
      "payer": "Harbor Plan",
      "billed_cents": 8500,
      "paid_cents": 0,
      "adjustment_cents": 0,
      "patient_responsibility_cents": 0,
      "difference_cents": 8500,
      "status": "unbalanced",
      "flags": ["denial_history"]
    }
  ],
  "total": 6,
  "page": 1,
  "page_size": 5
}
```

The item is illustrative, not the complete actual page. `total` is number of rows after filters but before pagination. Use stable sort by claim ID ascending unless product requirements change.

For a no-remittance claim:
- `paid_cents`, `adjustment_cents`, and `patient_responsibility_cents` may be zero for display;
- `difference_cents` must be null;
- `status` must be `no_remittance`.
The frontend must make it clear that zero aggregate amounts do not mean a zero-dollar remittance was received.

## 5. `GET /api/claims/{claim_id}`

For existing claims, return:
- source claim fields;
- `totals` object;
- `status`;
- `flags`;
- `denial_history` boolean;
- `remittances` array of all matched rows.

Example:
```json
{
  "claim_id": "C1007",
  "patient_account": "A1007",
  "payer": "Northwind Health",
  "service_date": "2026-09-10",
  "cpt": "99213",
  "billed_cents": 15000,
  "totals": {
    "paid_cents": 11000,
    "adjustment_cents": 4000,
    "patient_responsibility_cents": 0,
    "difference_cents": 0
  },
  "status": "balanced",
  "flags": ["denial_history"],
  "denial_history": true,
  "remittances": [
    {
      "remit_id": "R1006",
      "paid_cents": 0,
      "adjustment_cents": 0,
      "patient_responsibility_cents": 0,
      "reason_code": "CO-197",
      "posted_date": "2026-09-12"
    },
    {
      "remit_id": "R1007",
      "paid_cents": 11000,
      "adjustment_cents": 4000,
      "patient_responsibility_cents": 0,
      "reason_code": "CO-45",
      "posted_date": "2026-09-20"
    }
  ]
}
```

Sort remittances by `posted_date`, then `remit_id`, both ascending. Return 404 if no claim exists. Do not return a fabricated detail response for unmatched C9999.

## 6. `GET /api/remittances/unmatched`

Response:
```json
{
  "items": [
    {
      "remit_id": "R1012",
      "source_claim_id": "C9999",
      "payer": "Cedar Mutual",
      "paid_cents": 5000,
      "adjustment_cents": 0,
      "patient_responsibility_cents": 0,
      "reason_code": null,
      "posted_date": "2026-09-18",
      "issue": "claim_not_found"
    }
  ],
  "total": 1
}
```

Sort by posted date then remit ID for determinism.

## 7. Error format

All expected errors should use:
```json
{
  "error": {
    "code": "CLAIM_NOT_FOUND",
    "message": "No claim exists with ID C9999"
  }
}
```

Examples:
- 404: `CLAIM_NOT_FOUND`
- 422: `INVALID_QUERY_PARAMETER`
- 503: `DATABASE_UNAVAILABLE`
- 500: `INTERNAL_ERROR`

For 500 responses, use a generic message and log detailed exceptions server-side without exposing secrets.

## 8. Database implementation notes

Use MySQL with migrations or a reproducible schema creation mechanism. Avoid relying solely on ORM auto-create in production-like setup without documenting it.

Claims:
- `claim_id VARCHAR(20) PRIMARY KEY`
- `patient_account VARCHAR(50) NOT NULL`
- `payer VARCHAR(100) NOT NULL`
- `service_date DATE NOT NULL`
- `cpt VARCHAR(10) NOT NULL`
- `billed_cents BIGINT NOT NULL`

Remittances:
- `remit_id VARCHAR(20) PRIMARY KEY`
- `source_claim_id VARCHAR(20) NOT NULL`
- `claim_id VARCHAR(20) NULL`
- `payer VARCHAR(100) NOT NULL`
- `paid_cents BIGINT NOT NULL`
- `adjustment_cents BIGINT NOT NULL`
- `patient_responsibility_cents BIGINT NOT NULL`
- `reason_code VARCHAR(30) NULL`
- `posted_date DATE NOT NULL`
- foreign key `claim_id -> claims.claim_id`
- index on `claim_id`
- optional indexes on claims payer/status-related query fields; status itself is derived and should not be stored unless justified.

For portability, validate nonnegative amounts in the application and use DB CHECK constraints if supported by the chosen MySQL version. Ensure database engine supports foreign keys.

## 9. Import report contract

The import command should print and ideally write a machine-readable report with:
- source filename;
- rows seen;
- inserted;
- duplicate no-op;
- rejected;
- conflicting existing ID;
- per-row issue with row number, ID when available, code, and message.

Do not expose a public upload endpoint in v1. Fail before row processing if the file is unreadable or required headers are absent. For row-level failures, continue processing other rows. If DB becomes unavailable, stop safely and report only committed work.

## 10. Frontend behavior contract

Pages/views:
1. Dashboard.
2. Claims list.
3. Claim detail/history.
4. Unmatched remittances.

Required UI states:
- loading;
- API error with retry;
- empty filtered result;
- no unmatched remittances;
- no-remittance claim with explicit explanation;
- denial history independent of status;
- payer mismatch and payment-exceeds-billed warnings.

UI formatting:
- Display currency as INR/rupees with two decimal places.
- Keep cents in API and calculation.
- Do not label the difference “collectible balance” or “confirmed outstanding”.
- Make warnings accessible without color alone.
