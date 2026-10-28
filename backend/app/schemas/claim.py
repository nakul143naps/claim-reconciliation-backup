"""Pydantic schemas for Claim resources and reconciliation details."""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class RemittanceDetail(BaseModel):
    """Matched remittance advice record in claim history."""

    remit_id: str
    paid_cents: int
    adjustment_cents: int
    patient_responsibility_cents: int
    reason_code: Optional[str] = None
    posted_date: date


class ClaimTotals(BaseModel):
    """Financial aggregation totals for a claim."""

    paid_cents: int = Field(description="Sum of paid_cents from matched remittances")
    adjustment_cents: int = Field(description="Sum of adjustment_cents from matched remittances")
    patient_responsibility_cents: int = Field(
        description="Sum of patient_responsibility_cents from matched remittances"
    )
    difference_cents: Optional[int] = Field(
        default=None,
        description="billed_cents - paid - adjustment - patient_responsibility; null for no_remittance",
    )


class ClaimListItem(BaseModel):
    """Claim representation in paginated claims list."""

    claim_id: str
    payer: str
    billed_cents: int
    paid_cents: int
    adjustment_cents: int
    patient_responsibility_cents: int
    difference_cents: Optional[int] = None
    status: str = Field(description="'balanced', 'unbalanced', or 'no_remittance'")
    flags: List[str] = Field(default_factory=list)


class ClaimDetail(BaseModel):
    """Detailed claim view including complete remittance history."""

    claim_id: str
    patient_account: str
    payer: str
    service_date: date
    cpt: str
    billed_cents: int
    totals: ClaimTotals
    status: str
    flags: List[str]
    denial_history: bool
    remittances: List[RemittanceDetail]


class ClaimListResponse(BaseModel):
    """Paginated response for claims list."""

    items: List[ClaimListItem]
    total: int
    page: int
    page_size: int
