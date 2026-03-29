"""
test_core.py — Unit tests for core.py logic (goal builder, payer config, data extraction).

These tests run WITHOUT a live TinyFish API key or MongoDB — all external calls are mocked.
Covers: goal prompt construction, payer config validation, status parsing, error handling.

Run:
    cd backend/
    pytest tests/test_core.py -v
"""

import os
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")
os.environ.setdefault("TESTING", "1")


# ── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def sample_patient():
    return {
        "member_id": "AET-001-78234",
        "name": "Maria Garcia",
        "dob": "1978-03-14",
        "cpt_code": "27447",
        "payers": ["Aetna"],
    }


@pytest.fixture
def sample_payer():
    return {
        "name": "Aetna",
        "url": "https://www.cms.gov/medicare-coverage-database/search.aspx",
        "portal_url": "https://availity.com",
        "profile": "stealth",
    }


# ── Payer config tests ───────────────────────────────────────────────────────


def test_payers_dict_has_required_fields():
    """Every payer in PAYERS must have name, url, portal_url, profile."""
    from app.core import PAYERS
    required_fields = {"name", "url", "portal_url", "profile"}
    for payer_name, config in PAYERS.items():
        missing = required_fields - set(config.keys())
        assert not missing, f"Payer '{payer_name}' missing fields: {missing}"


def test_payers_dict_has_five_payers():
    """We must have at least 5 payers configured."""
    from app.core import PAYERS
    assert len(PAYERS) >= 5


def test_payer_urls_are_https():
    """All payer URLs must use HTTPS for security."""
    from app.core import PAYERS
    for payer_name, config in PAYERS.items():
        assert config["url"].startswith("https://"), \
            f"Payer '{payer_name}' url must use HTTPS"
        assert config["portal_url"].startswith("https://"), \
            f"Payer '{payer_name}' portal_url must use HTTPS"


def test_payer_profile_is_stealth():
    """All payers must use stealth browser profile to avoid detection."""
    from app.core import PAYERS
    for payer_name, config in PAYERS.items():
        assert config["profile"] == "stealth", \
            f"Payer '{payer_name}' must use stealth profile"


def test_known_payer_names():
    """Verify the five major payers are all present."""
    from app.core import PAYERS
    expected = {"Aetna", "UnitedHealthcare", "Cigna", "Humana", "Anthem BCBS"}
    for payer in expected:
        assert payer in PAYERS, f"Expected payer '{payer}' not found in PAYERS"


# ── Goal prompt tests ────────────────────────────────────────────────────────


def test_build_goal_returns_string(sample_patient, sample_payer):
    """build_goal() must return a non-empty string."""
    from app.core import build_goal
    result = build_goal(sample_patient, sample_payer)
    assert isinstance(result, str)
    assert len(result) > 200


def test_build_goal_includes_cpt_code(sample_patient, sample_payer):
    """Goal must include the patient's CPT code for research accuracy."""
    from app.core import build_goal
    result = build_goal(sample_patient, sample_payer)
    assert "27447" in result


def test_build_goal_includes_payer_name(sample_patient, sample_payer):
    """Goal must reference the payer name."""
    from app.core import build_goal
    result = build_goal(sample_patient, sample_payer)
    assert "Aetna" in result


def test_build_goal_includes_cms_url(sample_patient, sample_payer):
    """Phase 1 must start on CMS.gov (public site, no login needed)."""
    from app.core import build_goal
    result = build_goal(sample_patient, sample_payer)
    assert "cms.gov" in result.lower()


def test_build_goal_includes_npi_registry(sample_patient, sample_payer):
    """Phase 2 must reference NPI registry lookup."""
    from app.core import build_goal
    result = build_goal(sample_patient, sample_payer)
    assert "npi" in result.lower()


def test_build_goal_includes_phase_markers(sample_patient, sample_payer):
    """Goal must have clearly labeled phases for multi-step execution."""
    from app.core import build_goal
    result = build_goal(sample_patient, sample_payer)
    # Should have at least Phase 1 and Phase 2 markers
    assert "Phase 1" in result or "PHASE 1" in result or "phase 1" in result.lower()


def test_build_goal_different_patients_produce_different_goals():
    """Different CPT codes must produce different goals."""
    from app.core import build_goal, PAYERS
    payer = PAYERS["Aetna"]
    patient_knee = {"member_id": "P1", "name": "Alice", "dob": "1970-01-01", "cpt_code": "27447", "payers": ["Aetna"]}
    patient_mri = {"member_id": "P2", "name": "Bob", "dob": "1975-06-15", "cpt_code": "70553", "payers": ["Aetna"]}
    goal_knee = build_goal(patient_knee, payer)
    goal_mri = build_goal(patient_mri, payer)
    assert goal_knee != goal_mri
    assert "27447" in goal_knee
    assert "70553" in goal_mri


