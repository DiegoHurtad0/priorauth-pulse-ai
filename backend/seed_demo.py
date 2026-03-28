"""
seed_demo.py — Reset MongoDB to a clean demo state.

Usage:
    cd backend/
    python seed_demo.py

Drops db.patients and db.pa_checks completely, then re-inserts the full
demo dataset. Run this before recording the demo video to guarantee a clean,
predictable starting state.
"""

import os
import uuid
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from pymongo import MongoClient, DESCENDING

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["priorauth_pulse"]

DEMO_PATIENTS = [
    {"name": "Maria Garcia",     "dob": "1978-03-14", "member_id": "AET-001-78234", "cpt_code": "27447", "payers": ["Aetna", "UnitedHealthcare"],     "pa_active": True},
    {"name": "John Smith",       "dob": "1965-11-22", "member_id": "UHC-002-45123", "cpt_code": "29827", "payers": ["UnitedHealthcare"],               "pa_active": True},
    {"name": "Robert Johnson",   "dob": "1952-07-08", "member_id": "CGN-003-67890", "cpt_code": "27130", "payers": ["Cigna"],                         "pa_active": True},
    {"name": "Linda Williams",   "dob": "1981-09-30", "member_id": "HUM-004-11223", "cpt_code": "43239", "payers": ["Humana", "Aetna"],               "pa_active": True},
    {"name": "James Brown",      "dob": "1944-02-18", "member_id": "BCB-005-33445", "cpt_code": "33533", "payers": ["Anthem BCBS"],                   "pa_active": True},
    {"name": "Patricia Davis",   "dob": "1970-06-25", "member_id": "AET-006-55667", "cpt_code": "70553", "payers": ["Aetna"],                         "pa_active": True},
    {"name": "Michael Miller",   "dob": "1988-12-03", "member_id": "UHC-007-77889", "cpt_code": "27447", "payers": ["UnitedHealthcare", "Cigna"],     "pa_active": True},
    {"name": "Barbara Wilson",   "dob": "1962-04-17", "member_id": "CGN-008-99001", "cpt_code": "64483", "payers": ["Cigna"],                         "pa_active": True},
    {"name": "Richard Moore",    "dob": "1955-08-11", "member_id": "HUM-009-12345", "cpt_code": "29881", "payers": ["Humana"],                        "pa_active": True},
    {"name": "Susan Taylor",     "dob": "1975-01-29", "member_id": "BCB-010-23456", "cpt_code": "43239", "payers": ["Anthem BCBS", "Aetna"],          "pa_active": True},
    {"name": "Charles Anderson", "dob": "1948-10-05", "member_id": "AET-011-34567", "cpt_code": "33249", "payers": ["Aetna"],                         "pa_active": True},
    {"name": "Karen Thomas",     "dob": "1983-05-21", "member_id": "UHC-012-45678", "cpt_code": "27130", "payers": ["UnitedHealthcare"],               "pa_active": True},
    {"name": "Joseph Jackson",   "dob": "1939-03-16", "member_id": "CGN-013-56789", "cpt_code": "70553", "payers": ["Cigna", "Humana"],               "pa_active": True},
    {"name": "Nancy White",      "dob": "1967-07-14", "member_id": "HUM-014-67890", "cpt_code": "64483", "payers": ["Humana"],                        "pa_active": True},
    {"name": "Thomas Harris",    "dob": "1971-11-09", "member_id": "BCB-015-78901", "cpt_code": "29827", "payers": ["Anthem BCBS"],                   "pa_active": True},
]


def _demo_check(
    member_id: str,
    payer_name: str,
    patient_name: str,
    status: str,
    hours_ago: float,
    changed: bool = False,
    denial_reason: str | None = None,
) -> dict:
    """Build a single demo PA check document."""
    return {
        "member_id": member_id,
        "payer_name": payer_name,
        "patient_name": patient_name,
        "auth_status": status,
        "auth_number": f"PA-2026-{member_id[-5:]}" if status == "Approved" else None,
        "decision_date": "2026-03-25" if status in ("Approved", "Denied") else None,
        "expiration_date": "2026-09-25" if status == "Approved" else None,
        "requesting_provider": "Dr. Elena Rodriguez",
        "service_description": "Total Knee Arthroplasty",
        "denial_reason": denial_reason,
        "next_action_required": (
            "Submit appeal with additional clinical documentation"
            if status == "Denied"
            else None
        ),
        "extraction_timestamp": (
            datetime.now(timezone.utc) - timedelta(hours=hours_ago)
        ).isoformat(),
        "status_changed": changed,
        "run_id": f"run_{uuid.uuid4().hex[:8]}",
        "checked_at": datetime.now(timezone.utc) - timedelta(hours=hours_ago),
    }


