"""Claims endpoints for listing, filtering, and detail inspection."""

from enum import Enum
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
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


@router.get("", response_model=ClaimListResponse)
def list_claims(
    payer: Optional[str] = Query(default=None, description="Exact payer name filter"),
    status_filter: Optional[ClaimStatusFilter] = Query(
        default=None,
        alias="status",
        description="Filter by reconciliation status",
    ),
    claim_id: Optional[str] = Query(default=None, description="Exact claim ID filter"),
    page: int = Query(default=1, ge=1, description="Page number, 1-indexed"),
    page_size: int = Query(default=10, ge=1, le=100, description="Items per page (max 100)"),
    db: Session = Depends(get_db),
) -> ClaimListResponse:
    """Retrieve paginated claims with calculated reconciliation totals and flags."""
    repo = ClaimRepository(db)
    status_str = status_filter.value if status_filter else None
    items, total = repo.get_claims_paginated(
        payer=payer,
        status=status_str,
        claim_id=claim_id,
        page=page,
        page_size=page_size,
    )
    return ClaimListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
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
