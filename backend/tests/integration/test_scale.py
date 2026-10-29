"""Integration tests for large-scale dataset reconciliation, pagination, and invariants.

This test file is completely isolated from test_api.py. It verifies that the
platform scales smoothly with 50+ claims and multiple remittances without precision loss.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.import_service import ImportService


@pytest.fixture(scope="function")
def scale_client(db_session: Session) -> TestClient:
    """TestClient seeded with the 50-claim large synthetic dataset."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    data_dir = Path(__file__).resolve().parents[3] / "data"
    importer = ImportService(db_session)
    importer.import_all(data_dir / "claims_large.csv", data_dir / "remittances_large.csv")

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_scale_dataset_reconciliation_math(scale_client: TestClient):
    """Invariant 1 & 2: For every claim, Billed == Paid + Adj + PR + Diff (or Diff is None)."""
    response = scale_client.get("/api/claims?page_size=100")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 50
    assert len(data["items"]) == 50

    for claim in data["items"]:
        billed = claim["billed_cents"]
        paid = claim["paid_cents"]
        adj = claim["adjustment_cents"]
        pr = claim["patient_responsibility_cents"]
        diff = claim["difference_cents"]
        status = claim["status"]

        if status == "no_remittance":
            assert diff is None, f"Claim {claim['claim_id']} has no remittances but difference is not None"
        else:
            assert diff is not None, f"Claim {claim['claim_id']} has remittances but difference is None"
            # Strict accounting formula: Billed - Paid - Adj - PR == Diff
            assert billed - paid - adj - pr == diff, (
                f"Math variance mismatch for {claim['claim_id']}: {billed} - {paid} - {adj} - {pr} != {diff}"
            )
            if diff == 0:
                assert status == "balanced"
            else:
                assert status == "unbalanced"


def test_scale_pagination_at_scale(scale_client: TestClient):
    """Verifies that pagination (pages with 10 items, 20 items, 50 items) functions cleanly."""
    # Page 1 with page_size 10
    res_p1 = scale_client.get("/api/claims?page=1&page_size=10")
    assert res_p1.status_code == 200
    d_p1 = res_p1.json()
    assert d_p1["page"] == 1
    assert d_p1["page_size"] == 10
    assert d_p1["total"] == 50
    assert len(d_p1["items"]) == 10

    # Page 2 with page_size 10
    res_p2 = scale_client.get("/api/claims?page=2&page_size=10")
    assert res_p2.status_code == 200
    d_p2 = res_p2.json()
    assert d_p2["page"] == 2
    assert len(d_p2["items"]) == 10
    # Page 2 claims must be distinct from Page 1 claims
    p1_ids = {c["claim_id"] for c in d_p1["items"]}
    p2_ids = {c["claim_id"] for c in d_p2["items"]}
    assert p1_ids.isdisjoint(p2_ids)

    # Page 1 with page_size 20
    res_20 = scale_client.get("/api/claims?page=1&page_size=20")
    assert res_20.status_code == 200
    assert len(res_20.json()["items"]) == 20

    # Page 1 with page_size 50 (all items on one page)
    res_50 = scale_client.get("/api/claims?page=1&page_size=50")
    assert res_50.status_code == 200
    assert len(res_50.json()["items"]) == 50


def test_scale_filtering_by_status(scale_client: TestClient):
    """Verifies filtering across 50 claims by balanced, unbalanced, and no_remittance."""
    for st in ["balanced", "unbalanced", "no_remittance"]:
        res = scale_client.get(f"/api/claims?status={st}&page_size=100")
        assert res.status_code == 200
        items = res.json()["items"]
        assert len(items) > 0, f"Expected at least 1 claim with status {st}"
        for c in items:
            assert c["status"] == st


def test_scale_filtering_by_flags(scale_client: TestClient):
    """Verifies filtering by denial_history and payment_exceeds_billed flags."""
    # Denial history filter
    res_denial = scale_client.get("/api/claims?flag=denial_history&page_size=100")
    assert res_denial.status_code == 200
    denial_items = res_denial.json()["items"]
    assert len(denial_items) > 0
    for c in denial_items:
        assert "denial_history" in c["flags"]

    # Payment exceeds billed filter
    res_overpaid = scale_client.get("/api/claims?flag=payment_exceeds_billed&page_size=100")
    assert res_overpaid.status_code == 200
    overpaid_items = res_overpaid.json()["items"]
    assert len(overpaid_items) > 0
    for c in overpaid_items:
        assert "payment_exceeds_billed" in c["flags"]
        assert c["paid_cents"] > c["billed_cents"]


def test_scale_unmatched_orphan_remittances(scale_client: TestClient):
    """Verifies that orphan remittances C9998 and C9999 are properly quarantined."""
    res = scale_client.get("/api/remittances/unmatched")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    orphans = data["items"]
    orphan_claim_ids = {o["source_claim_id"] for o in orphans}
    assert orphan_claim_ids == {"C9998", "C9999"}
    for o in orphans:
        assert o["issue"] == "claim_not_found"
        assert o["paid_cents"] > 0

