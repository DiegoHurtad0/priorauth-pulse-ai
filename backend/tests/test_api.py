"""
test_api.py — FastAPI endpoint tests using TestClient (no live MongoDB required).

Run:
    cd backend/
    pytest tests/ -v

These tests verify:
- All major GET endpoints return 200 and correct JSON shape
- POST /patients validates required fields (422 on bad input)
- POST /patients validates CPT codes and payer names
- Health endpoints return expected subsystem keys
"""

import os
import pytest
from unittest.mock import patch, MagicMock

# Prevent real DB/scheduler/seeding during tests
os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")
os.environ.setdefault("TESTING", "1")

from fastapi.testclient import TestClient


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture(scope="module")
def client():
    """TestClient with MongoDB + scheduler mocked out."""
    mock_collection = MagicMock()
    mock_collection.count_documents.return_value = 5
    mock_collection.find_one.return_value = None
    mock_collection.find.return_value = []
    mock_collection.insert_one.return_value = MagicMock(inserted_id="abc123")

    mock_db = MagicMock()
    mock_db.__getitem__.return_value = mock_collection
    mock_db.patients = mock_collection
    mock_db.pa_checks = mock_collection

    mock_mongo = MagicMock()
    mock_mongo.__getitem__.return_value = mock_db
    mock_mongo.admin.command.return_value = {"ok": 1}

    with (
        patch("pymongo.MongoClient", return_value=mock_mongo),
        patch("app.main.start_scheduler"),
        patch("app.main.stop_scheduler"),
        patch("app.main.seed_demo_data"),
        patch("app.main.ensure_indexes"),
        patch("app.main.db", mock_db),
        patch("app.main.mongo_client", mock_mongo),
    ):
        from app.main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


# ── Health endpoints ─────────────────────────────────────────


def test_health_returns_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_detailed_has_subsystems(client):
    res = client.get("/health/detailed")
    assert res.status_code == 200
    data = res.json()
    assert "subsystems" in data
    assert "mongodb" in data["subsystems"]
    assert "scheduler" in data["subsystems"]
    assert "tinyfish_agent" in data["subsystems"]
    assert "claude_ai" in data["subsystems"]


def test_health_response_headers(client):
    """Every response must carry X-Process-Time and X-Request-ID."""
    res = client.get("/health")
    assert "x-process-time" in res.headers
    assert "x-request-id" in res.headers


# ── Patients endpoints ───────────────────────────────────────


def test_get_patients_shape(client):
    res = client.get("/patients")
    assert res.status_code == 200
    data = res.json()
    assert "patients" in data
    assert "total" in data


def test_create_patient_missing_fields(client):
    """Pydantic validation should reject incomplete payloads with 422."""
    res = client.post("/patients", json={"name": "John"})
    assert res.status_code == 422


def test_create_patient_invalid_cpt(client):
    """Unknown CPT code should return 422."""
    res = client.post("/patients", json={
        "name": "Jane Doe",
        "dob": "1980-01-01",
        "member_id": "TEST-001",
        "cpt_code": "99999",     # not in supported CPT codes
        "payers": ["Aetna"],
    })
    assert res.status_code == 422
    detail = res.json()["detail"]
    assert any("CPT" in str(e) or "cpt" in str(e).lower() or "Unsupported" in str(e) for e in detail)


def test_create_patient_invalid_payer(client):
    """Unknown payer name should return 422."""
    res = client.post("/patients", json={
        "name": "Jane Doe",
        "dob": "1980-01-01",
        "member_id": "TEST-002",
        "cpt_code": "27447",
        "payers": ["BlueCross"],   # not in SUPPORTED_PAYERS
    })
    assert res.status_code == 422


def test_create_patient_valid(client):
    """Valid payload should return 201 (or 409 if member_id collides in mock)."""
    res = client.post("/patients", json={
        "name": "Test Patient",
        "dob": "1975-06-15",
        "member_id": "AET-TEST-001",
        "cpt_code": "27447",
        "payers": ["Aetna"],
    })
    # 201 = success, 409 = duplicate member_id (both are correct behaviour)
    assert res.status_code in (201, 409)


# ── Metrics + analytics ──────────────────────────────────────


def test_get_metrics_shape(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "active_patients" in data
    assert "total_checks_24h" in data
    assert "success_rate_24h" in data
    assert "supported_payers" in data


def test_get_payer_analytics(client):
    res = client.get("/analytics/payers")
    assert res.status_code == 200
    data = res.json()
    assert "payers" in data
    assert isinstance(data["payers"], list)


# ── TinyFish integration ─────────────────────────────────────


def test_tinyfish_integration_shape(client):
    res = client.get("/tinyfish/integration")
    assert res.status_code == 200
    data = res.json()
    assert "integration_level" in data
    assert "sse_events_handled" in data
    assert "goal_prompt_features" in data
    assert "agent_configuration" in data


def test_goal_preview_patient_not_found(client):
    res = client.get("/goal-preview/NOTEXIST/Aetna")
    assert res.status_code == 404


# ── Appeal endpoint ──────────────────────────────────────────


def test_appeal_patient_not_found(client):
    res = client.post("/patients/NOTEXIST/appeal", json={
        "payer_name": "Aetna",
        "denial_reason": "Medical necessity not established",
    })
    assert res.status_code == 404


def test_appeal_invalid_payer(client):
    """Unknown payer in appeal body should return 422."""
    res = client.post("/patients/AET-001-78234/appeal", json={
        "payer_name": "FakePayer Inc",
        "denial_reason": "Medical necessity not established",
    })
    assert res.status_code == 422


def test_appeal_denial_reason_too_short(client):
    """Denial reason < 5 chars should return 422."""
    res = client.post("/patients/AET-001-78234/appeal", json={
        "payer_name": "Aetna",
        "denial_reason": "No",    # < 5 chars
    })
    assert res.status_code == 422
