"""Reconciliation business logic service.

Pure, deterministic calculations for claim status, financial differences,
denial history, and review flags adhering strictly to RULES.md.
"""

from typing import List, Optional, Set, Tuple
from backend.app.db.models import Claim, Remittance
from backend.app.schemas.claim import ClaimTotals

# Explicit denial codes defined in assignment specifications
ASSIGNMENT_DENIAL_CODES: Set[str] = {"CO-16", "CO-50", "CO-197"}


def normalize_code(code: Optional[str]) -> Optional[str]:
    """Normalize reason code for exact comparison."""
    if not code:
        return None
    trimmed = code.strip().upper()
    return trimmed or None


def calculate_claim_reconciliation(
    billed_cents: int,
    matched_remittances: List[Remittance],
    claim_payer: Optional[str] = None,
) -> Tuple[ClaimTotals, str, List[str], bool]:
    """Pure function calculating claim totals, status, flags, and denial history.

    Returns:
        (totals, status, flags, denial_history)
    """
    if not matched_remittances:
        totals = ClaimTotals(
            paid_cents=0,
            adjustment_cents=0,
            patient_responsibility_cents=0,
            difference_cents=None,
        )
        return totals, "no_remittance", [], False

    paid_cents = sum(r.paid_cents for r in matched_remittances)
    adjustment_cents = sum(r.adjustment_cents for r in matched_remittances)
    patient_responsibility_cents = sum(r.patient_responsibility_cents for r in matched_remittances)

    difference_cents = billed_cents - paid_cents - adjustment_cents - patient_responsibility_cents
    status = "balanced" if difference_cents == 0 else "unbalanced"

    # Derive denial history
    has_denial_history = any(
        normalize_code(r.reason_code) in ASSIGNMENT_DENIAL_CODES
        for r in matched_remittances
    )

    flags: List[str] = []
    if has_denial_history:
        flags.append("denial_history")

    if paid_cents > billed_cents:
        flags.append("payment_exceeds_billed")

    if claim_payer:
        norm_claim_payer = claim_payer.strip().lower()
        if any(r.payer.strip().lower() != norm_claim_payer for r in matched_remittances):
            flags.append("payer_mismatch")

    totals = ClaimTotals(
        paid_cents=paid_cents,
        adjustment_cents=adjustment_cents,
        patient_responsibility_cents=patient_responsibility_cents,
        difference_cents=difference_cents,
    )

    return totals, status, flags, has_denial_history
