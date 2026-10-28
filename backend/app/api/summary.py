"""Summary endpoint for reconciliation overview KPIs."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.repositories.claim_repository import ClaimRepository
from backend.app.schemas.summary import ReconciliationSummary

router = APIRouter(prefix="/summary", tags=["Summary"])


@router.get("", response_model=ReconciliationSummary)
def get_summary(db: Session = Depends(get_db)) -> ReconciliationSummary:
    """Retrieve aggregate reconciliation metrics and review indicators."""
    repo = ClaimRepository(db)
    return repo.get_summary()
