# Stitch Financial — Claim Reconciliation Platform
# Comprehensive Project Handoff & Machine Transfer Guide

> **Document Version**: 1.0  
> **Date**: October 30, 2026  
> **Repository**: [https://github.com/nakul143naps/claim-reconciliation](https://github.com/nakul143naps/claim-reconciliation)  
> **Live AWS Deployment**: [http://67.202.41.44:3000](http://67.202.41.44:3000)  
> **Purpose**: Complete reference manual and step-by-step transfer guide to deploy, run, test, and defend this platform on any new machine.

---

## 1. Project Overview & Objectives

### 1.1 What the Application Does
The **Stitch Fin Claim Reconciliation Platform** is an enterprise healthcare revenue integrity engine built for a Forward Deployed Engineer (FDE) take-home assignment. It solves the critical billing challenge where hospitals submit claims (invoices) to insurance payers and receive complex, multi-part remittances (payments, denials, contractual write-offs, and patient copays).

The system:
1. **Ingests Claims and Remittances** via CLI batch scripts or an interactive web upload modal.
2. **Reconciles Balances with Pure Integer Cents Arithmetic** (`BIGINT`), avoiding floating-point rounding errors.
3. **Implements the Full Status Decision Tree**:
   - `balanced`: Matched remittance exists and Difference = $0.00.
   - `unbalanced`: Matched remittance exists and Difference $\neq$ $0.00 (partial payments or overpayments).
   - `no_remittance`: Zero remittances received (Difference is strictly `null` to avoid false receivable assumptions).
4. **Distinguishes Operational Denial History from Mathematical Balance**:
   - A claim can be mathematically balanced after resolving an earlier denial (e.g. `C1007` was initially denied under `CO-197`, then settled under `CO-45`). The platform marks it `balanced` while preserving the `denial_history` audit badge.
5. **Safely Quarantines Orphaned Remittances (The Dual-Key Pattern)**:
   - Remittances referencing non-existent claims (e.g. `R1012` with $50.00 cash referencing missing claim `C9999`) are neither discarded nor assigned to phantom claims. They are isolated in an unmatched review queue with `claim_id = NULL` and `source_claim_id = 'C9999'`.
6. **Features a 3-Way Live Settlement Ledger**:
   - Tracks Gross Cash Collected ($990.00 / 58.2%), Gross Cash Uncollected ($710.00), Contractual Write-offs ($140.00), Patient Responsibility ($75.00), and Net Unsettled AR ($495.00).
7. **Includes a 1-Click "Reset to Demo Benchmark"**:
   - Allows users or interviewers to upload arbitrary CSV files or scale test datasets, and instantly snap back to the canonical 12 claims / 13 remittances benchmark in milliseconds.

### 1.2 Current Progress
* **Backend**: 100% complete. FastAPI REST API with health checks, summary KPIs, paginated claims ledger, denial detail drawer, unmatched queue, CSV import, template generation, and benchmark reset.
* **Frontend**: 100% complete. React 18 + TypeScript + Vite responsive dashboard with single-line controls, entries-per-page selector (`10 / 20 / 50`), denial appeal playbook, and multi-format exports (CSV, JSON, Print/PDF).
* **Database**: MySQL 8.0 running in Docker with foreign key integrity and check constraints.
* **Automated Tests**: **38 of 38 unit, integration, and scale tests passing** with 0 warnings.

---

## 2. Tech Stack & Libraries

### 2.1 Backend Frameworks & Drivers
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Python** | 3.11+ (Tested on 3.13.5) | Core backend language |
| **FastAPI** | 0.115.6 | High-performance asynchronous REST API framework |
| **Uvicorn** | 0.34.0 | ASGI web server |
| **SQLAlchemy** | 2.0.36 | ORM with declarative mapping and transactional sessions |
| **PyMySQL** | 1.1.1 | Pure Python MySQL database client driver |
| **Cryptography** | 43.0.3 | Secure authentication handshake for MySQL 8.0 `caching_sha2_password` |
| **Pydantic** | 2.10.4 | Data validation and schema serialization |
| **python-multipart** | 0.0.20 | File streaming parser for multipart/form-data CSV uploads |

### 2.2 Frontend Frameworks & Libraries
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | 18.3.1 | Component-based UI library |
| **TypeScript** | 5.6.3 | Static type safety and strict schema alignment |
| **Vite** | 6.0.1 | Modern high-speed build tool and dev server |
| **Lucide React** | 0.468.0 | Healthcare and audit UI icon system |
| **Tailwind CSS** | 3.4.16 | Utility styling and responsive flexbox layouts |

### 2.3 Database & Infrastructure
* **MySQL 8.0 Community Server**: Runs inside Docker container `claim_reconciliation_db` on port `3306`.
* **SQLite (in-memory with `StaticPool`)**: Used for sub-second, isolated test suite execution (`pytest`).

### 2.4 Testing Framework
* **Pytest**: 9.2.0 test runner.
* **HTTPX**: 0.28.1 client for FastAPI `TestClient` integration testing.
* **AnyIO**: 4.15.1 async concurrency backend.

---

## 3. Database Schema & Models

### 3.1 Entity Relationship Diagram

```mermaid
erDiagram
    CLAIMS ||--o{ REMITTANCES : "has many (0..N)"
    CLAIMS {
        varchar(20) claim_id PK
        varchar(50) patient_account
        varchar(100) payer
        date service_date
        varchar(10) cpt
        bigint billed_cents
    }
    REMITTANCES {
        varchar(20) remit_id PK
        varchar(20) source_claim_id "Indexed (Raw input)"
        varchar(20) claim_id FK "Nullable (Validated link)"
        varchar(100) payer
        bigint paid_cents
        bigint adjustment_cents
        bigint patient_responsibility_cents
        varchar(30) reason_code "Nullable"
        date posted_date
    }
```

### 3.2 Table Definitions

#### Table: `claims`
Stores unique medical insurance claims billed by the clinic.
```sql
CREATE TABLE claims (
    claim_id VARCHAR(20) NOT NULL PRIMARY KEY,
    patient_account VARCHAR(50) NOT NULL,
    payer VARCHAR(100) NOT NULL,
    service_date DATE NOT NULL,
    cpt VARCHAR(10) NOT NULL,
    billed_cents BIGINT NOT NULL,
    CONSTRAINT chk_claims_billed_cents_nonnegative CHECK (billed_cents >= 0),
    INDEX ix_claims_payer (payer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: `remittances`
Stores payments, write-offs, and denial advices issued by insurance payers.
```sql
CREATE TABLE remittances (
    remit_id VARCHAR(20) NOT NULL PRIMARY KEY,
    source_claim_id VARCHAR(20) NOT NULL,
    claim_id VARCHAR(20) DEFAULT NULL,
    payer VARCHAR(100) NOT NULL,
    paid_cents BIGINT NOT NULL,
    adjustment_cents BIGINT NOT NULL,
    patient_responsibility_cents BIGINT NOT NULL,
    reason_code VARCHAR(30) DEFAULT NULL,
    posted_date DATE NOT NULL,
    CONSTRAINT fk_remittances_claim_id FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE SET NULL,
    CONSTRAINT chk_remit_paid_cents_nonnegative CHECK (paid_cents >= 0),
    CONSTRAINT chk_remit_adj_cents_nonnegative CHECK (adjustment_cents >= 0),
    CONSTRAINT chk_remit_patient_resp_nonnegative CHECK (patient_responsibility_cents >= 0),
    INDEX ix_remittances_source_claim_id (source_claim_id),
    INDEX ix_remittances_claim_id (claim_id),
    INDEX ix_remittances_posted_date_remit_id (posted_date, remit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 The Dual-Key Pattern Explained
* **Problem**: In raw CSV/835 feeds, payers frequently send checks for missing claims (e.g. `R1012` paying $50.00 for `C9999`).
* **Naive Bad Solution A**: Discard `R1012`. *Fatal flaw*: Losing track of real cash violates accounting standards.
* **Naive Bad Solution B**: Auto-generate a dummy claim `C9999`. *Fatal flaw*: Artificially invents phantom accounts receivable on the clinic balance sheet.
* **Our Production Solution**:
  - `source_claim_id` stores `"C9999"` (the raw audit trail).
  - `claim_id` (the foreign key) is set to `NULL`.
  - The $50.00 is accounted for in `all_remittance_paid_cents` and isolated in `/api/remittances/unmatched`, while never distorting matched claims reconciliation.

### 3.4 Seed Data & Initial Scripts
* **Canonical Benchmark Data**:
  - `data/claims.csv` (12 claims)
  - `data/remittances.csv` (13 remittances)
  - Seed script: `python -m backend.app.scripts.import_data`
* **Scale Test Dataset**:
  - `data/claims_large.csv` (50 claims)
  - `data/remittances_large.csv` (52 remittances)
  - Generator script: `python data/generate_scale_data.py --count 50`

---

## 4. API Endpoints & Architecture

Base URL: `http://localhost:8000`

### 4.1 System & Health
| Method | Endpoint | Description | Response Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Verifies API and MySQL database connectivity | `200 OK` or `503 Unavailable` |

### 4.2 Financial Summary & KPIs
| Method | Endpoint | Description | Response Model |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/summary` | Live balance sheet, collected vs uncollected cash, net unsettled AR, denial counts, review flags | `ReconciliationSummary` |

### 4.3 Claims Reconciliation Workspace
| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/claims` | `page` (default 1), `page_size` (10/20/50), `payer`, `status` (`balanced`/`unbalanced`/`no_remittance`), `claim_id`, `flag` (`denial_history`/`payment_exceeds_billed`/`payer_mismatch`) | Paginated and filtered claims list |
| `GET` | `/api/claims/{claim_id}` | Path: `claim_id` (e.g. `C1007`) | Full claim detail with chronological remittance audit log and denial appeal guidance |
| `GET` | `/api/claims/export` | Same filters as `/api/claims` | Streams CSV export of the reconciled ledger |

### 4.4 Unmatched Remittances
| Method | Endpoint | Description | Response Model |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/remittances/unmatched` | Lists all orphan payments (`claim_id = NULL`) with source claim IDs | `UnmatchedRemittancesListResponse` |

### 4.5 Batch Ingestion & Safety Net
| Method | Endpoint | Payload | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/import/claims` | Multipart `file` (`.csv`) | Ingests claims CSV in-memory with row-by-row validation and auto orphan re-linking |
| `POST` | `/api/import/remittances` | Multipart `file` (`.csv`) | Ingests remittances CSV with dual-key foreign key resolution |
| `POST` | `/api/import/reset` | Empty | Atomic wipe and reload of canonical 12 claims / 13 remittances benchmark |
| `GET` | `/api/import/templates/{file_type}` | Path: `claims` or `remittances` | Downloads pre-formatted sample CSV template |

### 4.6 Authentication Flow
* The platform includes a simulated executive authentication flow ([`frontend/src/components/SignInModal.tsx`](file:///C:/Users/rahul/OneDrive/Desktop/rules_project/claim_reconciliation_docs/frontend/src/components/SignInModal.tsx)) storing session identity in local storage.
* For enterprise deployment, the architecture is ready to mount FastAPI `OAuth2PasswordBearer` and JWT validation middleware in `backend/app/core/security.py`.

---

## 5. Configuration & Environment Variables

Create a file named `.env` in `backend/.env` (a template is provided in `backend/.env.example`):

```ini
# ==============================================================================
# Database Configuration
# ==============================================================================
# PyMySQL driver with user, password, host, port, and database name
DATABASE_URL=mysql+pymysql://stitch_user:stitch_password@localhost:3306/claim_reconciliation

# ==============================================================================
# API Server Configuration
# ==============================================================================
API_HOST=0.0.0.0
API_PORT=8000

# CORS origins allowed to communicate with the FastAPI backend
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# Application environment (development | staging | production)
ENVIRONMENT=development
```

---

## 6. Current Status & Pending Roadmap

### 6.1 Finished & Production-Ready Features
- [x] **Deterministic Integer Cent Calculations**: `BIGINT` throughout backend, database, and TypeScript interfaces.
- [x] **Reconciliation Decision Tree**: Mathematically rigid evaluation of `balanced`, `unbalanced`, and `no_remittance`.
- [x] **Denial Badges Independent of Balance**: Historical tracking for `CO-16`, `CO-50`, `CO-197`.
- [x] **Dual-Key Orphan Remittance Quarantine**: Preserves cash accountability without corrupting claims table.
- [x] **3-Way Settlement Progress Ledger**: Shows collected cash ($990.00), write-offs ($140.00), copays ($75.00), and net unsettled AR ($495.00).
- [x] **Single-Line Header Layout**: Compact filter bar with entries selector (`Show: 10 / 20 / 50`), `[Import CSV]`, and `[Export Ledger]`.
- [x] **Bi-Directional Auto-Linking**: Regardless of whether Claims or Remittances are uploaded first, the system automatically resolves and links orphan records.
- [x] **1-Click Reset to Demo Benchmark**: Instantly resets data experiments back to canonical 12 claims.
- [x] **Scale Dataset & Testing**: Dedicated 50-claim generator (`generate_scale_data.py`) and property-based test suite (`test_scale.py`).
- [x] **Automated Test Coverage**: **38 of 38 tests passing**.

### 6.2 Pending Roadmap (Forward Deployed Engineer Future Iterations)
1. **Streaming ANSI X12 835 / 837 EDI Parser**: Replace batch CSVs with native hospital EDI streaming parser.
2. **Distributed Asynchronous Worker Queue**: Integrate Celery or Temporal for multi-gigabyte hospital feeds.
3. **Cryptographic Event Sourcing Audit Trail**: Immutable ledger tracking every payment adjustment with user ID and timestamp.
4. **AI Clinical Denial Appeal Assistant**: LLM integration to automatically draft formal appeal letters using patient clinical documentation.

### 6.3 Known Design Decisions & Constraints
* **Reversals Deferred**: Per `RULES.md`, negative amounts in input files are rejected at ingestion rather than modeled as reversals.
* **Separation of Benchmark from Scale Files**: `data/generate.py`, `data/claims.csv`, and `data/remittances.csv` are kept 100% pristine to guarantee take-home automated grading passes.

---

## 7. Machine Transfer: Exact Commands to Run

### Step 1: Clone Repository
```bash
git clone https://github.com/nakul143naps/claim-reconciliation.git
cd claim-reconciliation
```

### Step 2: Start MySQL Database in Docker
```bash
docker compose up -d
```
Verify container is running and healthy:
```bash
docker ps
```
*(Container `claim_reconciliation_db` should show `healthy` on port `0.0.0.0:3306->3306/tcp`)*.

### Step 3: Set Up Python Backend
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment:
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Windows (Command Prompt):
# .venv\Scripts\activate.bat
# Linux / macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed benchmark database (12 claims / 13 remittances)
python -m backend.app.scripts.import_data
```

### Step 4: Run Backend Server
```bash
# From project root with .venv activated:
uvicorn backend.app.main:app --reload --port 8000
```
* **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Step 5: Set Up and Run React Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
* **Web UI Dashboard**: Open [http://localhost:3000](http://localhost:3000)

### Step 6: Run Full Automated Test Suite
In a new terminal (with backend `.venv` activated):
```bash
cd backend
pytest -v
```
**Expected Output**: `======================== 38 passed in 2.17s ========================`

---

## 8. Quick Visual Inspection (VS Code Database Client)

If an interviewer asks to view or edit the live MySQL database:
1. In VS Code, install the extension **Database Client** (by `cweijan`).
2. Click the cylinder icon in the left activity bar ➔ click **Create Connection** ➔ select **MySQL**.
3. Enter credentials:
   - **Host**: `127.0.0.1`
   - **Port**: `3306`
   - **Username**: `stitch_user`
   - **Password**: `stitch_password`
   - **Database**: `claim_reconciliation`
4. Click **Connect**: You can now view and edit `claims` and `remittances` tables like an Excel spreadsheet.
5. In the web UI, click **"Import CSV" ➔ "Reset to Demo Benchmark"** anytime to instantly restore original data.
