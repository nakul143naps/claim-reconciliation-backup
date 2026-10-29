"""Pydantic schema for the dashboard reconciliation summary KPIs."""

from pydantic import BaseModel, Field


class ReconciliationSummary(BaseModel):
    """Aggregate financial metrics and operational counts."""

    total_claims: int = Field(description="Total count of claims")
    balanced_claims: int = Field(description="Claims with matched remittances and difference == 0")
    unbalanced_claims: int = Field(description="Claims with matched remittances and difference != 0")
    claims_without_remittance: int = Field(description="Claims with no matched remittances")
    total_billed_cents: int = Field(description="Sum of billed_cents across all claims")
    matched_paid_cents: int = Field(description="Sum of paid_cents from matched remittances")
    all_remittance_paid_cents: int = Field(description="Sum of paid_cents across every remittance (matched + unmatched)")
    unmatched_remittance_count: int = Field(description="Number of remittances unlinked to any claim")
    unmatched_remittance_paid_cents: int = Field(description="Total paid amount in unmatched remittances")
    claims_with_denial_history: int = Field(description="Claims with at least one historical denial reason code")
    claims_flagged_for_review: int = Field(
        description="Claims with review anomalies (payment exceeds billed or payer mismatch)"
    )
    uncollected_cash_cents: int = Field(
        default=0,
        description="Gross billed amount not yet received as cash (total_billed_cents - matched_paid_cents)",
    )
    net_unsettled_cents: int = Field(
        default=0,
        description="Net outstanding unresolved variance after adjustments and patient responsibility",
    )
    total_adjustment_cents: int = Field(
        default=0,
        description="Total contractual adjustments write-offs across matched remittances",
    )
    total_patient_responsibility_cents: int = Field(
        default=0,
        description="Total patient copays and deductibles across matched remittances",
    )
