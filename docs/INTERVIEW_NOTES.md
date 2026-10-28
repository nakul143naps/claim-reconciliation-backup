# Forward Deployed Engineer (FDE) — Interview Guide & Defense Notes
## Company: Stitch Fin | Project: Claim Reconciliation Engine

---

## 1. Executive Summary & 60-Second Elevator Pitch

> *"This project is an enterprise-grade reconciliation and revenue integrity engine built for clinic billing operations. Healthcare claims reconciliation is notoriously messy because payers send partial payments, contractual write-offs, and denials across multiple remittances over time—sometimes for claims not even in the clinic's local records.*
>
> *I designed this system around three non-negotiable engineering principles:*
> 1. ***Absolute Financial Determinism***: *Zero floating-point arithmetic. Every amount is stored and computed in integer cents to eliminate IEEE 754 rounding errors.*
> 2. ***Audit Trail & History Preservation***: *Status is calculated dynamically from authoritative records, and prior denial codes (like CO-197 on C1007) are preserved even after a claim is resolved and balanced.*
> 3. ***Data Integrity & Orphan Isolation***: *Unmatched remittances (like R1012 pointing to missing claim C9999) are never discarded and never forced into fake records. The raw reference is preserved while the foreign key is set to NULL, keeping claim balances pure while tracking all cash received.*
>
> *The stack is Python/FastAPI with SQLAlchemy 2.0 and MySQL 8.0 in Docker, verified by 25 automated unit/integration tests, paired with an accessible, responsive React audit dashboard."*

---

## 2. End-to-End System Flow Walkthrough

```mermaid
sequenceDiagram
    autonumber
    actor BillingOps as Clinic Billing Operations
    participant Frontend as React Audit UI (Vite)
    participant FastAPI as FastAPI Router Layer
    participant Service as Pure Reconciliation Service
    participant Repo as ClaimRepository
    participant DB as MySQL 8.0 (Docker)
    participant CLI as Import CLI / Data Pipeline

    Note over CLI,DB: Ingestion Phase (Controlled CLI)
    CLI->>DB: 1. Validate & Insert claims.csv (BIGINT cents, strict ISO dates)
    CLI->>DB: 2. Validate remittances.csv (Match known claim_id; else FK=NULL)
    CLI->>BillingOps: 3. Return atomic row-level import & duplicate report

    Note over BillingOps,DB: Runtime Reconciliation & Review Phase
    BillingOps->>Frontend: Open Dashboard
    Frontend->>FastAPI: GET /api/summary
    FastAPI->>Repo: get_summary()
    Repo->>DB: SQL Aggregate queries (sum matched, sum all, count unmatched)
    Repo->>Service: calculate_claim_reconciliation() per claim
    Service-->>Repo: (totals, status, flags, denial_history)
    Repo-->>FastAPI: ReconciliationSummary
    FastAPI-->>Frontend: JSON KPI Response (12 claims, 5 balanced, 6 unbalanced, 1 no remit)

    BillingOps->>Frontend: Inspect Claim C1007 (or filter by status/payer)
    Frontend->>FastAPI: GET /api/claims/C1007
    FastAPI->>Repo: get_claim_by_id("C1007") with selectinload(remittances)
    Repo->>DB: Fetch claim + ordered remittances (posted_date ASC, remit_id ASC)
    Repo->>Service: Aggregate: Paid $110.00 + Adj $40.00 = Billed $150.00 (Diff = $0.00)
    Service-->>FastAPI: Status: balanced, Flag: denial_history (due to earlier CO-197)
    FastAPI-->>Frontend: 200 OK ClaimDetail
    Frontend-->>BillingOps: Displays Balanced status, Denial banner, and full transaction history
```

---

## 3. Top 8 Technical Drill-Down Questions & Bulletproof Answers

### Q1: *"Why did you use integer cents instead of `DECIMAL` or `FLOAT`?"*
* **Answer**:
  *"Floats represent numbers in binary fractional form (IEEE 754), which cannot precisely represent decimal fractions like `0.10` or `0.01`, leading to infamous discrepancies like `0.1 + 0.2 = 0.30000000000000004`. In healthcare and financial ledgers, penny rounding discrepancies can fail regulatory audits and tax filings. By using integer cents (`BIGINT` in MySQL, `int` in Python/TypeScript), addition and subtraction are 100% exact. Division only occurs at presentation time in the UI, avoiding any mathematical drift."*

---

### Q2: *"How do you handle remittance `R1012` referencing missing claim `C9999`?"*
* **Answer**:
  *"In real-world billing, payers frequently send payment advices for claims that were submitted under an alternate clearinghouse ID, a paper claim, or prior to an EHR migration. Discarding the row loses cash reconciliation; creating a dummy claim invents phantom accounts receivable.*
  *I solved this with a **dual-column schema**:*
  - `source_claim_id VARCHAR(20) NOT NULL`: *Preserves the exact string from the payer (`C9999`).*
  - `claim_id VARCHAR(20) NULL REFERENCES claims(claim_id)`: *Nullable foreign key.*
  *When `C9999` is not found, `claim_id` is set to `NULL`. This keeps the database relational integrity intact. The payment ($50.00) is queryable in `/api/remittances/unmatched` and counted in `all_remittance_paid_cents` ($1,040.00), but strictly excluded from matched claims so it never skews claim-level differences."*

---

