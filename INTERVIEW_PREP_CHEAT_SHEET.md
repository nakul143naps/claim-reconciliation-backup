# Stitch Financial — FDE Master Interview Prep & Defense Guide

> **Your Personal Cheat Sheet**: Memorize the key phrases, architectural decisions, and numbers in this guide. It gives you verbatim, confident answers for every stage of your interview.  
> **Live AWS Deployment**: [http://67.202.41.44:3000](http://67.202.41.44:3000)  
> **GitHub**: [https://github.com/nakul143naps/claim-reconciliation](https://github.com/nakul143naps/claim-reconciliation)

---

## 1. The 30-Second Elevator Pitch (Memorize This!)

> *"For this take-home, I built a production-grade healthcare claim reconciliation and revenue audit platform. In medical billing, clinics submit claims to insurance payers and receive back complex remittances containing cash payments, contractual write-offs, and denials.*
>
> *I designed the system around three core engineering principles:*
> 1. *Strict financial precision using pure integer-cent arithmetic (`BIGINT`) with zero floating-point drift.*
> 2. *Relational foreign-key integrity using a Dual-Key Pattern that safely isolates orphaned checks without losing track of cash or inventing fake claims.*
> 3. *Real-world operational flexibility, including bi-directional CSV batch ingestion, multi-page pagination for scale, and a 1-click safety reset to the demo benchmark.*
>
> *The platform has 38 automated unit, integration, and scale tests with 100% pass rate."*

---

## 2. The Core Problem in Plain English (How to Explain It Simply)

If an interviewer asks: *"Explain what this app does to someone who doesn't work in healthcare billing."*

* **The Analogy**:
  *"Imagine you run a clinic. You send a bill (a **Claim**) to an insurer for $150.00. The insurer doesn't just send you a check for $150.00. They send a detailed statement (a **Remittance**) saying: 'We are paying you $110.00 in cash. Under our contract, you must write off $40.00 (`CO-45`). The patient owes $0.00. The claim is now settled at $0 balance.'*
* **Why it gets messy**:
  1. Sometimes they pay only part of it (unbalanced partial payment).
  2. Sometimes they deny it entirely with an error code like `CO-16` (missing clinical notes) or `CO-197` (missing prior authorization).
  3. Sometimes you fix the error, and a second remittance arrives weeks later paying the remaining balance.
  4. Sometimes they send you a check for an account number that doesn't exist in your billing database (an **unmatched orphan**).
* **What my app does**:
  *"My platform brings all these moving pieces together into a live, interactive 3-way balance sheet so finance leaders know exactly how much cash came in, how much was written off, and what accounts receivable remains uncollected."*

---

## 3. The Canonical Benchmark Numbers (Know These Cold!)

The core assignment rules (`RULES.md` Section 12) require these exact figures on the 12-claim benchmark:

| Metric | Exact Value | Plain-English Explanation |
| :--- | :--- | :--- |
| **Total Claims Billed** | **12 claims** | Total bills submitted by the clinic |
| **Total Billed Amount** | **$1,700.00** (170,000¢) | Total gross charges across all 12 claims |
| **Matched Cash Paid** | **$990.00** (99,000¢) | Real cash collected against valid claims (58.2% collection rate) |
| **Gross Cash Uncollected** | **$710.00** (71,000¢) | Charges billed minus matched cash received (`$1,700 - $990`) |
| **Contractual Write-Offs** | **$140.00** (14,000¢) | Contract fee schedule adjustments (`CO-45`) |
| **Patient Responsibility** | **$75.00** (7,500¢) | Patient copays and deductibles (`PR-1`, `PR-3`) |
| **Net Unsettled AR (Variance)** | **$495.00** (49,500¢) | Real outstanding debt (`$435` unbalanced claims + `$60` unremitted claim `C1005`) |
| **All Remittances Paid** | **$1,040.00** (104,000¢) | Matched cash ($990.00) + Orphan remittance cash ($50.00) |
| **Balanced Claims** | **5 claims** | Difference is exactly $0 (`C1001`, `C1002`, `C1007`, `C1008`, `C1012`) |
| **Unbalanced Claims** | **6 claims** | Difference $\neq 0$ (`C1003`, `C1004`, `C1006`, `C1009`, `C1010`, `C1011`) |
| **No-Remittance Claims** | **1 claim** | Zero remittances received (`C1005`); Difference is strictly `null` |
| **Claims with Denial History** | **4 claims** | Had a historical denial code (`C1003`, `C1007`, `C1009`, `C1011`) |
| **Overpayment Review Flag** | **1 claim** | Paid $300.00 exceeds Billed $280.00 (`C1006`) |
| **Unmatched Orphan Payments** | **1 remittance** | Remittance `R1012` paying $50.00 referencing missing claim `C9999` |

---

## 4. End-to-End System Flow & Architecture

```mermaid
flowchart TD
    subgraph 1. Ingestion Layer
        CSV["CSV Batch Upload or CLI"] --> VAL["Validation Engine (import_service.py)"]
        VAL --> ATOMIC["Row-Level Atomic Transactions (begin_nested)"]
    end

    subgraph 2. Database (MySQL 8.0)
        ATOMIC --> DB1[("claims Table (claim_id PK)")]
        ATOMIC --> DB2[("remittances Table (remit_id PK, claim_id FK)")]
        DB1 -.->|1-to-Many| DB2
    end

    subgraph 3. Service Layer
        DB1 & DB2 --> REPO["ClaimRepository (Eager selectinload)"]
        REPO --> CALC["reconciliation.py (Pure Arithmetic & Invariants)"]
    end

    subgraph 4. API Layer (FastAPI)
        CALC --> API["REST Routers (/summary, /claims, /import)"]
    end

    subgraph 5. Presentation Layer (React 18 + Vite)
        API --> UI1["3-Way Live Settlement Ledger"]
        API --> UI2["Reconciliation Table (Pagination 10/20/50)"]
        API --> UI3["Claim Detail & Denial Appeal Playbook"]
        API --> UI4["Unmatched Remittance Quarantine Queue"]
    end
```

---

## 5. Core Architectural Decisions & Deep-Dive Talking Points

### Question 1: *"Why did you use integer cents instead of floats or decimal?"*
* **Answer**:
  *"In Python and JavaScript, standard binary floating-point arithmetic introduces IEEE 754 precision drift (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial auditing, even a one-cent drift is unacceptable.*
  *I chose to persist and calculate all amounts as integer cents using MySQL `BIGINT` and Python `int`. This guarantees absolute precision across all operations, aggregations, and database queries. Dollar conversion (`$150.00`) is deferred strictly to presentation in the frontend UI."*

### Question 2: *"How do you handle unmatched remittances (the Dual-Key Pattern)?"*
* **Answer**:
  *"When a remittance arrives with a claim ID that does not exist in our database (like `R1012` paying $50.00 for `C9999`), other systems make one of two mistakes:*
  1. *Discard the record -> losing cash accountability.*
  2. *Invent a fake dummy claim `C9999` -> falsely inflating accounts receivable.*
  
  *My solution is the **Dual-Key Pattern**:*
  * `source_claim_id VARCHAR(20) NOT NULL`: Retains the raw input `"C9999"` for complete auditability.
  * `claim_id VARCHAR(20) NULL`: The foreign key constraint. Because `C9999` doesn't exist, this is set to `NULL` (`ON DELETE SET NULL`).
  
  *This keeps the relational integrity valid, isolates the $50.00 cash into the `/api/remittances/unmatched` queue, and ensures our matched claims calculations remain 100% accurate."*

### Question 3: *"Why is Difference `NULL` instead of `$0.00` for claim `C1005`?"*
* **Answer**:
  *"Claim `C1005` has never received any remittance from the payer. If you set Difference to `$0.00`, an accountant might assume the claim has been settled. If you set it to the billed amount ($60.00), you assume the full charge is collectible debt before the payer has even adjudicated it.*
  *Under our business rules, Difference is explicitly `None` (`NULL`). In the UI, it displays a distinct `No Remittance` status pill with a dash for difference, signaling to billing teams that the claim is awaiting payer processing."*

### Question 4: *"Can a claim be balanced if it had a denial code?"*
* **Answer**:
  *"Yes! Claim `C1007` is the textbook example. The payer initially rejected it with denial code `CO-197` ($0.00 paid). The billing team submitted prior authorization documentation, and the payer issued a second remittance `R1007` paying $110.00 with a $40.00 write-off (`CO-45`).*
  *Mathematically: `$150 - $110 - $40 = 0`, so the claim is **balanced**.*
  *Operationally: The billing department still needs to know this claim had a prior denial to track payer friction. My reconciliation service decouples the two: the claim evaluates as `status = "balanced"`, while preserving the `denial_history` audit badge."*

### Question 5: *"What happens if a user uploads Remittances before Claims?"*
* **Answer**:
  *"In real-world clearinghouses, payment checks (835s) often arrive before the bill (837) is entered. Initially, those remittances are stored with `claim_id = NULL` as unmatched.*
  *I implemented **bi-directional auto-relinking** in `import_service.py`. When a Claims CSV is imported, the engine automatically runs an atomic re-linking pass: any orphan remittances whose `source_claim_id` matches the newly added claims are instantly linked!*
  *Similarly, if Remittances are re-uploaded after claims exist, the engine resolves the link. Therefore, upload order never matters."*

---

## 6. Code Walkthrough: The 4 Key Functions Interviewers Will Ask to See

### 1. Pure Reconciliation Function
* **Location**: [`backend/app/services/reconciliation.py`](file:///C:/Users/rahul/OneDrive/Desktop/rules_project/claim_reconciliation_docs/backend/app/services/reconciliation.py#L23)
* **Function**: `calculate_claim_reconciliation(billed_cents, matched_remittances, claim_payer)`
* **What it does**:
  - If no remittances: returns totals with `difference_cents = None` and status `"no_remittance"`.
  - Calculates `difference_cents = billed_cents - paid_cents - adjustment_cents - patient_responsibility_cents`.
  - Determines status: `difference_cents == 0` -> `"balanced"` else `"unbalanced"`.
  - Scans for denial codes in `{"CO-16", "CO-50", "CO-197"}`.
  - Flags anomalies: `paid_cents > billed_cents` -> `"payment_exceeds_billed"`.

### 2. High-Performance Eager Loading Repository
* **Location**: [`backend/app/repositories/claim_repository.py`](file:///C:/Users/rahul/OneDrive/Desktop/rules_project/claim_reconciliation_docs/backend/app/repositories/claim_repository.py#L164)
* **Function**: `get_claims_paginated(payer, status, claim_id, flag, page, page_size)`
* **What it does**:
  - Uses `selectinload(Claim.remittances)` to prevent the classic **N+1 query problem** (fetches all claims and their child remittances in two optimized queries instead of N queries).
  - Performs case-insensitive search across claim IDs and patient account numbers.
  - Sorts deterministically by `claim_id ASC` and applies slicing for pagination (`page_size = 10, 20, 50`).

### 3. Ingestion Engine with Row-Level Atomic Transactions
* **Location**: [`backend/app/services/import_service.py`](file:///C:/Users/rahul/OneDrive/Desktop/rules_project/claim_reconciliation_docs/backend/app/services/import_service.py#L106)
* **Function**: `_import_claims_from_handle()` and `_import_remittances_from_handle()`
* **What it does**:
  - Validates CSV headers upfront; rejects malformed files before touching the database.
  - Wraps each row in `with self.db.begin_nested():` so a single bad row (e.g. invalid date on row 7) is logged to the rejection report without rolling back valid rows 1–6.
  - Auto-relinks waiting orphan remittances.

### 4. One-Click Benchmark Reset
* **Location**: [`backend/app/services/import_service.py`](file:///C:/Users/rahul/OneDrive/Desktop/rules_project/claim_reconciliation_docs/backend/app/services/import_service.py#L380)
* **Function**: `reset_benchmark_data()`
* **What it does**:
  - Flushes `remittances` and `claims` honoring foreign key ordering.
  - Re-seeds the canonical 12 claims and 13 remittances in milliseconds so the interviewer always has a safe benchmark.

---

## 7. How to Showcase MySQL Live in the Interview

If the interviewer asks: *"Open the database, show me the data, and update or delete a row."*

1. **In VS Code**, click the cylinder icon on the left sidebar (**Database Client** extension).
2. Connect to: `127.0.0.1:3306`, user `stitch_user`, password `stitch_password`, DB `claim_reconciliation`.
3. Expand **Tables** ➔ click **`claims`** or **`remittances`**:
   - It displays an **Excel-like table**.
   - **To Edit**: Double-click any amount (e.g., `billed_cents`), change it, and click Save.
   - **To Delete**: Select a row and click Delete.
4. Refresh `http://localhost:3000` to show that the React ledger immediately reflects the database changes!
5. When done, click **"Import CSV" ➔ "Reset to Demo Benchmark"** in the browser to return the database to the benchmark.

---

## 8. What Would You Build Next in Production? (The FDE Perspective)

When asked: *"If you had another 2 weeks, what would you add?"*

1. **Streaming ANSI X12 835 / 837 EDI Parsing**:
   *"Real clearinghouses send electronic data interchange (EDI) files, not CSVs. I would write a streaming Python generator for 837 claim files and 835 electronic remittance advices to eliminate CSV conversion steps."*
2. **Distributed Task Queue (Celery / Temporal)**:
   *"For hospital groups uploading 500,000 claims at month-end, I would offload batch parsing to Celery workers with Redis or Temporal workflows to handle long-running jobs with progress webhooks."*
3. **Cryptographic Event Sourcing Audit Ledger**:
   *"In compliance-heavy environments (HIPAA / SOC2), every manual adjustment should be an immutable event log entry signed with user attribution, timestamp, and previous vs. new balance."*
4. **AI-Powered Denial Appeal Assistant**:
   *"When a claim is flagged `CO-16` or `CO-197`, an LLM agent could ingest the EHR clinical chart, extract the missing prior auth or lab result, and generate the formal payer reconsideration packet automatically."*

---

## 9. Rapid-Fire Interview Q&A Cheatsheet

| Question | Short, Impactful Answer |
| :--- | :--- |
| **"Why MySQL 8.0?"** | Native foreign keys with `ON DELETE SET NULL`, ACID transactions, and non-negative `CHECK` constraints to prevent bad financial data at the schema level. |
| **"Why FastAPI?"** | Async performance, automated OpenAPI/Swagger documentation, strict type validation with Pydantic v2, and dependency injection for clean database sessions. |
| **"Why React + Vite?"** | Instant Hot Module Replacement (HMR), sub-second production bundle builds (~247 kB), and strict TypeScript typing aligned with backend Pydantic models. |
| **"How many tests do you have?"** | **38 automated tests**: 18 benchmark integration tests, 5 scale tests (50 claims), 7 import validation tests, and 8 pure reconciliation unit tests. |
| **"How did you test scale?"** | Created `data/generate_scale_data.py` generating 50 claims across 8 real-world billing archetypes, with `test_scale.py` verifying math invariants and pagination. |
