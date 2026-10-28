"""Pydantic schemas for unmatched remittances."""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class UnmatchedRemittanceItem(BaseModel):
    """An orphaned remittance record that could not be linked to any existing claim."""

    remit_id: str
    source_claim_id: str = Field(description="Original unverified claim reference from payer")
    payer: str
    paid_cents: int
    adjustment_cents: int
    patient_responsibility_cents: int
    reason_code: Optional[str] = None
    posted_date: date
    issue: str = Field(default="claim_not_found")


class UnmatchedRemittancesResponse(BaseModel):
    """Response containing list of unmatched remittances."""

    items: List[UnmatchedRemittanceItem]
    total: int