def seed():
    """Drop all collections and re-insert full demo dataset."""
    print("🗑️  Dropping existing collections...")
    db.patients.drop()
    db.pa_checks.drop()
    print("   Dropped: patients, pa_checks")

    # ── Patients ─────────────────────────────
    now = datetime.now(timezone.utc)
    patients_with_ts = [{**p, "created_at": now} for p in DEMO_PATIENTS]
    result = db.patients.insert_many(patients_with_ts)
    print(f"\n✅ Inserted {len(result.inserted_ids)} patients")

    # ── PA check history ─────────────────────
    demo_checks = [
        # Maria Garcia: Pending → Approved (status change demo)
        _demo_check("AET-001-78234", "Aetna",            "Maria Garcia",     "Pending",   8),
        _demo_check("AET-001-78234", "Aetna",            "Maria Garcia",     "Approved",  4, changed=True),
        _demo_check("AET-001-78234", "UnitedHealthcare", "Maria Garcia",     "Pending",   6),

        # John Smith: Pending → Denied (THE dramatic demo moment — always red)
        _demo_check("UHC-002-45123", "UnitedHealthcare", "John Smith",       "Pending",   6),
        _demo_check("UHC-002-45123", "UnitedHealthcare", "John Smith",       "Denied",    2, changed=True,
                    denial_reason="Medical necessity documentation insufficient — peer-to-peer review required"),

        # Remaining patients: realistic mix of statuses
        _demo_check("CGN-003-67890", "Cigna",            "Robert Johnson",   "Approved",  3),
        _demo_check("HUM-004-11223", "Humana",           "Linda Williams",   "In Review", 5),
        _demo_check("HUM-004-11223", "Aetna",            "Linda Williams",   "Pending",   7),
        _demo_check("BCB-005-33445", "Anthem BCBS",      "James Brown",      "Approved",  1),
        _demo_check("AET-006-55667", "Aetna",            "Patricia Davis",   "Info Needed", 4),
        _demo_check("UHC-007-77889", "UnitedHealthcare", "Michael Miller",   "Pending",   5),
        _demo_check("UHC-007-77889", "Cigna",            "Michael Miller",   "Pending",   5),
        _demo_check("CGN-008-99001", "Cigna",            "Barbara Wilson",   "Approved",  2),
        _demo_check("HUM-009-12345", "Humana",           "Richard Moore",    "Pending",   6),
        _demo_check("BCB-010-23456", "Anthem BCBS",      "Susan Taylor",     "Approved",  3),
        _demo_check("BCB-010-23456", "Aetna",            "Susan Taylor",     "In Review", 4),
        _demo_check("AET-011-34567", "Aetna",            "Charles Anderson", "Pending",   8),
        _demo_check("UHC-012-45678", "UnitedHealthcare", "Karen Thomas",     "Denied",    5,
                    denial_reason="Service not covered under current plan benefits"),
        _demo_check("CGN-013-56789", "Cigna",            "Joseph Jackson",   "Approved",  1),
        _demo_check("CGN-013-56789", "Humana",           "Joseph Jackson",   "Pending",   4),
        _demo_check("HUM-014-67890", "Humana",           "Nancy White",      "Approved",  2),
        _demo_check("BCB-015-78901", "Anthem BCBS",      "Thomas Harris",    "Pending",   6),
    ]

    result = db.pa_checks.insert_many(demo_checks)
    print(f"✅ Inserted {len(result.inserted_ids)} PA checks")

    # ── Indexes ───────────────────────────────
    db.pa_checks.create_index(
        [("member_id", 1), ("payer_name", 1), ("checked_at", DESCENDING)]
    )
    db.patients.create_index("member_id", unique=True, sparse=True)
    print("\n✅ Indexes created")

    print("\n🎬 Demo data reset complete — ready to record!")
    print(f"   Patients: {len(DEMO_PATIENTS)}")
    print(f"   PA checks: {len(demo_checks)}")
    print(f"   John Smith denial: VISIBLE (row highlighted red)")
    print(f"   Maria Garcia approval: VISIBLE (status change logged)")


if __name__ == "__main__":
    print("=" * 60)
    print("  PriorAuth Pulse — Demo Data Seeder")
    print("=" * 60 + "\n")
    seed()
    print("\n" + "=" * 60)
    mongo_client.close()
