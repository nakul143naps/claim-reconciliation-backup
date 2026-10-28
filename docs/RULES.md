# Business Rules and Data Contract
## Claim Reconciliation — v1

This document is the single source of truth for calculation, status, flags, imports, and expected sample-data outcomes. If implementation conflicts with this document, stop and resolve the discrepancy instead of silently changing behavior.

## 1. Source field meanings

### Claims CSV
Expected headers:
`claim_id, patient_account, payer, service_date, cpt, billed_cents`

- `claim_id`: unique claim identifier.
- `patient_account`: synthetic account identifier.
- `payer`: payer name.
- `service_date`: ISO date `YYYY-MM-DD`.
- `cpt`: procedure code represented as text to preserve formatting.
- `billed_cents`: integer amount charged by clinic.

### Remittances CSV
Expected headers:
`remit_id, claim_id, payer, paid_cents, adjustment_cents, patient_responsibility_cents, reason_code, posted_date`

- `remit_id`: unique remittance identifier.
- `claim_id`: source reference to a claim; may reference a missing claim.
- `payer`: payer recorded on remittance.
- `paid_cents`: payer cash.
- `adjustment_cents`: amount written off by contract.
- `patient_responsibility_cents`: amount the patient owes.
- `reason_code`: reason code; blank means no code supplied.
- `posted_date`: ISO date `YYYY-MM-DD`.

## 2. Calculation

For each claim with at least one matched remittance:

`paid_cents = sum(matched remittance paid_cents)`
`adjustment_cents = sum(matched remittance adjustment_cents)`
`patient_responsibility_cents = sum(matched remittance patient_responsibility_cents)`
`difference_cents = billed_cents - paid_cents - adjustment_cents - patient_responsibility_cents`

Use integer arithmetic only. A result of zero means arithmetic balance under this rule, not proof of claim correctness, collectibility, or absence of a denial.

## 3. Status decision tree

1. Find remittances whose validated `claim_id` links to the claim.
2. If none exist: `status = no_remittance`, `difference_cents = null`, aggregate amount fields may be represented as zero for display but must not imply that a remittance was received.
3. If one or more exist: aggregate their amounts and calculate difference.
4. If difference is zero: `balanced`.
5. Otherwise: `unbalanced`, including negative values.

Do not classify a claim without a remittance as unbalanced just because billed amount is nonzero.

## 4. Flags and denial codes

### Denial history
The assignment explicitly identifies these as denial codes:
- `CO-16`
- `CO-50`
- `CO-197`

Compare normalized uppercase/trimmed reason code to this list. Preserve the original source code as supplied (blank can normalize to null). `denial_history` is true if any matched remittance has one of these codes. Denial history is independent from status.

### Review flags
- `payment_exceeds_billed`: total payer payments for a claim exceed `billed_cents`. This is a warning for investigation, not a conclusion that an overpayment has occurred.
- `payer_mismatch`: one or more matched remittances has a payer different from the claim payer.
- `denial_history`: at least one denial code exists in history.

Do not infer denial status from all `CO-*` codes. In particular, CO-45 in the sample is not in the assignment's explicitly named denial list.

## 5. Payer mismatch rule

If remittance source claim ID resolves to a known claim but remittance payer differs from claim payer:
- keep both payer values unchanged;
- link the remittance to the claim;
- add `payer_mismatch` flag to the claim;
- include the valid remittance amounts in arithmetic totals, as explicitly agreed;
- expose the mismatch in the claim detail UI;
- do not silently rewrite the payer or reject the row.

Payer comparison should use a consistent normalization policy (recommend trim + case-insensitive comparison) while preserving original display values. The supplied fixture does not include a mismatch; create a test-only fixture.

## 6. Unmatched remittance rule

If source `claim_id` has no matching claim:
- store exact source value in `source_claim_id`;
- store `claim_id = null`;
- retain remittance and amounts;
- expose it through `/api/remittances/unmatched`;
- include it in `all_remittance_paid_cents`;
- exclude it from `matched_paid_cents` and all claim-level aggregation;
- never create a placeholder claim.

Expected sample case: R1012 points to C9999 and has 5000 paid cents.

## 7. Amount validation

V1 accepts only nonnegative integer cents for:
- `billed_cents`
- `paid_cents`
- `adjustment_cents`
- `patient_responsibility_cents`

Reject:
- missing required amount;
- nonnumeric value;
- fractional amount (e.g. `10.5`);
- negative value;
- value outside the supported DB integer range.

Do not silently replace invalid amounts with zero. Blank `reason_code` is allowed and normalizes to null. `0` is a valid amount and must not be treated as missing.

Negative amounts might represent reversals, but reversal semantics are deferred; reject them in v1 and report a clear reason.

## 8. Dates and identifiers

