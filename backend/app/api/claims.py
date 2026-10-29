"""Claims endpoints for listing, filtering, and detail inspection."""

from enum import Enum
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.repositories.claim_repository import ClaimRepository
from backend.app.schemas.claim import ClaimDetail, ClaimListResponse
from backend.app.schemas.errors import ErrorDetail, ErrorResponse

router = APIRouter(prefix="/claims", tags=["Claims"])


class ClaimStatusFilter(str, Enum):
    BALANCED = "balanced"
    UNBALANCED = "unbalanced"
    NO_REMITTANCE = "no_remittance"


class ClaimFlagFilter(str, Enum):
    DENIAL_HISTORY = "denial_history"
    PAYMENT_EXCEEDS_BILLED = "payment_exceeds_billed"
    PAYER_MISMATCH = "payer_mismatch"


@router.get("", response_model=ClaimListResponse)
def list_claims(
    payer: Optional[str] = Query(default=None, description="Exact payer name filter"),
    status_filter: Optional[ClaimStatusFilter] = Query(
        default=None,
        alias="status",
        description="Filter by reconciliation status",
    ),
    flag_filter: Optional[ClaimFlagFilter] = Query(
        default=None,
        alias="flag",
        description="Filter by operational flag",
    ),
    claim_id: Optional[str] = Query(default=None, description="Search term for claim ID or patient account"),
    page: int = Query(default=1, ge=1, description="Page number, 1-indexed"),
    page_size: int = Query(default=10, ge=1, le=100, description="Items per page (max 100)"),
    db: Session = Depends(get_db),
) -> ClaimListResponse:
    """Retrieve paginated claims with calculated reconciliation totals and flags."""
    repo = ClaimRepository(db)
    status_str = status_filter.value if status_filter else None
    flag_str = flag_filter.value if flag_filter else None
    items, total = repo.get_claims_paginated(
        payer=payer,
        status=status_str,
        claim_id=claim_id,
        flag=flag_str,
        page=page,
        page_size=page_size,
    )
    return ClaimListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/export", response_class=Response)
def export_claims(
    export_format: str = Query(default="csv", alias="format", description="Export format: 'csv' or 'json'"),
    db: Session = Depends(get_db),
):
    """Export complete reconciliation audit ledger in requested format (CSV or JSON)."""
    repo = ClaimRepository(db)
    clean_format = export_format.strip().lower()

    if clean_format == "json":
        json_data = repo.export_reconciliation_json()
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=reconciliation_audit_ledger.json"},
        )

    # Default to CSV
    csv_data = repo.export_reconciliation_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reconciliation_audit_ledger.csv"},
    )


@router.get(
    "/{claim_id}",
    response_model=ClaimDetail,
    responses={
        404: {
            "model": ErrorResponse,
            "description": "Claim not found",
        }
    },
)
def get_claim(claim_id: str, db: Session = Depends(get_db)) -> ClaimDetail:
    """Retrieve complete claim details and remittance history in date order."""
    repo = ClaimRepository(db)
    claim = repo.get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "CLAIM_NOT_FOUND",
                "message": f"No claim exists with ID {claim_id}",
            },
        )
    return claim