### Q3: *"Explain why claim `C1007` is marked `balanced` but still displays a `denial_history` flag."*
* **Answer**:
  *"This is a crucial distinction between **financial balance** and **operational history**. In the source data, `C1007` was billed for $150.00. The payer first sent remittance `R1006` on Sep 12 with $0 paid and denial code `CO-197` (precertification absent). On Sep 20, after the clinic corrected the authorization, the payer issued remittance `R1007` paying $110.00 with a $40.00 contractual adjustment (`CO-45`).*
  *Mathematically: $150.00 - $110.00 - $40.00 = $0.00, so the status is `balanced`.*
  *Operationally, billing teams need to know this claim had a denial because repeat denials indicate systemic pre-authorization leakage. The service aggregates **all** remittance rows, keeping denial history visible while reflecting the true current balance."*

---

### Q4: *"Why does claim `C1005` have a `null` difference instead of $60.00?"*
* **Answer**:
  *"Treating a claim without remittances as having a $60.00 'outstanding balance' is an accounting anti-pattern. If a claim was never acknowledged or adjudicated by the payer, you do not yet know if it will be paid in full, discounted by contract, or denied.*
  *Our business rule sets `status = no_remittance` and `difference_cents = null`. The UI explicitly displays an unreceived state rather than claiming it is a verified collectible receivable."*

---

### Q5: *"How did you prevent the N+1 query problem on the claims list endpoint?"*
* **Answer**:
  *"In naive ORMs, iterating through 100 claims and accessing `claim.remittances` triggers 1 query for the claims plus 100 secondary queries for the remittances.*
  *In `ClaimRepository`, I utilized SQLAlchemy's `selectinload(Claim.remittances)`. This executes two queries: one for the filtered claims and one `SELECT ... WHERE claim_id IN (...)` batch query, pairing them in memory in $O(N)$ time. Furthermore, summary aggregates are computed via SQL `SUM` and `CASE` expressions rather than loading every row into Python."*

---

### Q6: *"How does your import service guarantee idempotency?"*
* **Answer**:
  *"In enterprise client deployments, batch files are frequently re-transmitted by automated cron jobs or SFTP drops.*
  *Our `ImportService` implements a three-tier idempotency strategy:*
  1. **Exact Duplicate No-Op**: *If a record with the same ID arrives with identical normalized field values, it is classified as `duplicate_noop`, skipped, and does not increment totals.*
  2. **Conflicting Existing ID**: *If an incoming row shares an existing ID but has conflicting values (e.g. altered billed amount), it is rejected as `conflicting_existing_id` with an actionable row-level error.*
  3. **Row-Level Transaction Atomicity**: *Each valid row is processed within a nested transaction (`db.begin_nested()`), ensuring an invalid row never leaves half-inserted state while allowing other valid rows to succeed."*

---

### Q7: *"What did you do about API error consistency?"*
* **Answer**:
  *"FastAPI out of the box returns `{"detail": [...]}` for query/body validation (422) and plain text for HTTP exceptions. To maintain a strict API contract with the frontend, I added custom exception handlers for `RequestValidationError`, `HTTPException`, and unhandled server errors (500).*
  *All errors conform to a unified schema:*
  ```json
  {
    "error": {
      "code": "INVALID_QUERY_PARAMETER",
      "message": "status: Input should be 'balanced', 'unbalanced' or 'no_remittance'"
    }
  }
  ```
  *Crucially, internal exception tracebacks, DB connection strings, and server paths are logged internally and never exposed to the client in 500 responses."*

---

### Q8: *"As a Forward Deployed Engineer, what would you build next in production?"*
* **Answer**:
  1. **Streaming EDI 835 / 837 Parser**: *Move from CSV to native ANSI X12 835 (Electronic Remittance Advice) and 837 (Health Care Claim) transaction sets using chunked streaming to handle 500MB+ daily files without memory spikes.*
  2. **Distributed Job Workers (Celery / Temporal)**: *Decouple file ingestion into asynchronous background tasks with progress bars and webhooks notifying clinic EHRs upon completion.*
  3. **Role-Based Access Control (RBAC) & Audit Trails**: *Healthcare systems require HIPAA-compliant access controls where billing managers have override permissions and every manual adjustment creates an immutable audit event.*
  4. **Automated Denial Appeal Assistant**: *Integrate LLM/rules engines to draft appeal letters automatically when codes like CO-16 or CO-197 appear, matching them with clinic EHR clinical notes.*

---

## 4. Key Healthcare Terminology Primer (For Interviewers)

| Term | Full Meaning | Role in Reconciliation |
| :--- | :--- | :--- |
| **CPT** | Current Procedural Terminology | 5-digit AMA codes (`99213`, `99214`) defining clinical procedures billed to payers. |
| **CARC** | Claim Adjustment Reason Codes | National standard codes explaining why a charge was adjusted (e.g., `CO-45` contractual fee schedule adjustment). |
| **RARC** | Remittance Advice Remark Codes | Supplementary codes providing detailed remittance guidance. |
| **Denial Codes** | `CO-16`, `CO-50`, `CO-197` | Codes indicating claim rejection requiring clinical appeal, info submission, or pre-authorization. |
| **Patient Responsibility** | `PR-1`, `PR-3` | Deductibles (`PR-1`) and copays (`PR-3`) transferred from payer to patient obligation. |
| **ERA / 835** | Electronic Remittance Advice | Standard HIPAA EDI format used by insurance companies to post claims payment details. |
| **EOB** | Explanation of Benefits | Patient-facing statement explaining what health insurance covered and what the patient owes. |