- IDs must be non-empty after trimming; preserve source IDs consistently (recommend trim surrounding whitespace and reject IDs that become empty).
- Date fields must parse strictly as `YYYY-MM-DD`.
- Do not guess ambiguous date formats.
- Required text fields must not be blank.
- `cpt` remains text, not integer.
- Unknown extra CSV columns: report or ignore only under a documented policy. Recommended v1: require all expected headers, tolerate extra columns but do not consume them.
- Missing expected headers: fail that file before importing any rows from that file and report the missing headers.

## 9. Duplicate and idempotency policy

Duplicate IDs are rejected; never update/overwrite an existing record.

For an import row with an ID that already exists:
- If every normalized source field matches the stored record, classify it as `duplicate_noop` (already present; do not insert/count it again).
- If any field differs, classify it as `conflicting_existing_id` and reject it.
- If ID is repeated earlier in the same CSV:
  - first valid row is eligible for insert;
  - subsequent row with identical normalized content is a duplicate no-op;
  - subsequent row with different content is a conflicting duplicate and is rejected.
- Invalid first occurrence does not reserve the ID; a later valid row can be accepted, but the report must show the invalid row.
- Unique DB constraints remain the final safety barrier against races.

## 10. Partial import policy

Continue processing valid rows while rejecting invalid rows. Return a report:
- `rows_seen`
- `inserted`
- `duplicate_noop`
- `rejected`
- `conflicting_existing_id`
- per-row errors containing source row number, ID when available, error code, and message.

Process claims before remittances. Validate a row before writing it. Use an atomic transaction per row or another clearly documented strategy that guarantees a failed insert cannot leave a partial record. If the database fails globally, stop further processing safely and report which rows were processed; never claim success for rows not committed.

A file-level structural error (missing required headers/unreadable file) should fail that file before row import. Do not partially import a file with an invalid header mapping.

## 11. Import ordering and relationships

1. Validate/import claims.
2. Load known claim IDs.
3. Validate/import remittances.
4. Link remittance to a known claim by exact normalized claim ID.
5. If no claim exists, preserve as unmatched.
6. Report summary and row-level outcomes.

No remittance row should be discarded merely because its claim is missing.

## 12. Deterministic sample-data expected results

### Dataset counts and totals
- Claims: 12.
- Remittances: 13.
- Total billed: 170000 cents.
- Matched paid: 99000 cents.
- All remittance paid: 104000 cents.
- Total adjustments: 14000 cents across all remittance rows (all are matched in the sample except R1012, whose adjustment is zero).
- Total patient responsibility: 7500 cents.
- Unmatched remittances: 1, with 5000 paid cents.
- Denial-coded remittance rows: 4 (R1003 CO-16, R1006 CO-197, R1009 CO-50, R1011 CO-16).
- Distinct claims with denial history: 4 (C1003, C1007, C1009, C1011).
- Claims with payment-exceeds-billed flag: 1 (C1006).

### Per-claim expected results

| Claim | Billed | Paid total | Adjustment total | Patient responsibility | Difference | Status | Key notes |
|---|---:|---:|---:|---:|---:|---|---|
| C1001 | 15000 | 12000 | 3000 | 0 | 0 | balanced | CO-45 is not in the specified denial list |
| C1002 | 22000 | 18000 | 0 | 4000 | 0 | balanced | PR-3 |
| C1003 | 8500 | 0 | 0 | 0 | 8500 | unbalanced | CO-16 denial history |
| C1004 | 15000 | 10000 | 0 | 0 | 5000 | unbalanced | No reason code |
| C1005 | 6000 | 0* | 0* | 0* | null | no_remittance | *Display zeros for aggregates only if clearly marked as no remittance |
| C1006 | 28000 | 30000 | 0 | 0 | -2000 | unbalanced | payment_exceeds_billed review flag |
| C1007 | 15000 | 11000 | 4000 | 0 | 0 | balanced | CO-197 remains in earlier history |
| C1008 | 2500 | 0 | 0 | 2500 | 0 | balanced | Patient responsibility accounts for bill |
| C1009 | 15000 | 0 | 0 | 0 | 15000 | unbalanced | CO-50 denial history |
| C1010 | 9000 | 4000 | 2000 | 1000 | 2000 | unbalanced | CO-45; not a specified denial |
| C1011 | 20000 | 0 | 5000 | 0 | 15000 | unbalanced | CO-16 denial history |
| C1012 | 14000 | 14000 | 0 | 0 | 0 | balanced | No reason code |

`difference_cents` values are not added into a confirmed “outstanding” KPI. Sum of calculable differences for claims with at least one matched remittance is 43500 cents, but this is a diagnostic arithmetic total, not a confirmed receivable.

## 13. Invariants to enforce

- Sum of per-claim matched paid amounts equals matched remittance paid amounts.
- All-remittance paid total equals matched paid plus unmatched paid.
- No remittance is associated with more than one claim.
- No duplicate primary key is stored.
- No unmatched remittance contributes to claim status/difference.
- A no-remittance claim always has null difference.
- Status is derived from remittance existence and difference, never directly from denial codes.
- Re-importing exact data never changes totals.
- API responses never expose internal exception text or secrets.
