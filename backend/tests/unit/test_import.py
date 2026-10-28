"""Unit tests for the CSV Import Service and data validation rules."""

import pytest
from pathlib import Path

from backend.app.db.models import Claim, Remittance
from backend.app.services.import_service import (
    CSVHeaderError,
    ImportService,
    parse_cents,
    parse_iso_date,
)


def test_parse_cents_validation():
    """Verify cents parsing rules."""
    assert parse_cents("15000", "billed_cents") == 15000
    assert parse_cents("0", "paid_cents") == 0
    assert parse_cents(" 500 ", "adjustment_cents") == 500

    # Fractional cents rejected
    with pytest.raises(ValueError, match="fractional cents not allowed"):
        parse_cents("150.50", "billed_cents")

    # Negative amounts rejected
    with pytest.raises(ValueError, match="cannot be negative"):
        parse_cents("-1000", "paid_cents")

    # Non-numeric rejected
    with pytest.raises(ValueError, match="valid integer"):
        parse_cents("abc", "paid_cents")

    # Empty rejected
    with pytest.raises(ValueError, match="cannot be empty"):
        parse_cents("", "paid_cents")


def test_parse_iso_date_validation():
    """Verify strict ISO date validation."""
    parsed = parse_iso_date("2026-09-02", "service_date")
    assert parsed.year == 2026
    assert parsed.month == 9
    assert parsed.day == 2

    with pytest.raises(ValueError, match="strict YYYY-MM-DD"):
        parse_iso_date("09/02/2026", "service_date")

    with pytest.raises(ValueError, match="strict YYYY-MM-DD"):
        parse_iso_date("2026-02-30", "service_date")


def test_import_sample_data(import_service: ImportService, claim_repo):
    """Import the actual synthetic dataset and verify all deterministic expected metrics."""
    data_dir = Path(__file__).resolve().parents[3] / "data"
    claims_path = data_dir / "claims.csv"
    remits_path = data_dir / "remittances.csv"

    report = import_service.import_all(claims_path, remits_path)

    assert report.claims.rows_seen == 12
    assert report.claims.inserted == 12
    assert report.claims.rejected == 0

    assert report.remittances.rows_seen == 13
    assert report.remittances.inserted == 13
    assert report.remittances.rejected == 0

    # Summary verification
    summary = claim_repo.get_summary()
    assert summary.total_claims == 12
    assert summary.balanced_claims == 5
    assert summary.unbalanced_claims == 6
    assert summary.claims_without_remittance == 1
    assert summary.total_billed_cents == 170000
    assert summary.matched_paid_cents == 99000
    assert summary.all_remittance_paid_cents == 104000
    assert summary.unmatched_remittance_count == 1
    assert summary.unmatched_remittance_paid_cents == 5000
    assert summary.claims_with_denial_history == 4
    assert summary.claims_flagged_for_review == 1


def test_idempotent_reimport(import_service: ImportService, claim_repo):
    """Running import twice must be a duplicate no-op and never change counts."""
    data_dir = Path(__file__).resolve().parents[3] / "data"
    claims_path = data_dir / "claims.csv"
    remits_path = data_dir / "remittances.csv"

    # First run
    import_service.import_all(claims_path, remits_path)

    # Second run
    report2 = import_service.import_all(claims_path, remits_path)
    assert report2.claims.inserted == 0
    assert report2.claims.duplicate_noop == 12

    assert report2.remittances.inserted == 0
    assert report2.remittances.duplicate_noop == 13

    # Totals remain identical
    summary = claim_repo.get_summary()
    assert summary.total_claims == 12
    assert summary.total_billed_cents == 170000


def test_conflicting_duplicate_id(import_service: ImportService, tmp_path: Path):
    """Importing a row with existing ID but differing data must be rejected as conflicting."""
    claims_file = tmp_path / "claims.csv"
    claims_file.write_text(
        "claim_id,patient_account,payer,service_date,cpt,billed_cents\n"
        "C9001,A9001,Payer One,2026-09-01,99213,10000\n",
        encoding="utf-8",
    )
    res1 = import_service.import_claims_csv(claims_file)
    assert res1.inserted == 1

    # Conflict file: same claim_id C9001 but billed_cents is 99999
    conflict_file = tmp_path / "claims_conflict.csv"
    conflict_file.write_text(
        "claim_id,patient_account,payer,service_date,cpt,billed_cents\n"
        "C9001,A9001,Payer One,2026-09-01,99213,99999\n",
        encoding="utf-8",
    )
    res2 = import_service.import_claims_csv(conflict_file)
    assert res2.inserted == 0
    assert res2.conflicting_existing_id == 1
    assert res2.rejected == 1
    assert res2.issues[0].code == "CONFLICTING_EXISTING_ID"


def test_missing_csv_headers(import_service: ImportService, tmp_path: Path):
    """Missing expected headers must fail the file before row processing."""
    bad_file = tmp_path / "bad_headers.csv"
    bad_file.write_text(
        "claim_id,payer,billed_cents\n"
        "C1,Payer,1000\n",
        encoding="utf-8",
    )
    with pytest.raises(CSVHeaderError, match="missing required header"):
        import_service.import_claims_csv(bad_file)


def test_partial_import_valid_rows_commit(import_service: ImportService, tmp_path: Path):
    """Valid rows in a batch should commit while invalid rows are rejected."""
    mixed_file = tmp_path / "mixed.csv"
    mixed_file.write_text(
        "claim_id,patient_account,payer,service_date,cpt,billed_cents\n"
        "C001,A001,Payer,2026-09-01,99213,10000\n"
        "C002,A002,Payer,2026-09-01,99213,INVALID_CENTS\n"
        "C003,A003,Payer,2026-09-01,99213,20000\n",
        encoding="utf-8",
    )
    result = import_service.import_claims_csv(mixed_file)
    assert result.rows_seen == 3
    assert result.inserted == 2
    assert result.rejected == 1
    assert result.issues[0].record_id == "C002"
