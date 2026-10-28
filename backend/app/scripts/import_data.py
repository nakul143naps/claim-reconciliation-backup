"""CLI command to import claims and remittances CSV files into MySQL."""

import argparse
import sys
from pathlib import Path

# Add project root to sys.path so imports work seamlessly
CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.db.session import SessionLocal, init_db
from backend.app.services.import_service import (
    CSVHeaderError,
    FileImportResult,
    ImportService,
)


def print_file_report(result: FileImportResult) -> None:
    """Print formatted summary table and issues for a file import."""
    print(f"\n--- Import Report: {result.filename} ---")
    print(f"  Rows seen:                 {result.rows_seen}")
    print(f"  Inserted:                  {result.inserted}")
    print(f"  Duplicate (no-op):         {result.duplicate_noop}")
    print(f"  Rejected:                  {result.rejected}")
    print(f"  Conflicting existing ID:   {result.conflicting_existing_id}")

    if result.issues:
        print("\n  Row Issues Encountered:")
        for issue in result.issues:
            rec_id = f" [ID: {issue.record_id}]" if issue.record_id else ""
            print(f"    - Row {issue.row_number}{rec_id} [{issue.code}]: {issue.message}")


def main() -> int:
    """Main CLI entrypoint."""
    parser = argparse.ArgumentParser(description="Import synthetic claims and remittances CSV data.")
    parser.add_argument(
        "--claims",
        type=str,
        default=str(PROJECT_ROOT / "data" / "claims.csv"),
        help="Path to claims CSV file",
    )
    parser.add_argument(
        "--remittances",
        type=str,
        default=str(PROJECT_ROOT / "data" / "remittances.csv"),
        help="Path to remittances CSV file",
    )
    args = parser.parse_args()

    claims_path = Path(args.claims)
    remittances_path = Path(args.remittances)

    print(f"Initializing database schema if not present...")
    init_db()

    print(f"Processing claims:     {claims_path}")
    print(f"Processing remittances: {remittances_path}")

    db = SessionLocal()
    try:
        service = ImportService(db)
        claims_result = service.import_claims_csv(claims_path)
        print_file_report(claims_result)

        remits_result = service.import_remittances_csv(remittances_path)
        print_file_report(remits_result)

        print("\n=== Import Completed Successfully ===")
        return 0

    except (CSVHeaderError, FileNotFoundError) as e:
        print(f"\n[FATAL ERROR] Structural/file error during import: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"\n[FATAL ERROR] Unexpected exception during import: {e}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
