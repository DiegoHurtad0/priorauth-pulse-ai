"""
models.py — Pydantic models for API request/response validation.
TypedDicts for internal MongoDB document shapes.
"""
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

# ─────────────────────────────────────────────
# Pydantic: API Request bodies
# ─────────────────────────────────────────────

# Valid payer names (5 supported portals)
SUPPORTED_PAYERS = {
    "Aetna",
    "UnitedHealthcare",
    "Cigna",
    "Humana",
    "Anthem BCBS",
}

# Valid CPT codes with descriptions
CPT_CODES = {
    "27447": "Total Knee Arthroplasty",
    "29827": "Arthroscopic Rotator Cuff Repair",
    "27130": "Total Hip Arthroplasty",
    "43239": "Upper GI Endoscopy with Biopsy",
    "70553": "MRI Brain w/ and w/o Contrast",
    "64483": "Transforaminal Epidural Injection",
    "29881": "Arthroscopic Knee Surgery w/ Meniscectomy",
    "33533": "Coronary Artery Bypass (Arterial)",
    "33249": "Implantation of Cardiac Defibrillator",
}


class CreatePatientRequest(BaseModel):
    """Request body for POST /patients — add a new patient to monitoring."""
    name: str = Field(
        ...,
        min_length=2,
        max_length=120,
        description="Full patient name, e.g. 'Maria Garcia'",
        example="Maria Garcia",
    )
    dob: str = Field(
        ...,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Date of birth in YYYY-MM-DD format",
        example="1978-03-14",
    )
    member_id: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Payer member/insurance ID (unique per patient)",
        example="AET-001-78234",
    )
    cpt_code: str = Field(
        ...,
        description="CPT procedure code for the authorization request",
        example="27447",
    )
    payers: list[str] = Field(
        ...,
        min_length=1,
        max_length=5,
        description=f"Payers to monitor. Supported: {sorted(SUPPORTED_PAYERS)}",
        example=["Aetna", "UnitedHealthcare"],
    )

    @field_validator("cpt_code")
    @classmethod
    def validate_cpt_code(cls, v: str) -> str:
        if v not in CPT_CODES:
            raise ValueError(
                f"Unsupported CPT code '{v}'. Supported: {sorted(CPT_CODES.keys())}"
            )
        return v

    @field_validator("payers")
    @classmethod
    def validate_payers(cls, v: list[str]) -> list[str]:
        invalid = [p for p in v if p not in SUPPORTED_PAYERS]
        if invalid:
            raise ValueError(
                f"Unsupported payer(s): {invalid}. Supported: {sorted(SUPPORTED_PAYERS)}"
            )
        return v

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, v: str) -> str:
        try:
            dt = datetime.strptime(v, "%Y-%m-%d")
            if dt.year < 1900 or dt.year > 2020:
                raise ValueError("Date of birth must be between 1900 and 2020")
        except ValueError as e:
            if "between" in str(e):
                raise
            raise ValueError("Date of birth must be in YYYY-MM-DD format")
        return v


class GenerateAppealRequest(BaseModel):
    """Request body for POST /patients/{member_id}/appeal."""
    payer_name: str = Field(
        ...,
        description="Payer name for the denied authorization",
        example="UnitedHealthcare",
    )
    denial_reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="The denial reason text from the payer portal",
        example="Medical necessity documentation insufficient — peer-to-peer review required",
    )
    auth_number: Optional[str] = Field(
        None,
        description="Original authorization reference number (if available)",
        example="PA-2026-45123",
    )

    @field_validator("payer_name")
    @classmethod
    def validate_payer(cls, v: str) -> str:
        if v not in SUPPORTED_PAYERS:
            raise ValueError(
                f"Unsupported payer '{v}'. Supported: {sorted(SUPPORTED_PAYERS)}"
            )
        return v


# ─────────────────────────────────────────────
# TypedDicts: Internal MongoDB document shapes
# ─────────────────────────────────────────────

from typing import TypedDict

class Patient(TypedDict):
    """A patient with one or more active prior authorization requests."""
    name: str                   # Full name, e.g. "Maria Garcia"
    dob: str                    # Date of birth — YYYY-MM-DD
    member_id: str              # Payer member/insurance ID (unique per patient)
    cpt_code: str               # Procedure code being authorized, e.g. "27447"
    payers: list[str]           # Which payers to check, e.g. ["Aetna", "UHC"]
    pa_active: bool             # Whether to include in batch checks
    created_at: datetime        # Document creation timestamp


PAStatus = str  # Literal values:
# "Approved" | "Pending" | "Denied" | "Info Needed" |
# "In Review" | "Expired" | "Not Found" | "Portal Unavailable"

class PACheck(TypedDict):
    """Result of a single TinyFish PA status check."""
    patient_name: str
    member_id: str
    payer_name: str
    auth_status: PAStatus
    auth_number: Optional[str]          # e.g. "PA-2026-78234"
    decision_date: Optional[str]        # YYYY-MM-DD
    expiration_date: Optional[str]      # YYYY-MM-DD
    requesting_provider: Optional[str]
    service_description: Optional[str]
    denial_reason: Optional[str]        # Populated when status == "Denied"
    next_action_required: Optional[str]
    extraction_timestamp: str           # ISO 8601, set by TinyFish agent
    status_changed: bool                # True if different from previous check
    run_id: Optional[str]               # TinyFish run_id for audit trail
    checked_at: datetime                # When this record was inserted

# ─────────────────────────────────────────────
# Status color mapping (used by frontend)
# ─────────────────────────────────────────────

STATUS_COLORS: dict[str, str] = {
    "Approved":           "green",
    "Pending":            "yellow",
    "In Review":          "yellow",
    "Denied":             "red",
    "Info Needed":        "orange",
    "Expired":            "gray",
    "Not Found":          "gray",
    "Portal Unavailable": "gray",
}
