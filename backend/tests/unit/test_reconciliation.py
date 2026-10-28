"""Unit tests for the reconciliation pure service."""

from datetime import date
import pytest

from backend.app.db.models import Remittance
from backend.app.services.reconciliation import (
    ASSIGNMENT_DENIAL_CODES,
    calculate_claim_reconciliation,
    normalize_code,
)


def make_remit(
    remit_id: str,
    paid: int = 0,
    adj: int = 0,
    patient_resp: int = 0,
    reason_code: str = None,
    payer: str = "Northwind Health",
) -> Remittance:
    """Helper to instantiate Remittance in memory."""
    return Remittance(
        remit_id=remit_id,
        source_claim_id="C1001",
        claim_id="C1001",
        payer=payer,
        paid_cents=paid,
        adjustment_cents=adj,
        patient_responsibility_cents=patient_resp,
        reason_code=reason_code,
        posted_date=date(2026, 9, 15),
    )


def test_no_remittance_claim():
    """No-remittance claims must have status 'no_remittance' and null difference."""
    totals, status, flags, has_denial = calculate_claim_reconciliation(
        billed_cents=6000,
        matched_remittances=[],
        claim_payer="Cedar Mutual",
    )
    assert status == "no_remittance"
    assert totals.difference_cents is None
    assert totals.paid_cents == 0
    assert totals.adjustment_cents == 0
    assert totals.patient_responsibility_cents == 0
    assert flags == []
    assert not has_denial


def test_balanced_claim_with_adjustment():
    """Billed 15000, Paid 12000, Adj 3000 -> difference 0, balanced (C1001)."""
    r = make_remit("R1001", paid=12000, adj=3000, patient_resp=0, reason_code="CO-45")
    totals, status, flags, has_denial = calculate_claim_reconciliation(
        billed_cents=15000,
        matched_remittances=[r],
        claim_payer="Northwind Health",
    )
    assert status == "balanced"
    assert totals.difference_cents == 0
    assert totals.paid_cents == 12000
    assert totals.adjustment_cents == 3000
    assert not has_denial
    # CO-45 is an adjustment code, but NOT in the assignment denial list
    assert "denial_history" not in flags


def test_balanced_claim_with_patient_responsibility():
    """Billed 2500, Paid 0, Patient Resp 2500 -> difference 0, balanced (C1008)."""
    r = make_remit("R1008", paid=0, adj=0, patient_resp=2500, reason_code="PR-1", payer="Cedar Mutual")
    totals, status, flags, has_denial = calculate_claim_reconciliation(
        billed_cents=2500,
        matched_remittances=[r],
        claim_payer="Cedar Mutual",
    )
    assert status == "balanced"
    assert totals.difference_cents == 0
    assert totals.patient_responsibility_cents == 2500
    assert not has_denial
    assert flags == []


def test_unbalanced_claim_partial_payment():
    """Billed 15000, Paid 10000 -> difference 5000, unbalanced (C1004)."""
    r = make_remit("R1004", paid=10000, adj=0, patient_resp=0, reason_code=None)
    totals, status, flags, has_denial = calculate_claim_reconciliation(
        billed_cents=15000,
        matched_remittances=[r],
        claim_payer="Northwind Health",
    )
    assert status == "unbalanced"
    assert totals.difference_cents == 5000
    assert not has_denial
    assert flags == []


def test_payment_exceeds_billed_review_flag():
    """Billed 28000, Paid 30000 -> difference -2000, status unbalanced, flag payment_exceeds_billed (C1006)."""
    r = make_remit("R1005", paid=30000, adj=0, patient_resp=0, reason_code=None, payer="Harbor Plan")
    totals, status, flags, has_denial = calculate_claim_reconciliation(
        billed_cents=28000,
        matched_remittances=[r],
        claim_payer="Harbor Plan",
    )
    assert status == "unbalanced"
    assert totals.difference_cents == -2000
    assert "payment_exceeds_billed" in flags


def test_multiple_remittances_with_historical_denial():
    """Claim C1007: first remittance denied (CO-197), second pays 11000+4000 adj -> balanced with denial_history."""
    r1 = make_remit("R1006", paid=0, adj=0, patient_resp=0, reason_code="CO-197")
    r2 = make_remit("R1007", paid=11000, adj=4000, patient_resp=0, reason_code="CO-45")
    totals, status, flags, has_denial = calculate_claim_reconciliation(
        billed_cents=15000,
        matched_remittances=[r1, r2],
        claim_payer="Northwind Health",
    )
    assert status == "balanced"
    assert totals.difference_cents == 0
    assert totals.paid_cents == 11000
    assert totals.adjustment_cents == 4000
    assert has_denial is True
    assert "denial_history" in flags


def test_payer_mismatch_flag():
    """Payer on remittance differs from claim payer -> flag payer_mismatch, include in totals."""
    r = make_remit("R999", paid=5000, adj=0, patient_resp=0, payer="Other Payer")
    totals, status, flags, _ = calculate_claim_reconciliation(
        billed_cents=10000,
        matched_remittances=[r],
        claim_payer="Northwind Health",
    )
    assert "payer_mismatch" in flags
    assert totals.paid_cents == 5000
    assert totals.difference_cents == 5000


def test_denial_codes_set():
    """Ensure exact set of denial codes specified by assignment."""
    assert ASSIGNMENT_DENIAL_CODES == {"CO-16", "CO-50", "CO-197"}
    assert normalize_code(" co-16 ") == "CO-16"
    assert normalize_code("") is None
    assert normalize_code(None) is None