# ── Model validation tests (via models.py) ──────────────────────────────────


def test_create_patient_request_valid():
    """Valid patient request must parse without errors."""
    from app.models import CreatePatientRequest
    req = CreatePatientRequest(
        name="Test Patient",
        dob="1980-01-01",
        member_id="TEST-999",
        cpt_code="27447",
        payers=["Aetna"],
    )
    assert req.name == "Test Patient"
    assert req.cpt_code == "27447"


def test_create_patient_request_invalid_cpt():
    """Invalid CPT code must raise ValidationError."""
    from app.models import CreatePatientRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        CreatePatientRequest(
            name="Test",
            dob="1980-01-01",
            member_id="TEST-000",
            cpt_code="00000",   # not supported
            payers=["Aetna"],
        )


def test_create_patient_request_invalid_payer():
    """Unknown payer name must raise ValidationError."""
    from app.models import CreatePatientRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        CreatePatientRequest(
            name="Test",
            dob="1980-01-01",
            member_id="TEST-000",
            cpt_code="27447",
            payers=["NonExistentPayer"],
        )


def test_create_patient_request_empty_payers():
    """Empty payers list must raise ValidationError."""
    from app.models import CreatePatientRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        CreatePatientRequest(
            name="Test",
            dob="1980-01-01",
            member_id="TEST-000",
            cpt_code="27447",
            payers=[],
        )


def test_appeal_request_valid():
    """Valid appeal request must parse correctly."""
    from app.models import GenerateAppealRequest
    req = GenerateAppealRequest(
        payer_name="Aetna",
        denial_reason="Medical necessity not established",
    )
    assert req.payer_name == "Aetna"
    assert len(req.denial_reason) >= 5


def test_appeal_request_denial_too_short():
    """Denial reason < 5 chars must fail validation."""
    from app.models import GenerateAppealRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        GenerateAppealRequest(payer_name="Aetna", denial_reason="no")


def test_appeal_request_invalid_payer():
    """Unknown payer in appeal request must fail validation."""
    from app.models import GenerateAppealRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        GenerateAppealRequest(
            payer_name="FakeInsuranceCo",
            denial_reason="Medical necessity not established",
        )


# ── Supported CPT codes ──────────────────────────────────────────────────────


def test_supported_cpt_codes_list():
    """CPT_CODES must contain common orthopedic and cardiology codes."""
    from app.models import CPT_CODES
    # Common orthopedic and surgical codes
    expected = {"27447", "27130", "29827", "29881"}
    for code in expected:
        assert code in CPT_CODES, f"CPT code {code} missing from CPT_CODES"


def test_supported_payers_list():
    """SUPPORTED_PAYERS must contain the five major payers."""
    from app.models import SUPPORTED_PAYERS
    expected = {"Aetna", "UnitedHealthcare", "Cigna", "Humana", "Anthem BCBS"}
    for payer in expected:
        assert payer in SUPPORTED_PAYERS, f"Payer {payer} missing from SUPPORTED_PAYERS"


# ── check_pa_status error handling ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_check_pa_status_returns_none_on_stream_exception():
    """check_pa_status returns None when the TinyFish stream raises mid-run."""
    from app.core import check_pa_status

    mock_db = MagicMock()
    mock_db.pa_checks.find_one.return_value = None
    mock_db.pa_checks.insert_one = MagicMock(return_value=MagicMock(inserted_id="test"))

    patient = {
        "member_id": "TEST-001",
        "name": "Test Patient",
        "dob": "1980-01-01",
        "cpt_code": "27447",
        "payers": ["Aetna"],
    }

    # Mock TinyFish so stream raises during iteration (simulates mid-run error)
    mock_stream_cm = MagicMock()
    mock_stream_cm.__enter__ = MagicMock(side_effect=ConnectionError("Network unreachable"))
    mock_stream_cm.__exit__ = MagicMock(return_value=False)

    mock_agent = MagicMock()
    mock_agent.stream.return_value = mock_stream_cm

    mock_tf_instance = MagicMock()
    mock_tf_instance.agent = mock_agent

    with patch("app.core.TinyFish", return_value=mock_tf_instance):
        result = await check_pa_status(patient, "Aetna", mock_db)

    # When the stream fails before StartedEvent, function returns None
    assert result is None


@pytest.mark.asyncio
async def test_check_pa_status_returns_none_for_unknown_payer():
    """check_pa_status returns None immediately for unknown payer names."""
    from app.core import check_pa_status

    mock_db = MagicMock()
    patient = {
        "member_id": "TEST-002",
        "name": "Test Patient",
        "dob": "1975-01-01",
        "cpt_code": "27447",
        "payers": ["Aetna"],
    }

    result = await check_pa_status(patient, "UnknownPayerXYZ", mock_db)
    assert result is None
