from typing import TypedDict, Optional
from datetime import datetime

# ─────────────────────────────────────────────
# Patient document (stored in db.patients)
# ─────────────────────────────────────────────

class Patient(TypedDict):
    """A patient with one or more active prior authorization requests."""
    name: str                   # Full name, e.g. "Maria Garcia"
    dob: str                    # Date of birth — YYYY-MM-DD
    member_id: str              # Payer member/insurance ID (unique per patient)
    cpt_code: str               # Procedure code being authorized, e.g. "27447"
    payers: list[str]           # Which payers to check, e.g. ["Aetna", "UHC"]
    pa_active: bool             # Whether to include in batch checks
    created_at: datetime        # Document creation timestamp


# ─────────────────────────────────────────────
# PACheck document (stored in db.pa_checks)
# One record per (patient × payer × run)
# ─────────────────────────────────────────────

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
