# Stitch Financial — Claim Reconciliation Engine

A production-grade claims reconciliation and audit platform designed for healthcare billing operations. This system ingests medical billing claims and payer remittances, calculates claim-level balances with deterministic integer arithmetic, preserves complete remittance audit trails (including prior denial history), and isolates orphaned payments.

---

## 1. System Architecture & Flow

```mermaid
flowchart TD
    subgraph Ingestion["1. Data Ingestion & Validation"]
        A["claims.csv & remittances.csv"] --> B["import_data.py CLI"]
        B --> C{"Schema & Date Validation"}
        C -->|Valid| D["Atomic DB Transaction"]
        C -->|Invalid| E["Row Issue Report"]
    end

    subgraph Storage["2. Persistence Layer (MySQL 8.0)"]
        D --> F[("claims table")]
        D --> G[("remittances table")]
        F -.->|1-to-Many| G
        Note["Unmatched remittances retain source_claim_id<br/>with claim_id = NULL"]
    end

    subgraph Service["3. Core Reconciliation Engine"]
        F & G --> H["ClaimRepository"]
        H --> I["Reconciliation Service (Pure Logic)"]
        I --> J["Status: balanced | unbalanced | no_remittance"]
        I --> K["Flags: denial_history | payment_exceeds_billed | payer_mismatch"]
    end

    subgraph API["4. FastAPI Backend"]
        J & K --> L["REST API /api"]
        L --> M["GET /api/health"]
        L --> N["GET /api/summary"]
        L --> O["GET /api/claims"]
        L --> P["GET /api/claims/{id}"]
        L --> Q["GET /api/remittances/unmatched"]
    end

    subgraph UI["5. React Frontend"]
        M & N & O & P & Q --> R["Vite + React UI"]
        R --> S["KPI Dashboard Cards"]
        R --> T["Filterable Claims Audit Table"]
        R --> U["Claim Detail Drawer & Audit Trail"]
        R --> V["Unmatched Remittances Queue"]
    end
```

---

## 2. Core Business Rules & Financial Precision

### 2.1 Integer Cents Only
Floating-point arithmetic (e.g. `0.1 + 0.2`) introduces binary rounding errors. In financial systems, all currency is represented and persisted as integer cents (`BIGINT` in MySQL, integer types in Python/TypeScript). Display formatting to dollars/rupees happens strictly in the UI layer.

### 2.2 Reconciliation Formula
For any claim with at least one matched remittance:
$$\text{Difference} = \text{Billed Cents} - \sum \text{Paid Cents} - \sum \text{Adjustment Cents} - \sum \text{Patient Responsibility Cents}$$

### 2.3 Status Decision Tree
* **`balanced`**: At least one matched remittance exists and $\text{Difference} = 0$.
* **`unbalanced`**: At least one matched remittance exists and $\text{Difference} \neq 0$ (including negative balances).
* **`no_remittance`**: No remittance advice has been received. The difference is explicitly `null` (not $0 or billed amount), preventing false assumptions of collectible debt.

### 2.4 Denial History vs. Financial Status
Assignment denial codes: **`CO-16`**, **`CO-50`**, and **`CO-197`**.
* A claim can be mathematically **`balanced`** and still have a **`denial_history`** flag if an earlier remittance was rejected before being resolved (e.g. claim `C1007`).
* Contractual adjustment codes like **`CO-45`** are standard write-offs and are not treated as denials.

### 2.5 Orphaned (Unmatched) Remittances
When a payer sends payment for an unknown claim (e.g. remit `R1012` referencing `C9999`):
* The record is **never discarded** and **no fake claim is invented**.
* `source_claim_id` stores `"C9999"` while the foreign key `claim_id` is set to `NULL`.
* The cash is tracked in `all_remittance_paid_cents` ($1,040.00) while isolated from `matched_paid_cents` ($990.00) so valid claims remain accurate.

---

## 3. Tech Stack

