"""Remittances endpoints for inspecting unmatched remittances."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.repositories.claim_repository import ClaimRepository
from backend.app.schemas.remittance import UnmatchedRemittancesResponse

router = APIRouter(prefix="/remittances", tags=["Remittances"])


@router.get("/unmatched", response_model=UnmatchedRemittancesResponse)
def get_unmatched_remittances(db: Session = Depends(get_db)) -> UnmatchedRemittancesResponse:
    """Retrieve remittances referencing missing claims, preserved without fake claims."""
    repo = ClaimRepository(db)
    items = repo.get_unmatched_remittances()
    return UnmatchedRemittancesResponse(items=items, total=len(items))
