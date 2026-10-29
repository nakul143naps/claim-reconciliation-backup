"""Integration tests for all FastAPI endpoints using TestClient."""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.import_service import ImportService


@pytest.fixture(scope="function")
def client(db_session: Session) -> TestClient:
    """FastAPI TestClient with overridden get_db dependency pointing to test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Pre-seed the test database with sample data
    data_dir = Path(__file__).resolve().parents[3] / "data"
    importer = ImportService(db_session)
    importer.import_all(data_dir / "claims.csv", data_dir / "remittances.csv")

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_health_check(client: TestClient):
    """GET /api/health returns 200 and database connected."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_reconciliation_summary(client: TestClient):
    """GET /api/summary returns expected KPIs matching DESIGN.md."""
    response = client.get("/api/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_claims"] == 12
    assert data["balanced_claims"] == 5
    assert data["unbalanced_claims"] == 6
    assert data["claims_without_remittance"] == 1
    assert data["total_billed_cents"] == 170000
    assert data["matched_paid_cents"] == 99000
    assert data["all_remittance_paid_cents"] == 104000
    assert data["unmatched_remittance_count"] == 1
    assert data["unmatched_remittance_paid_cents"] == 5000
    assert data["claims_with_denial_history"] == 4
    assert data["claims_flagged_for_review"] == 1


def test_claims_list_default_pagination(client: TestClient):
    """GET /api/claims returns paginated items with default page size 10."""
    response = client.get("/api/claims")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 12
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["items"]) == 10


def test_claims_list_filter_unbalanced(client: TestClient):
    """GET /api/claims?status=unbalanced filters to exactly 6 claims."""
    response = client.get("/api/claims?status=unbalanced")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 6
    for item in data["items"]:
        assert item["status"] == "unbalanced"


def test_claims_list_filter_payer(client: TestClient):
    """GET /api/claims?payer=Cedar Mutual performs case-insensitive match."""
    response = client.get("/api/claims?payer=cedar mutual")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["payer"].lower() == "cedar mutual"


def test_claims_list_validation_error(client: TestClient):
    """Invalid query parameter format returns standard 422 error schema."""
    response = client.get("/api/claims?status=invalid_status")
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_QUERY_PARAMETER"


def test_claim_detail_balanced_with_denial_history(client: TestClient):
    """GET /api/claims/C1007 preserves earlier CO-197 while balanced."""
    response = client.get("/api/claims/C1007")
    assert response.status_code == 200
    data = response.json()
    assert data["claim_id"] == "C1007"
    assert data["status"] == "balanced"
    assert data["totals"]["difference_cents"] == 0
    assert data["denial_history"] is True
    assert "denial_history" in data["flags"]
    assert len(data["remittances"]) == 2
    assert data["remittances"][0]["reason_code"] == "CO-197"
    assert data["remittances"][1]["reason_code"] == "CO-45"


def test_claim_detail_no_remittance(client: TestClient):
    """GET /api/claims/C1005 has status no_remittance and null difference."""
    response = client.get("/api/claims/C1005")
    assert response.status_code == 200
    data = response.json()
    assert data["claim_id"] == "C1005"
    assert data["status"] == "no_remittance"
    assert data["totals"]["difference_cents"] is None
    assert len(data["remittances"]) == 0


def test_claim_detail_not_found(client: TestClient):
    """GET /api/claims/C9999 returns 404 with standard error structure."""
    response = client.get("/api/claims/C9999")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "CLAIM_NOT_FOUND"


def test_unmatched_remittances_list(client: TestClient):
    """GET /api/remittances/unmatched returns orphaned R1012."""
    response = client.get("/api/remittances/unmatched")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["remit_id"] == "R1012"
    assert item["source_claim_id"] == "C9999"
    assert item["paid_cents"] == 5000
    assert item["issue"] == "claim_not_found"


def test_claims_export_csv(client: TestClient):
    """GET /api/claims/export streams a valid reconciliation CSV ledger."""
    response = client.get("/api/claims/export")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    lines = response.text.strip().split("\n")
    # 1 header line + 12 claim rows
    assert len(lines) == 13
    assert "claim_id,patient_account,payer" in lines[0]
    assert "C1001" in lines[1]


def test_claims_export_json(client: TestClient):
    """GET /api/claims/export?format=json streams a valid reconciliation JSON ledger."""
    response = client.get("/api/claims/export?format=json")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    data = response.json()
    assert data["total_records"] == 12
    assert len(data["claims"]) == 12
    assert data["claims"][0]["claim_id"] == "C1001"


def test_claims_flag_filter(client: TestClient):
    """GET /api/claims?flag=denial_history filters to exactly 4 claims."""
    response = client.get("/api/claims?flag=denial_history")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    for item in data["items"]:
        assert "denial_history" in item["flags"]


def test_claims_substring_search(client: TestClient):
    """Search matches substring on claim ID or patient account."""
    response = client.get("/api/claims?claim_id=1002")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["claim_id"] == "C1002"