* **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic v2, PyMySQL, Cryptography.
* **Database**: MySQL 8.0 (Dockerized) with persistent volumes and healthcheck; SQLite with `StaticPool` for fast in-memory testing.
* **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Accessible High-Contrast CSS.
* **Testing**: Pytest, FastAPI TestClient, HTTPX (25 automated unit and integration tests).

---

## 4. Repository Structure

```text
claim_reconciliation_docs/
├── backend/
│   ├── app/
│   │   ├── api/             # HTTP endpoints (/health, /summary, /claims, /remittances)
│   │   ├── core/            # Configuration management & environment settings
│   │   ├── db/              # SQLAlchemy models, connection engine & sessions
│   │   ├── repositories/    # Query aggregation, eager-loading & filtering
│   │   ├── schemas/         # Pydantic request/response & error contracts
│   │   ├── scripts/         # CSV import CLI (import_data.py)
│   │   ├── services/        # Pure reconciliation logic & CSV validation
│   │   └── main.py          # FastAPI application & error middleware
│   ├── tests/
│   │   ├── unit/            # Math, status, denial codes & import tests
│   │   ├── integration/     # Full HTTP API integration tests
│   │   └── conftest.py      # SQLite in-memory fixtures
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/             # Centralized typed API client
│   │   ├── components/      # KPI cards, status badges, tables, detail drawer
│   │   ├── types/           # TypeScript interfaces matching backend schemas
│   │   ├── utils/           # Currency and date formatters
│   │   ├── App.tsx          # Root dashboard view & state orchestration
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── data/
│   ├── claims.csv           # 12 synthetic claims
│   ├── remittances.csv      # 13 synthetic remittances
│   └── generate.py          # Deterministic CSV generator
├── docs/                    # Complete PRD, Architecture, Rules, Design, Tasks, Memory
├── docker-compose.yml       # MySQL 8.0 service definition
├── pytest.ini               # Test suite configuration
└── README.md
```

---

## 5. Quickstart Guide

### Prerequisites
* **Docker Desktop** (or native MySQL 8.0)
* **Python 3.11+**
* **Node.js 18+** & npm

### Step 1: Start MySQL Database
```bash
docker compose up -d
```
Verify the container is healthy:
```bash
docker ps
```

### Step 2: Set Up Backend
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database import script
python -m backend.app.scripts.import_data
```

### Step 3: Run Backend API Server
```bash
# From project root with .venv activated:
uvicorn backend.app.main:app --reload --port 8000
```
* Interactive API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
* Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Step 4: Run Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: [http://localhost:3000](http://localhost:3000)

---

## 6. Automated Testing

The project includes 25 automated unit and integration tests covering calculation formulas, duplicate handling, schema validation, HTTP error codes, and edge cases.

```bash
# Run full test suite from project root:
pytest
```

---

## 7. What I Would Build Next in Production (Forward Deployed Engineer Perspective)

1. **Chunked Streaming CSV Pipeline**:
   * For enterprise hospital networks generating multi-gigabyte 835/837 EDI or CSV files, stream processing using Python iterators or Celery/Temporal workers with idempotency keys prevents Out-Of-Memory (OOM) failures.
2. **Audit Logging & Event Sourcing**:
   * Store immutable reconciliation event ledgers so every payment allocation change has a cryptographic timestamp and user attribution.
3. **Automated Denial Appeal Assistant**:
   * For claims flagged with denial codes (`CO-16`, `CO-50`, `CO-197`), automatically generate appeal packets pre-populated with required clinical documentation and payer-specific guidelines.
4. **Distributed Observability**:
   * Add OpenTelemetry tracing and Prometheus metrics to monitor API latency, batch ingestion duration, and database connection pool saturation.

---

## 8. AI Tool Attribution

In accordance with the assignment instructions:
* AI assistance (Google DeepMind Antigravity) was used during this take-home to assist in drafting architectural specifications, structuring edge-case unit test fixtures, and accelerating frontend component styling. All business logic, database constraints, calculations, and code implementations were reviewed and verified for production correctness.
