"""Endpoints for uploading CSV batches, resetting benchmark data, and downloading sample templates."""

import io
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.errors import ErrorResponse
from backend.app.schemas.import_report import FileImportResult, FullImportReport
from backend.app.services.import_service import CSVHeaderError, ImportService

router = APIRouter(prefix="/import", tags=["Import & Ingestion"])

SAMPLE_CLAIMS_TEMPLATE = (
    "claim_id,patient_account,payer,service_date,cpt,billed_cents\n"
    "C2001,A2001,Northwind Health,2026-10-01,99213,15000\n"
    "C2002,A2002,Cedar Mutual,2026-10-02,99214,22000\n"
)

SAMPLE_REMITTANCES_TEMPLATE = (
    "remit_id,claim_id,payer,paid_cents,adjustment_cents,patient_responsibility_cents,reason_code,posted_date\n"
    "R2001,C2001,Northwind Health,12000,3000,0,CO-45,2026-10-05\n"
    "R2002,C2002,Cedar Mutual,18000,0,4000,PR-3,2026-10-06\n"
)


@router.post("/claims", response_model=FileImportResult)
async def upload_claims_csv(
    file: UploadFile = File(..., description="CSV file containing claims records"),
    db: Session = Depends(get_db),
) -> FileImportResult:
    """Upload and process a batch claims CSV file with strict validation and idempotency."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FILE_TYPE", "message": "Only .csv files are supported"},
        )

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ENCODING_ERROR", "message": "File must be valid UTF-8 encoded CSV"},
        )

    service = ImportService(db)
    try:
        result = service.import_claims_content(content_str, filename=file.filename)
        return result
    except CSVHeaderError as che:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_CSV_HEADERS", "message": str(che)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "IMPORT_FAILED", "message": f"Failed to import claims file: {e}"},
        )


@router.post("/remittances", response_model=FileImportResult)
async def upload_remittances_csv(
    file: UploadFile = File(..., description="CSV file containing remittances records"),
    db: Session = Depends(get_db),
) -> FileImportResult:
    """Upload and process a batch remittances CSV file with strict validation and orphan quarantine."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FILE_TYPE", "message": "Only .csv files are supported"},
        )

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ENCODING_ERROR", "message": "File must be valid UTF-8 encoded CSV"},
        )

    service = ImportService(db)
    try:
        result = service.import_remittances_content(content_str, filename=file.filename)
        return result
    except CSVHeaderError as che:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_CSV_HEADERS", "message": str(che)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "IMPORT_FAILED", "message": f"Failed to import remittances file: {e}"},
        )


@router.post("/reset", response_model=FullImportReport)
def reset_to_benchmark(db: Session = Depends(get_db)) -> FullImportReport:
    """Wipe database and reload the canonical 12 claims and 13 remittances benchmark dataset."""
    service = ImportService(db)
    try:
        report = service.reset_benchmark_data()
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "RESET_FAILED", "message": f"Failed to reset benchmark data: {e}"},
        )


@router.get("/templates/{file_type}", response_class=Response)
def download_csv_template(file_type: str):
    """Download a valid sample CSV template for claims or remittances."""
    clean_type = file_type.strip().lower()
    if clean_type == "claims":
        return Response(
            content=SAMPLE_CLAIMS_TEMPLATE,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=claims_template.csv"},
        )
    elif clean_type in ["remittances", "remits"]:
        return Response(
            content=SAMPLE_REMITTANCES_TEMPLATE,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=remittances_template.csv"},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TEMPLATE_NOT_FOUND", "message": f"Unknown template type '{file_type}'. Use 'claims' or 'remittances'."},
        )
