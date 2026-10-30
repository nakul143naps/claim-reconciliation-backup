# Stitch Fin Forward Deployed Engineer (FDE) — Complete Codebase Review & Interview Script

> **Candidate**: Nakul Kothlapur  
> **Role**: Forward Deployed Engineer (FDE)  
> **Company**: Stitch Fin  
> **Repository**: [https://github.com/nakul143naps/claim-reconciliation](https://github.com/nakul143naps/claim-reconciliation)  
> **Live Production AWS URL**: [http://67.202.41.44](http://67.202.41.44)  

---

## 1. The 60-Second Elevator Pitch

If an interviewer asks: *"Nakul, walk me through what you built and how the architecture works,"* say this:

> *"I built an enterprise-grade medical claim reconciliation platform designed for healthcare revenue cycle management. 
> 
> In healthcare RCM, claims are submitted to insurance payers, but remittance advices come back in separate, asynchronous batches with partial payments, contractual write-offs, and denial adjustments. The core problem is accurately tracking which claims are settled, which are underpaid, which have historical denials, and which payments are orphaned without a claim.
> 
> I structured the project around a **clean, decoupled architecture**:
> 1. **Authoritative Python 3.13 / FastAPI Backend**: All financial calculations, status determinations, and denial audits happen on the server—the React client never computes financial balances independently.
> 2. **Normalized MySQL 8.0 Database**: All monetary amounts are stored as integer `BigInteger` cents to completely eliminate IEEE 754 floating-point rounding drift.
> 3. **Bi-Directional Orphan Re-Linking**: Remittances that arrive before their parent claim are safely preserved as orphans, and automatically link the moment the claim is ingested.
> 4. **Eager-Loaded Repository Layer**: Queries use `selectinload` to prevent the N+1 query problem, enabling sub-millisecond responses even under scale.
> 5. **React 18 TypeScript Frontend**: A real-time executive ledger with dynamic search, multi-flag filtering, 10/20/50 pagination, and drag-and-drop CSV batch ingestion with row-level error reporting.
> 
> The platform is backed by **38 automated unit, integration, and scale tests**, and is running live in production on an **AWS EC2 instance** behind an **Nginx reverse proxy**."*

---

## 2. Directory Structure & File-by-File Breakdown

```
claim-reconciliation/
│
├── backend/                             # Python 3.13 FastAPI Service
│   ├── app/
│   │   ├── api/                         # HTTP Route Handlers (FastAPI Endpoints)
│   │   │   ├── claims.py                # GET /api/claims, /api/claims/{id}, export CSV
│   │   │   ├── remittances.py           # GET /api/remittances/unmatched (orphans)
│   │   │   ├── summary.py               # GET /api/summary (executive KPIs)
│   │   │   ├── ingest.py                # POST /api/import/* (CSV ingestion & reset)
│   │   │   └── health.py                # GET /api/health (database ping)
│   │   ├── core/
│   │   │   └── config.py                # Pydantic BaseSettings (DB URL, CORS, environment)
│   │   ├── db/
│   │   │   ├── models.py                # SQLAlchemy 2.0 Declarative Models (Claim, Remittance)
│   │   │   └── session.py               # Engine, sessionmaker, and get_db dependency
│   │   ├── repositories/
│   │   │   └── claim_repository.py      # Data access layer (SQL queries, eager loads)
│   │   ├── schemas/                     # Pydantic v2 Request/Response Schemas
│   │   │   ├── claim.py                 # ClaimListItem, ClaimDetail, ClaimTotals
│   │   │   ├── remittance.py            # RemittanceDetail, UnmatchedRemittanceItem
│   │   │   ├── summary.py               # ReconciliationSummary
│   │   │   ├── import_report.py         # FileImportResult, FullImportReport, RowIssue
│   │   │   └── errors.py                # ErrorResponse schema
│   │   ├── services/
│   │   │   ├── reconciliation.py        # PURE calculation engine (Zero DB dependencies)
│   │   │   └── import_service.py        # CSV parsing, atomic validation, auto-relinking
│   │   └── main.py                      # FastAPI application entrypoint, CORS, routers
│   ├── tests/                           # 38 Automated Pytest Test Suite
│   │   ├── conftest.py                  # In-memory SQLite fixtures & mock DB sessions
│   │   ├── unit/
│   │   │   ├── test_reconciliation.py   # Unit tests for 4 core reconciliation rules
│   │   │   └── test_import.py           # Validation, duplicate detection, bad CSV rows
│   │   └── integration/
│   │       ├── test_api.py              # HTTP contract tests for all endpoints
│   │       └── test_scale.py            # 1,000+ claim scale benchmark & pagination tests
│   ├── requirements.txt                 # Exact Python dependencies
│   ├── nginx.conf                       # Production reverse-proxy config on AWS
│   └── claim-backend.service            # Systemd 24/7 service unit file
│
├── frontend/                            # React 18 TypeScript Single Page Application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts                # Typed Axios/Fetch API client wrapper
│   │   ├── components/
│   │   │   ├── ClaimsTable.tsx          # Main table with search, filters, pagination, export
│   │   │   ├── SummaryCards.tsx         # 5 KPI cards with live completion progress bar
│   │   │   ├── ClaimDetailModal.tsx     # Slide-over inspection drawer for remittances
│   │   │   ├── ImportCsvModal.tsx       # Drag-and-drop CSV importer & benchmark reset
│   │   │   ├── UnmatchedRemittancesTable.tsx # Orphan remittances review queue
│   │   │   ├── StatusBadge.tsx          # Green "Balanced", Amber "Unbalanced", Gray "No Remit"
│   │   │   ├── FlagBadge.tsx            # Red Denial (CO-*), Amber Overpaid, Blue Mismatch
│   │   │   ├── HeroSection.tsx          # Enterprise SaaS executive header
│   │   │   ├── FeaturesSection.tsx      # RCM workflow feature cards
│   │   │   ├── HowItWorksSection.tsx    # 3-step reconciliation workflow explanation
│   │   │   ├── FAQSection.tsx           # Technical & business FAQ accordion
│   │   │   ├── Navbar.tsx               # Top navigation bar with live AWS indicator
│   │   │   └── Footer.tsx               # Professional platform footer
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript interfaces matching backend Pydantic models
│   │   ├── utils/
│   │   │   └── formatters.ts            # Currency ($1,234.56), date, and badge formatters
│   │   ├── App.tsx                      # Root component, state coordination, and tab views
│   │   └── main.tsx                     # React DOM root render
│   ├── package.json                     # Frontend dependencies (React 18, Vite, Lucide)
│   └── vite.config.ts                   # Vite bundler configuration
│
└── data/                                # Benchmark data & scale generation scripts
    ├── claims.csv                       # Canonical 12 benchmark claims
    ├── remittances.csv                  # Canonical 13 benchmark remittances
    └── generate_scale_data.py           # Synthetic scale dataset generator (10k+ rows)
```

---

## 3. Deep Dive into the Most Important Backend Files

### 3.1 `backend/app/services/reconciliation.py` (The Heart of the System)
* **What it does**: This is a **pure, functional calculation engine**. It contains zero database imports, zero I/O, and zero network calls. It takes raw numbers and returns financial totals, status, operational flags, and denial history.
* **Why it's designed this way**: Separating pure logic from database queries makes the core business rules **100% deterministic and unit-testable** in microseconds.
* **The Key Code Snippet**:
```python
ASSIGNMENT_DENIAL_CODES: Set[str] = {"CO-16", "CO-50", "CO-197"}

def calculate_claim_reconciliation(
    billed_cents: int,
    matched_remittances: List[Remittance],
    claim_payer: Optional[str] = None,
) -> Tuple[ClaimTotals, str, List[str], bool]:
    # Rule 1: Claims with no remittances have difference = None and status "no_remittance"
    if not matched_remittances:
        totals = ClaimTotals(
            paid_cents=0, adjustment_cents=0, patient_responsibility_cents=0, difference_cents=None
        )
        return totals, "no_remittance", [], False

    # Aggregate all child remittances
    paid_cents = sum(r.paid_cents for r in matched_remittances)
    adjustment_cents = sum(r.adjustment_cents for r in matched_remittances)
    patient_responsibility_cents = sum(r.patient_responsibility_cents for r in matched_remittances)

    # Core Accounting Formula
    difference_cents = billed_cents - paid_cents - adjustment_cents - patient_responsibility_cents
    status = "balanced" if difference_cents == 0 else "unbalanced"

    # Rule 3: Denial History detection
    has_denial_history = any(
        normalize_code(r.reason_code) in ASSIGNMENT_DENIAL_CODES
        for r in matched_remittances
    )

    # Operational anomaly flags
    flags: List[str] = []
    if has_denial_history:
        flags.append("denial_history")
    if paid_cents > billed_cents:
        flags.append("payment_exceeds_billed")
    if claim_payer:
        norm_claim_payer = claim_payer.strip().lower()
        if any(r.payer.strip().lower() != norm_claim_payer for r in matched_remittances):
            flags.append("payer_mismatch")

    totals = ClaimTotals(
        paid_cents=paid_cents,
        adjustment_cents=adjustment_cents,
        patient_responsibility_cents=patient_responsibility_cents,
        difference_cents=difference_cents,
    )
    return totals, status, flags, has_denial_history
```

---

### 3.2 `backend/app/db/models.py` (Database Schema & Financial Integrity)
* **What it does**: Defines SQLAlchemy 2.0 ORM mappings for `Claim` and `Remittance` tables.
* **Key Design Highlights**:
  1. **Integer Cents (`BigInteger`)**: We store `$150.00` as `15000`. Storing currency as `FLOAT` or `DOUBLE` introduces IEEE 754 precision errors (e.g., `0.1 + 0.2 = 0.30000000000000004`), which causes claims to show false discrepancies.
  2. **Check Constraints**: `CheckConstraint("billed_cents >= 0")` and `CheckConstraint("paid_cents >= 0")` enforce non-negative values at the MySQL storage engine level.
  3. **Dual Claim ID Architecture**:
     - `source_claim_id`: Stores the string claim ID extracted directly from the incoming remittance CSV.
     - `claim_id`: Nullable foreign key pointing to `claims.claim_id` with `ondelete="SET NULL"`.
     - *Why?* If a remittance references `CLM-999` before `CLM-999` is imported, MySQL foreign keys won't reject the row! We store `source_claim_id = "CLM-999"` and `claim_id = NULL`. When `CLM-999` is eventually imported, our auto-linker links them instantly.

```python
class Claim(Base):
    __tablename__ = "claims"
    claim_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    patient_account: Mapped[str] = mapped_column(String(50), nullable=False)
    payer: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    cpt: Mapped[str] = mapped_column(String(10), nullable=False)
    billed_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)

    remittances: Mapped[List["Remittance"]] = relationship(
        "Remittance", back_populates="claim", cascade="all, delete-orphan",
        order_by="[Remittance.posted_date, Remittance.remit_id]"
    )

class Remittance(Base):
    __tablename__ = "remittances"
    remit_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    source_claim_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    claim_id: Mapped[Optional[str]] = mapped_column(
        String(20), ForeignKey("claims.claim_id", ondelete="SET NULL"), nullable=True, index=True
    )
    paid_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    adjustment_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    patient_responsibility_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    posted_date: Mapped[date] = mapped_column(Date, nullable=False)
```

---

### 3.3 `backend/app/repositories/claim_repository.py` (High-Performance Query Layer)
* **What it does**: Handles all SQL generation, aggregation, filtering, and pagination.
* **Solving the N+1 Query Problem**:
  If you fetch 1,000 claims and then access `claim.remittances` in a loop, standard ORMs execute 1 initial query + 1,000 secondary queries (1,001 network round-trips to MySQL!).
  We use **`selectinload(Claim.remittances)`**:
  - Query 1: `SELECT * FROM claims ORDER BY claim_id ASC;`
  - Query 2: `SELECT * FROM remittances WHERE claim_id IN ('CLM-001', 'CLM-002', ...);`
  - SQLAlchemy merges them in Python memory. **Total SQL queries executed = 2, regardless of whether there are 10 claims or 10,000 claims!**
* **Single-Pass SQL Aggregation for Executive KPIs**:
  Instead of loading all records into Python to sum them up, `get_summary()` pushes the math into MySQL using conditional SQL `CASE` statements:
```python
remit_agg = self.db.query(
    func.coalesce(func.sum(Remittance.paid_cents), 0),
    func.coalesce(func.sum(case((Remittance.claim_id.isnot(None), Remittance.paid_cents), else_=0)), 0),
    func.coalesce(func.sum(case((Remittance.claim_id.is_(None), 1), else_=0)), 0), # Orphan count
    func.coalesce(func.sum(case((Remittance.claim_id.is_(None), Remittance.paid_cents), else_=0)), 0), # Orphan $
    func.coalesce(func.sum(case((Remittance.claim_id.isnot(None), Remittance.adjustment_cents), else_=0)), 0),
    func.coalesce(func.sum(case((Remittance.claim_id.isnot(None), Remittance.patient_responsibility_cents), else_=0)), 0),
).first()
```

---

### 3.4 `backend/app/services/import_service.py` (Production Ingestion Engine)
* **What it does**: Handles CSV file uploads, header validation, data sanitization, duplicate detection, and atomic transaction execution.
* **Three Key Architectural Patterns**:
  1. **Fail-Fast Header Validation**: Before touching the database, it inspects row 0. If `billed_cents` or `remit_id` is missing, it raises `CSVHeaderError` immediately without inserting dirty records.
  2. **Row-Level Savepoints (`db.begin_nested()`)**: Uses SQL `SAVEPOINT`. If row 15 has an invalid date or negative number, only row 15 is caught and rolled back. Valid rows 1–14 and 16–100 are safely inserted!
  3. **Bi-Directional Orphan Re-Linking**:
     ```python
     # When new claims are imported, query if any existing remittances were waiting for them:
     if seen_in_batch:
         new_claim_ids = list(seen_in_batch.keys())
         waiting_remits = (
             self.db.query(Remittance)
             .filter(Remittance.claim_id.is_(None), Remittance.source_claim_id.in_(new_claim_ids))
             .all()
         )
         for r in waiting_remits:
             r.claim_id = r.source_claim_id  # Re-link orphan!
         self.db.commit()
     ```

---

### 3.5 `backend/app/api/claims.py` & `ingest.py` (FastAPI Router Endpoints)
* **`GET /api/claims`**:
  - Supports query parameters: `payer`, `status` (balanced/unbalanced/no_remittance), `claim_id` (substring search across both Claim ID and Patient Account), `flag` (denial_history, payment_exceeds_billed, payer_mismatch), `page`, and `page_size`.
* **`GET /api/claims/{claim_id}`**:
  - Returns complete claim detail with all matched remittances in chronological order, accompanied by a dynamic denial appeal recommendation if denial codes (`CO-16`, `CO-50`, `CO-197`) are present.
* **`GET /api/claims/export/csv`**:
  - Streams an on-the-fly CSV of the entire reconciliation audit ledger formatted with dollar amounts for finance teams.
* **`POST /api/import/both`**:
  - Accepts multipart form uploads for both `claims.csv` and `remittances.csv` in a single HTTP request, processing both inside an atomic database transaction.
* **`POST /api/import/reset`**:
  - Resets the database to the canonical 12-claim benchmark in 1 click for reproducible demonstrations.

---

## 4. Deep Dive into the Frontend (React 18 + TypeScript)

### 4.1 State Flow in `frontend/src/App.tsx`
* **Single Source of Truth**: The root `App` component manages global state:
  - `claims`: Array of current page items.
  - `summary`: Live aggregate KPI object.
  - `totalClaims`: Total records matching active filters.
  - `selectedClaimId`: Triggers the `ClaimDetailModal`.
* **Reactive Fetching**: When a user changes filters, searches, switches page size (10/20/50), or imports a new CSV file, a single `fetchData()` hook executes in parallel (`Promise.all([fetchSummary(), fetchClaims()])`).

### 4.2 Key Components
* **`ClaimsTable.tsx`**:
  - Filter bar with responsive layout, debounced search, payer dropdown, status dropdown, flag dropdown, and a 1-click Reset button.
  - "Show: 10 / 20 / 50" entries selector with smart pagination controls.
* **`SummaryCards.tsx`**:
  - 5 KPI summary cards displaying Total Billed, Total Paid, Total Adjustments, Patient Responsibility, and Net Unsettled Cash.
  - Visual financial recovery completion bar: `(Total Paid + Adjustments + Patient Resp) / Total Billed`.
* **`ClaimDetailModal.tsx`**:
  - Comprehensive inspection drawer. If a claim has denial codes, it renders the **Denial Appeal Playbook** explaining the exact denial reason (e.g., `CO-16: Lacks Information`, `CO-50: Non-Covered Service`, `CO-197: Pre-certification Absent`) and the recommended appeal action.
* **`ImportCsvModal.tsx`**:
  - Drag-and-drop zone supporting single or dual file ingestion with instant visual feedback and row-by-row error logs.

---

## 5. The Top 4 Business Rules & Where to Find Them

| Rule # | Business Requirement | Where It Lives in Code |
| :--- | :--- | :--- |
| **Rule 1** | **Multi-Remittance Summation & Status**<br>`difference = billed - paid - adj - pt_resp`<br>Status: `balanced` ($0 diff), `unbalanced` (non-zero diff), `no_remittance` (0 remits, diff=None). | [`reconciliation.py#L33-L47`](backend/app/services/reconciliation.py#L33-L47) |
| **Rule 2** | **Integer Precision Guarantee**<br>Zero float drift. All currency parsed, validated, stored, and calculated as integer cents. | [`models.py#L31`](backend/app/db/models.py#L31)<br>[`import_service.py#L55-L74`](backend/app/services/import_service.py#L55-L74) |
| **Rule 3** | **Denial History & Flag Detection**<br>Flag `denial_history` if any matched remit has reason code `CO-16`, `CO-50`, or `CO-197`. Also detect `payment_exceeds_billed` and `payer_mismatch`. | [`reconciliation.py#L50-L66`](backend/app/services/reconciliation.py#L50-L66) |
| **Rule 4** | **Orphan Remittance Preservation & Auto-Relink**<br>Remittances without parent claims stored with `claim_id = NULL`. Automatically re-linked when parent claim arrives. | [`models.py#L55-L60`](backend/app/db/models.py#L55-L60)<br>[`import_service.py#L210-L225`](backend/app/services/import_service.py#L210-L225) |

---

## 6. How to Answer Common Tough Interview Questions

### Q1: "Why did you build the reconciliation as a pure function instead of putting it on the SQLAlchemy model?"
> *"By designing `calculate_claim_reconciliation` as a pure, stateless function with zero database dependencies, I separated business logic from persistence. This allows our test suite to test dozens of complex multi-remittance combinations in sub-milliseconds without spinning up database transactions. It also ensures that if we ever swap database engines or run batch jobs in PySpark or Celery, the core accounting logic remains 100% reusable."*

### Q2: "How does your system handle the N+1 query problem?"
> *"In naive ORM setups, iterating over 1,000 claims to access `claim.remittances` executes 1,001 queries. In `ClaimRepository.get_claims_paginated`, I explicitly configured `query.options(selectinload(Claim.remittances))`. SQLAlchemy issues exactly two SQL queries: one for the claims and one bulk query using `WHERE claim_id IN (...)`, merging them in memory. Our API response time stays flat under scale."*

### Q3: "What happens if a user uploads a CSV where row 50 has a negative amount or corrupted date?"
> *"Our `ImportService` wraps each row insert in a SQL Savepoint (`with self.db.begin_nested()`). If row 50 fails validation, only that specific row is caught and rolled back. Valid rows 1 through 49 and 51 through 100 are committed to MySQL, and the API returns a structured report listing the exact row number, record ID, and human-readable error description for row 50."*

### Q4: "How does your system handle remittances that arrive before their claim?"
> *"Our `remittances` table has two claim ID columns: `source_claim_id` (the raw string from the CSV) and `claim_id` (a nullable foreign key). If the claim doesn't exist yet, we store the record with `claim_id = NULL` so it is safely held in our Unmatched Remittance queue. When `claims.csv` is imported, our ingestion engine scans for any orphan remittances where `source_claim_id IN (new_claim_ids)` and atomically updates their foreign keys in the same transaction."*

---

## 7. Automated Testing Summary

The repository includes **38 automated pytest tests** covering 100% of the core business logic:
- `backend/tests/unit/test_reconciliation.py` (14 tests): Balanced claims, partial payments, multiple remittances, overpayments, denial codes, payer mismatches.
- `backend/tests/unit/test_import.py` (10 tests): Malformed CSV headers, negative cents, fractional cents, invalid dates, duplicate detection.
- `backend/tests/integration/test_api.py` (10 tests): API contract verification for `/api/claims`, `/api/summary`, `/api/remittances/unmatched`, and `/api/import/*`.
- `backend/tests/integration/test_scale.py` (4 tests): Ingestion and paginated retrieval of 1,000+ synthetic claims, validating sub-second latency.
