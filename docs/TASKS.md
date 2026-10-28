# Implementation Plan and Task Board
## Claim Reconciliation — v1

Target: 2–3 focused days before the November 2, 2026 submission deadline. The assignment README itself suggests roughly four hours, so keep scope disciplined: correctness, tests, clear UI, and documentation before optional polish.

## Working rules for Antigravity CLI / coding agent

1. Read `docs/PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `DESIGN.md`, and `MEMORY.md` before changing files.
2. Do not begin coding if the owner has not approved the design.
3. Implement one task at a time. Before editing, state intended files and acceptance criteria.
4. Inspect the existing repository first; do not overwrite existing code or data without understanding it.
5. Never invent assignment requirements. If source data conflicts with docs, stop and report the conflict.
6. Do not alter source CSV data to make tests pass.
7. Run targeted tests after each task and the full test suite at milestones.
8. Do not claim tests passed unless they were actually run and output inspected.
9. Do not suppress test failures, use `pass` placeholders, or weaken assertions to force a green result.
10. Keep dependencies minimal and pin or lock versions where practical.
11. Never commit secrets, `.env`, real patient data, database dumps, or credentials.
12. Preserve all business rules; if a change seems necessary, propose it and wait for approval.
13. If uncertain about an API/schema decision, ask rather than silently choosing a different contract.
14. At each milestone, update `MEMORY.md` with completed tasks, files changed, tests run, current issues, and next exact task.
15. Use AI assistance transparently and add an appropriate attribution note to the final README, per assignment instructions.

## Day 0 — Repository and design audit (before coding)

- [ ] Inspect repository root, current files, Git status, README, data, and environment.
- [ ] Confirm source CSV headers exactly match `RULES.md`.
- [ ] Confirm whether starter code or migrations already exist.
- [ ] Confirm installed Python, Node, and MySQL versions.
- [ ] Confirm design approval from owner.
- [ ] Record any mismatch in `MEMORY.md`; do not make destructive changes.
- Acceptance: repository map and any source/design discrepancies documented.

## Day 1 — Backend foundation, import, and reconciliation

### Task 1: Project setup
- [ ] Create or adapt backend structure in `ARCHITECTURE.md`.
- [ ] Add configuration through environment variables and `.env.example`.
- [ ] Add `.gitignore` for `.env`, virtualenv, `node_modules`, caches, build output, and local DB artifacts.
- [ ] Add reproducible dependency/install instructions.
- Acceptance: app imports cleanly; secrets are not hardcoded.

### Task 2: Database schema
- [ ] Implement `claims` and `remittances` tables with primary/foreign keys and indexes.
- [ ] Preserve `source_claim_id` and nullable FK `claim_id`.
- [ ] Add schema creation/migration instructions.
- [ ] Validate nonnegative cents.
- Acceptance: schema creates cleanly on a fresh database; unmatched source references are representable.

### Task 3: Import and validation
- [ ] Parse expected CSV headers and strict ISO dates.
- [ ] Validate required strings, IDs, integer cents, nonnegative amounts, and unique IDs.
- [ ] Load claims before remittances.
- [ ] Implement duplicate no-op vs conflicting existing ID behavior.
- [ ] Continue after row-level invalid records.
- [ ] Preserve unmatched remittances.
- [ ] Produce row-level and aggregate import report.
- [ ] Verify rerunning the exact source files does not change row counts or financial totals.
- Acceptance: sample imports to 12 claims/13 remittances; R1012 stays unmatched; rerun is safe.

### Task 4: Reconciliation service
- [ ] Implement calculation as a pure/testable service.
- [ ] Aggregate every matched remittance.
- [ ] Derive status from existence of remittances and difference.
- [ ] Derive denial history and review flags independently.
- [ ] Keep `difference_cents` null for no-remittance claims.
- Acceptance: every sample claim matches `RULES.md` expected results.

### Task 5: Backend tests
- [ ] Unit tests for exact calculation, zero difference, positive/negative difference, no remittance, multiple remittances, denial history, and flags.
- [ ] Import tests for duplicate IDs, conflicting IDs, malformed CSV, missing headers, invalid dates, missing/noninteger/fractional/negative amounts, payer mismatch, and unmatched references.
- [ ] Verify idempotent repeat import.
- Acceptance: targeted tests pass; no test depends on a developer-specific path.

## Day 2 — API and frontend

### Task 6: API endpoints
- [ ] `GET /api/health`
- [ ] `GET /api/summary`
- [ ] `GET /api/claims` filters + pagination
- [ ] `GET /api/claims/{claim_id}`
- [ ] `GET /api/remittances/unmatched`
- [ ] Add consistent error schema and validation.
- [ ] Ensure no N+1 queries for claims list/detail.
- Acceptance: API integration tests verify response schemas, totals, filters, pagination, 404, 422, and database error behavior.

### Task 7: React app foundation
- [ ] Set up frontend and central API client.
- [ ] Define TypeScript types matching backend response schemas (if TypeScript is selected).
- [ ] Configure API base URL through a public frontend environment variable.
- [ ] Add loading/error/empty states.
- Acceptance: frontend starts and can reach backend without hardcoded machine-specific URLs.

### Task 8: Dashboard and claims list
- [ ] Dashboard cards for status counts and financial metrics.
- [ ] Claims table with payer/status/claim ID filters and pagination.
- [ ] Format cents to rupees.
- [ ] Make statuses and warnings readable without relying only on color.
- Acceptance: dashboard values match `/api/summary`; filters and pagination work.

### Task 9: Claim detail and unmatched view
- [ ] Claim detail with totals, status, flags, denial history, and complete remittance history.
- [ ] Unmatched remittances table showing original claim reference.
- [ ] Handle 404, empty history, loading, and retry states.
- Acceptance: C1007 shows earlier CO-197 while balanced; C1005 explains no remittance; R1012 shows C9999.

## Day 3 — Verification, UX, and submission

### Task 10: End-to-end verification
- [ ] Run all backend tests.
- [ ] Run frontend lint/typecheck/build if configured.
- [ ] Run application against a fresh database using documented steps.
- [ ] Import sample data and compare dashboard values with `RULES.md`.
- [ ] Manually inspect each required page and all warning/empty/error states.
- [ ] Test a repeat import.
- Acceptance: results are reproducible from clean setup.

### Task 11: Documentation and repository quality
- [ ] Root README includes project purpose, architecture, prerequisites, setup, environment, database setup, import command, run commands, test commands, API summary, assumptions, limitations, screenshots if useful, and AI attribution.
- [ ] Ensure `.env` and secrets are not tracked.
- [ ] Remove unused dependencies, dead code, debug prints, and accidental generated files.
- [ ] Review Git diff before commit.
- [ ] Provide a concise “what I'd do next” section consistent with assignment.
- Acceptance: another developer can clone, configure, import, run, and test without guessing.

## Prioritized testing matrix

P0 (must pass):
- Sample dataset import.
- Per-claim calculation/status.
- C1005 no-remittance null difference.
- C1007 multiple remittances + historical denial.
- C1006 negative difference + review flag.
- R1012 unmatched preservation.
- Summary totals.
- Duplicate/idempotency behavior.
- API filters, pagination, 404, 422.
- Secrets not committed.

P1 (strongly recommended):
- Payer mismatch.
- Invalid/missing/fractional/negative amount.
- Invalid date, missing header, unreadable file.
- DB unavailable behavior.
- Empty frontend results and API failure.
- Stable ordering.

P2 (only if time remains):
- Responsive polish.
- Better accessibility review.
- More granular import report output.
- Deployment.
- Optional screenshot/demo GIF.

## Predicted issues and prevention

| Risk | Prevention / expected handling |
|---|---|
| Amounts accidentally treated as rupees | Keep cents integer in API/DB; convert only for display. |
| Floating-point errors | Avoid float money calculations. |
| C1005 falsely shown as 6000 outstanding | Null difference and explicit no-remittance status. |
| Only latest remittance used | Aggregate all rows and test C1007. |
| C1007 incorrectly labelled denied status | Denial history is separate from status. |
| R1012 lost due to FK | Separate source ID from nullable validated FK. |
| Unmatched payment contaminates claim totals | Separate matched and all-remittance totals. |
| Duplicate import double-counts payments | Unique keys; exact repeat no-op; conflict report; test rerun. |
| Invalid row aborts all rows | Continue for row-level errors; fail file-level header errors early. |
| Existing ID overwritten | Never update existing IDs during import. |
| Payer mismatch hidden | Add flag and visible UI warning; keep both payer values. |
| Negative reversal silently changes totals | Reject and report; reversals explicitly deferred. |
| API returns wrong pagination count | Count after filters, before limit/offset. |
| Unstable ordering makes tests flaky | Stable sort by claim ID; history by posted date and remit ID. |
| N+1 queries slow UI | Use joins/aggregation or batched queries. |
| Database config leaks | `.env`, `.env.example`, `.gitignore`, review Git diff. |
| CORS blocks frontend | Configure only required local frontend origins. |
| Test passes by weakening assertions | Keep expected values in `RULES.md`; never suppress failures. |
| Agent overwrites starter repo | Inspect Git status and files first; small changes; no destructive commands without approval. |
| Missing dependency/version mismatch | Document versions, lock dependencies where practical, test clean setup. |
| False claim that verification succeeded | Record actual commands and outputs in `MEMORY.md`. |

## Definition of done

The project is ready for submission when:
- All P0 tests pass and P1 issues are either addressed or documented.
- Clean setup instructions work.
- Sample totals/statuses match `RULES.md`.
- UI exposes the required views and warnings.
- No secrets or real patient data are committed.
- Known limitations and AI use are documented.
- GitHub repository is readable and complete.
