"""CSV Import Service for claims and remittances.

Implements strict validation, idempotent duplicate detection, row-level error reporting,
and atomic row processing per business rules defined in RULES.md.
"""

import csv
import io
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Union
from sqlalchemy.orm import Session

from backend.app.db.models import Claim, Remittance
from backend.app.schemas.import_report import FileImportResult, FullImportReport, RowIssue

EXPECTED_CLAIM_HEADERS = {
    "claim_id",
    "patient_account",
    "payer",
    "service_date",
    "cpt",
    "billed_cents",
}

EXPECTED_REMITTANCE_HEADERS = {
    "remit_id",
    "claim_id",
    "payer",
    "paid_cents",
    "adjustment_cents",
    "patient_responsibility_cents",
    "reason_code",
    "posted_date",
}


class CSVHeaderError(Exception):
    """Raised when CSV headers are missing required columns."""
    pass


def parse_iso_date(value: str, field_name: str) -> date:
    """Parse strict ISO YYYY-MM-DD date."""
    trimmed = value.strip()
    if not trimmed:
        raise ValueError(f"{field_name} date is required and cannot be empty")
    try:
        dt = datetime.strptime(trimmed, "%Y-%m-%d")
        return dt.date()
    except ValueError:
        raise ValueError(f"{field_name} must be a valid date in strict YYYY-MM-DD format (got '{value}')")


def parse_cents(value: str, field_name: str) -> int:
    """Parse and validate nonnegative integer cents."""
    trimmed = value.strip()
    if not trimmed:
        raise ValueError(f"{field_name} is required and cannot be empty")
    
    # Check for decimal points (fractional amounts)
    if "." in trimmed:
        raise ValueError(f"{field_name} must be integer cents, fractional cents not allowed (got '{value}')")
    
    try:
        cents = int(trimmed)
    except ValueError:
        raise ValueError(f"{field_name} must be a valid integer representing cents (got '{value}')")

    if cents < 0:
        raise ValueError(f"{field_name} cannot be negative; reversals deferred in v1 (got '{value}')")

    return cents


def parse_clean_string(value: str, field_name: str, allow_empty: bool = False) -> Optional[str]:
    """Trim string and enforce presence unless empty allowed."""
    trimmed = value.strip()
    if not trimmed:
        if allow_empty:
            return None
        raise ValueError(f"{field_name} is required and cannot be empty")
    return trimmed


