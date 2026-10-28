# Product Requirements Document (PRD)
## Claim Reconciliation — v1

**Status:** Proposed implementation specification  
**Target completion:** 2–3 focused days; intended submission by November 2, 2026  
**Primary user:** Clinic billing/reconciliation team  
**Project type:** Real take-home assignment  
**Implementation constraint:** Do not begin implementation until the owner approves the design documents.

---

## 1. Problem statement

A clinic's billing team has claims sent to payers and remittances received from payers. They need a reliable way to answer: which claims balance, which have unexplained differences, which have no remittance, and which remittance records cannot be matched to a claim?

The supplied data is synthetic. The application should help a reviewer inspect financial differences and investigate exceptions. It must not pretend that an arithmetic difference is automatically a collectible amount or that a balanced claim has no operational issues.

## 2. Assignment constraints and source facts

The assignment README specifies:
- Python with FastAPI.
- MySQL.
- A small React frontend.
- Tests.
- Submit a GitHub repository link.
- AI tools are allowed; properly attribute their use.
- Amounts are in cents.
- `billed_cents` is the clinic charge; `paid_cents` is payer cash; `adjustment_cents` is contractual write-off; `patient_responsibility_cents` is what the patient owes.
- `reason_code` explains an adjustment. CO-16, CO-50, and CO-197 are identified as denials.
- The dataset is synthetic.

The README says “about 4 hours.” The owner has chosen to work toward a 2–3 day completion target. Keep scope focused and explain any extra work as deliberate polish, not as a requirement from the assignment.

## 3. Goals

1. Import the supplied claims and remittances safely.
2. Calculate claim-level totals and differences deterministically.
3. Distinguish balanced, unbalanced, and no-remittance claims.
4. Preserve complete remittance history, including earlier denial codes.
5. Preserve and expose unmatched remittances.
6. Flag review-worthy anomalies such as payer mismatch and payment exceeding billed amount.
7. Provide a usable dashboard and searchable claims table.
8. Demonstrate correctness with automated tests, clear documentation, and repeatable setup instructions.

## 4. Non-goals for v1

- No claim editing, remittance editing, payment posting, or write-back workflow.
- No public CSV upload endpoint; use a controlled import command/script.
- No authentication/roles unless the assignment's existing repository explicitly requires them.
- No automated denial appeal, adjudication, or medical coding advice.
- No assertion that the difference equals collectible accounts receivable.
- No reversal/correction-sequence support. Negative amounts are rejected in v1.
- No production PHI processing. Supplied data is synthetic; do not add real patient information.
- No external payer integrations.

## 5. Users and main workflows

### Workflow A — Review overall status
1. User opens dashboard.
2. Dashboard shows counts and amounts.
3. User sees balanced, unbalanced, no-remittance, denial-history, and review indicators.
4. User opens the claims list to investigate a category.

### Workflow B — Find a claim
1. User searches by claim ID or filters by payer/status.
2. API returns a paginated result.
3. User opens a claim detail page.
4. Detail page shows source claim data, computed totals, difference, flags, and all remittances in date order.

### Workflow C — Investigate unmatched remittance
1. User opens unmatched remittances view.
2. User sees original referenced claim ID and amount.
3. User can distinguish the source reference from the nullable validated database relationship.
4. The app does not invent a claim to force a match.

### Workflow D — Import data
1. Operator runs the documented import command.
2. Claims are validated and loaded before remittances.
3. Invalid/duplicate rows are rejected individually and reported.
4. Valid rows continue to be processed.
5. Exact repeats do not duplicate records or totals; conflicting IDs are reported and never overwritten.

## 6. Business rules

### 6.1 Calculation
For a claim with one or more valid, matched remittances:

`difference_cents = billed_cents - SUM(paid_cents) - SUM(adjustment_cents) - SUM(patient_responsibility_cents)`

All values are integer cents. Never use floating point for money.

### 6.2 Status
- `balanced`: at least one matched remittance exists and difference is exactly zero.
- `unbalanced`: at least one matched remittance exists and difference is nonzero, whether positive or negative.
- `no_remittance`: no matched remittance exists. `difference_cents` is `null`; do not treat billed amount as a confirmed outstanding amount.