class ImportService:
    """Orchestrates CSV parsing and database persistence."""

    def __init__(self, db: Session):
        self.db = db

    def import_claims_csv(self, file_path: Union[str, Path]) -> FileImportResult:
        """Import claims from a CSV file."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Claims CSV file not found: {path}")

        with path.open("r", encoding="utf-8-sig") as handle:
            return self._import_claims_from_handle(handle, filename=path.name)

    def import_claims_content(self, content: str, filename: str = "uploaded_claims.csv") -> FileImportResult:
        """Import claims from in-memory CSV text content."""
        handle = io.StringIO(content)
        return self._import_claims_from_handle(handle, filename=filename)

    def _import_claims_from_handle(self, handle, filename: str) -> FileImportResult:
        """Internal worker to parse claims rows from any readable file/string handle."""
        result = FileImportResult(filename=filename)
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise CSVHeaderError("Claims CSV file is empty or missing header row")

        found_headers = {h.strip() for h in reader.fieldnames if h}
        missing = EXPECTED_CLAIM_HEADERS - found_headers
        if missing:
            raise CSVHeaderError(f"Claims CSV missing required header(s): {', '.join(sorted(missing))}")

        seen_in_batch: Dict[str, Claim] = {}

        for row_idx, row in enumerate(reader, start=2):  # row 1 is header
            result.rows_seen += 1
            claim_id_raw = row.get("claim_id", "").strip()

            try:
                # Validate all fields
                claim_id = parse_clean_string(claim_id_raw, "claim_id")
                patient_account = parse_clean_string(row.get("patient_account", ""), "patient_account")
                payer = parse_clean_string(row.get("payer", ""), "payer")
                service_date = parse_iso_date(row.get("service_date", ""), "service_date")
                cpt = parse_clean_string(row.get("cpt", ""), "cpt")
                billed_cents = parse_cents(row.get("billed_cents", ""), "billed_cents")

                candidate = Claim(
                    claim_id=claim_id,
                    patient_account=patient_account,
                    payer=payer,
                    service_date=service_date,
                    cpt=cpt,
                    billed_cents=billed_cents,
                )

                # Check within this batch first
                if claim_id in seen_in_batch:
                    prev = seen_in_batch[claim_id]
                    if self._is_identical_claim(prev, candidate):
                        result.duplicate_noop += 1
                        continue
                    else:
                        result.rejected += 1
                        result.conflicting_existing_id += 1
                        result.issues.append(
                            RowIssue(
                                row_number=row_idx,
                                record_id=claim_id,
                                code="CONFLICTING_DUPLICATE_ID",
                                message=f"Claim ID '{claim_id}' repeats in file with conflicting data",
                            )
                        )
                        continue

                # Check in database
                existing = self.db.query(Claim).filter(Claim.claim_id == claim_id).first()
                if existing:
                    if self._is_identical_claim(existing, candidate):
                        result.duplicate_noop += 1
                        seen_in_batch[claim_id] = existing
                        continue
                    else:
                        result.rejected += 1
                        result.conflicting_existing_id += 1
                        result.issues.append(
                            RowIssue(
                                row_number=row_idx,
                                record_id=claim_id,
                                code="CONFLICTING_EXISTING_ID",
                                message=f"Claim ID '{claim_id}' already exists in database with different data",
                            )
                        )
                        continue

                # Atomic insert per row
                with self.db.begin_nested():
                    self.db.add(candidate)
                    self.db.flush()

                seen_in_batch[claim_id] = candidate
                result.inserted += 1

            except ValueError as ve:
                result.rejected += 1
                result.issues.append(
                    RowIssue(
                        row_number=row_idx,
                        record_id=claim_id_raw or None,
                        code="VALIDATION_ERROR",
                        message=str(ve),
                    )
                )
            except Exception as e:
                result.rejected += 1
                result.issues.append(
                    RowIssue(
                        row_number=row_idx,
                        record_id=claim_id_raw or None,
                        code="DATABASE_ERROR",
                        message=f"Unexpected error processing row: {e}",
                    )
                )

        self.db.commit()
        return result

    def import_remittances_csv(self, file_path: Union[str, Path]) -> FileImportResult:
        """Import remittances from a CSV file."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Remittances CSV file not found: {path}")

        with path.open("r", encoding="utf-8-sig") as handle:
            return self._import_remittances_from_handle(handle, filename=path.name)

    def import_remittances_content(self, content: str, filename: str = "uploaded_remittances.csv") -> FileImportResult:
        """Import remittances from in-memory CSV text content."""
        handle = io.StringIO(content)
        return self._import_remittances_from_handle(handle, filename=filename)

    def _import_remittances_from_handle(self, handle, filename: str) -> FileImportResult:
        """Internal worker to parse remittances rows from any readable file/string handle."""
        result = FileImportResult(filename=filename)
        known_claim_ids: Set[str] = {c.claim_id for c in self.db.query(Claim.claim_id).all()}

        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise CSVHeaderError("Remittances CSV file is empty or missing header row")

        found_headers = {h.strip() for h in reader.fieldnames if h}
        missing = EXPECTED_REMITTANCE_HEADERS - found_headers
        if missing:
            raise CSVHeaderError(f"Remittances CSV missing required header(s): {', '.join(sorted(missing))}")

        seen_in_batch: Dict[str, Remittance] = {}

        for row_idx, row in enumerate(reader, start=2):
            result.rows_seen += 1
            remit_id_raw = row.get("remit_id", "").strip()

            try:
                remit_id = parse_clean_string(remit_id_raw, "remit_id")
                source_claim_id = parse_clean_string(row.get("claim_id", ""), "claim_id")
                payer = parse_clean_string(row.get("payer", ""), "payer")
                paid_cents = parse_cents(row.get("paid_cents", ""), "paid_cents")
                adjustment_cents = parse_cents(row.get("adjustment_cents", ""), "adjustment_cents")
                patient_responsibility_cents = parse_cents(
                    row.get("patient_responsibility_cents", ""),
                    "patient_responsibility_cents",
                )
                reason_code = parse_clean_string(
                    row.get("reason_code", ""),
                    "reason_code",
                    allow_empty=True,
                )
                posted_date = parse_iso_date(row.get("posted_date", ""), "posted_date")

                # If claim exists, link claim_id; otherwise set null to preserve unmatched
                linked_claim_id = source_claim_id if source_claim_id in known_claim_ids else None

                candidate = Remittance(
                    remit_id=remit_id,
                    source_claim_id=source_claim_id,
                    claim_id=linked_claim_id,
                    payer=payer,
                    paid_cents=paid_cents,
                    adjustment_cents=adjustment_cents,
                    patient_responsibility_cents=patient_responsibility_cents,
                    reason_code=reason_code,
                    posted_date=posted_date,
                )

                # Check within batch
                if remit_id in seen_in_batch:
                    prev = seen_in_batch[remit_id]
                    if self._is_identical_remittance(prev, candidate):
                        result.duplicate_noop += 1
                        continue
                    else:
                        result.rejected += 1
                        result.conflicting_existing_id += 1
                        result.issues.append(
                            RowIssue(
                                row_number=row_idx,
                                record_id=remit_id,
                                code="CONFLICTING_DUPLICATE_ID",
                                message=f"Remittance ID '{remit_id}' repeats in file with conflicting data",
                            )
                        )
                        continue

                # Check in DB
                existing = self.db.query(Remittance).filter(Remittance.remit_id == remit_id).first()
                if existing:
                    if self._is_identical_remittance(existing, candidate):
                        result.duplicate_noop += 1
                        seen_in_batch[remit_id] = existing
                        continue
                    else:
                        result.rejected += 1
                        result.conflicting_existing_id += 1
                        result.issues.append(
                            RowIssue(
                                row_number=row_idx,
                                record_id=remit_id,
                                code="CONFLICTING_EXISTING_ID",
                                message=f"Remittance ID '{remit_id}' already exists in database with different data",
                            )
                        )
                        continue

                with self.db.begin_nested():
                    self.db.add(candidate)
                    self.db.flush()

                seen_in_batch[remit_id] = candidate
                result.inserted += 1

            except ValueError as ve:
                result.rejected += 1
                result.issues.append(
                    RowIssue(
                        row_number=row_idx,
                        record_id=remit_id_raw or None,
                        code="VALIDATION_ERROR",
                        message=str(ve),
                    )
                )
            except Exception as e:
                result.rejected += 1
                result.issues.append(
                    RowIssue(
                        row_number=row_idx,
                        record_id=remit_id_raw or None,
                        code="DATABASE_ERROR",
                        message=f"Unexpected error processing row: {e}",
                    )
                )

        self.db.commit()
        return result

    def import_all(
        self,
        claims_path: Union[str, Path],
        remittances_path: Union[str, Path],
    ) -> FullImportReport:
        """Run complete import pipeline: claims first, then remittances."""
        claims_result = self.import_claims_csv(claims_path)
        remittances_result = self.import_remittances_csv(remittances_path)
        return FullImportReport(
            claims=claims_result,
            remittances=remittances_result,
            success=True,
        )

    def reset_benchmark_data(self) -> FullImportReport:
        """Wipe database and cleanly reload canonical 12 claims and 13 remittances benchmark."""
        # Delete remittances first to honor foreign key constraints
        self.db.query(Remittance).delete()
        self.db.query(Claim).delete()
        self.db.commit()

        project_root = Path(__file__).resolve().parents[3]
        claims_file = project_root / "data" / "claims.csv"
        remits_file = project_root / "data" / "remittances.csv"

        claims_res = self.import_claims_csv(claims_file)
        remits_res = self.import_remittances_csv(remits_file)

        return FullImportReport(
            claims=claims_res,
            remittances=remits_res,
            success=True,
        )

    @staticmethod
    def _is_identical_claim(a: Claim, b: Claim) -> bool:
        return (
            a.claim_id == b.claim_id
            and a.patient_account == b.patient_account
            and a.payer == b.payer
            and a.service_date == b.service_date
            and a.cpt == b.cpt
            and a.billed_cents == b.billed_cents
        )

    @staticmethod
    def _is_identical_remittance(a: Remittance, b: Remittance) -> bool:
        return (
            a.remit_id == b.remit_id
            and a.source_claim_id == b.source_claim_id
            and a.payer == b.payer
            and a.paid_cents == b.paid_cents
            and a.adjustment_cents == b.adjustment_cents
            and a.patient_responsibility_cents == b.patient_responsibility_cents
            and a.reason_code == b.reason_code
            and a.posted_date == b.posted_date
        )