### 6.3 Multiple remittances
Aggregate all matched remittance rows for calculation. Preserve each remittance row and its history. Do not use only the latest row.

### 6.4 Denial history
CO-16, CO-50, and CO-197 are denial codes according to the assignment. Preserve all reason codes. Denial history is separate from financial status. A claim can be balanced and still have denial history (C1007).

### 6.5 Flags
- `denial_history`: at least one remittance has a reason code in the assignment's denial list.
- `payment_exceeds_billed`: total matched payer payments exceed the claim's billed amount. This is a review flag, not a final determination of overpayment.
- `payer_mismatch`: a matched remittance payer differs from its claim payer.
- `unmatched_remittance` is represented in the unmatched-remittance resource rather than creating a fake claim.

Flags are additive and do not replace status. Keep a stable, documented flag vocabulary.

### 6.6 Payer mismatch
Retain the remittance, preserve both payer values, flag the claim, and include the remittance in arithmetic totals. Clearly surface the warning. The supplied dataset contains no known payer-mismatch example; add a synthetic test fixture.

### 6.7 Validation and duplicates
- Required IDs and required source fields must be present and valid.
- IDs are unique: `claim_id` for claims and `remit_id` for remittances.
- Amounts must be valid, nonnegative integer cents. Reject missing required amounts, text, fractional cents, and negative amounts.
- Optional `reason_code` may be blank and should normalize to null.
- Reject invalid dates and malformed rows.
- Never silently replace invalid data with zero.
- Reject duplicate IDs. Exact repeat import is a no-op and reported as already present; if an existing ID has different data, report a conflicting ID. Never overwrite existing records.
- Process valid rows even if other rows are invalid. Report row number, ID if known, category, and human-readable reason.
- Import claims before remittances.
- A database transaction must prevent half-written individual records. Do not leave a partially inserted row.
- A rerun must not double-count any payment.

### 6.8 Unmatched remittances
Store the exact source claim reference. If no claim exists, set the validated `claim_id` foreign key to null and retain `source_claim_id`. Do not create a fake claim. Include unmatched payments in all-remittance totals, but not matched-claim totals or claim-level differences.

### 6.9 Reversals
Negative amounts are rejected in v1. Explicit reversal and correction semantics are deferred. Document this limitation; do not reinterpret negative values.

## 7. Dashboard requirements

Display:
- Total claims.
- Balanced, unbalanced, and no-remittance counts.
- Total billed cents formatted as rupees.
- Paid cents from matched remittances.
- Paid cents across all remittances.
- Unmatched remittance count and amount.
- Number of distinct claims with denial history.
- Number of claims with review flags.

Do not show a single “total outstanding” KPI in v1. The arithmetic difference is not necessarily a collectible balance.

## 8. UX and accessibility

- Make status text readable without relying only on color.
- Format amounts consistently as INR with two decimal places.
- Show the raw cents field only where useful for debugging/API inspection.
- Show loading, empty, and error states.
- Avoid rendering raw stack traces or database errors.
- Keep tables usable at common laptop widths; provide horizontal overflow where needed.
- Provide labels for filters and buttons, visible focus, and meaningful empty states.

## 9. Acceptance criteria

- Given the supplied data, 12 claims and 13 remittances are represented.
- Status counts are 5 balanced, 6 unbalanced, and 1 no-remittance.
- R1012/C9999 is preserved as unmatched.
- C1007 balances but retains CO-197 denial history.
- C1006 is unbalanced with a payment-exceeds-billed review flag.
- No-remittance claims have null difference.
- Duplicate imports never double-count payments.
- Invalid rows are rejected with actionable row-level errors while other valid rows can be imported.
- API filtering/pagination and standard error behavior are tested.
- Setup, tests, import process, assumptions, limitations, and AI-use attribution are documented.

## 10. Known risks

- Financial interpretations vary by payer/contract; current formula is a v1 rule, not a universal adjudication engine.
- Payer mismatch affects totals by explicit decision; UI must show warning.
- Negative reversals are not supported.
- The source data does not include examples of payer mismatch, duplicate rows, malformed amounts, or invalid dates; test fixtures must cover them.
- A small synthetic dataset cannot demonstrate production-scale performance or security.
