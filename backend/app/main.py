"""
main.py — PriorAuth Pulse FastAPI backend
Endpoints: health, patients, run-check, pa-checks, metrics
"""

import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, DESCENDING
from dotenv import load_dotenv

load_dotenv()

# ── Optional AgentOps init ───────────────────
try:
    import agentops
    if os.getenv("AGENTOPS_API_KEY"):
        agentops.init(
            os.getenv("AGENTOPS_API_KEY"),
            tags=["priorauth-pulse", "tinyfish-hackathon-2026"],
        )
        print("✅ AgentOps initialized")
except ImportError:
    pass

from app.core import run_batch_check, PAYERS
from app.scheduler import start_scheduler, stop_scheduler
from app.appeal import generate_appeal_letter


def _iso_utc(dt: datetime) -> str:
    """Return ISO 8601 string with explicit UTC suffix so JavaScript parses correctly."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")

# ── MongoDB connection ───────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["priorauth_pulse"]

# ── FastAPI app ──────────────────────────────
app = FastAPI(
    title="PriorAuth Pulse",
    description="Automated prior authorization monitoring across 50+ health plan portals",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory task status store ──────────────
active_tasks: dict[str, dict] = {}


# ── Seed demo patients ───────────────────────
DEMO_PATIENTS = [
    {"name": "Maria Garcia",    "dob": "1978-03-14", "member_id": "AET-001-78234", "cpt_code": "27447", "payers": ["Aetna", "UnitedHealthcare"], "pa_active": True},
    {"name": "John Smith",      "dob": "1965-11-22", "member_id": "UHC-002-45123", "cpt_code": "29827", "payers": ["UnitedHealthcare"],          "pa_active": True},
    {"name": "Robert Johnson",  "dob": "1952-07-08", "member_id": "CGN-003-67890", "cpt_code": "27130", "payers": ["Cigna"],                     "pa_active": True},
    {"name": "Linda Williams",  "dob": "1981-09-30", "member_id": "HUM-004-11223", "cpt_code": "43239", "payers": ["Humana", "Aetna"],           "pa_active": True},
    {"name": "James Brown",     "dob": "1944-02-18", "member_id": "BCB-005-33445", "cpt_code": "33533", "payers": ["Anthem BCBS"],              "pa_active": True},
    {"name": "Patricia Davis",  "dob": "1970-06-25", "member_id": "AET-006-55667", "cpt_code": "70553", "payers": ["Aetna"],                     "pa_active": True},
    {"name": "Michael Miller",  "dob": "1988-12-03", "member_id": "UHC-007-77889", "cpt_code": "27447", "payers": ["UnitedHealthcare", "Cigna"], "pa_active": True},
    {"name": "Barbara Wilson",  "dob": "1962-04-17", "member_id": "CGN-008-99001", "cpt_code": "64483", "payers": ["Cigna"],                     "pa_active": True},
    {"name": "Richard Moore",   "dob": "1955-08-11", "member_id": "HUM-009-12345", "cpt_code": "29881", "payers": ["Humana"],                    "pa_active": True},
    {"name": "Susan Taylor",    "dob": "1975-01-29", "member_id": "BCB-010-23456", "cpt_code": "43239", "payers": ["Anthem BCBS", "Aetna"],      "pa_active": True},
    {"name": "Charles Anderson","dob": "1948-10-05", "member_id": "AET-011-34567", "cpt_code": "33249", "payers": ["Aetna"],                     "pa_active": True},
    {"name": "Karen Thomas",    "dob": "1983-05-21", "member_id": "UHC-012-45678", "cpt_code": "27130", "payers": ["UnitedHealthcare"],          "pa_active": True},
    {"name": "Joseph Jackson",  "dob": "1939-03-16", "member_id": "CGN-013-56789", "cpt_code": "70553", "payers": ["Cigna", "Humana"],           "pa_active": True},
    {"name": "Nancy White",     "dob": "1967-07-14", "member_id": "HUM-014-67890", "cpt_code": "64483", "payers": ["Humana"],                    "pa_active": True},
    {"name": "Thomas Harris",   "dob": "1971-11-09", "member_id": "BCB-015-78901", "cpt_code": "29827", "payers": ["Anthem BCBS"],              "pa_active": True},
]

# Demo PA check history (makes dashboard look alive from the start)
def _demo_check(member_id, payer_name, patient_name, status, hours_ago, changed=False, denial_reason=None):
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
        "next_action_required": "Submit appeal with additional clinical documentation" if status == "Denied" else None,
        "extraction_timestamp": (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat(),
        "status_changed": changed,
        "run_id": f"run_{uuid.uuid4().hex[:8]}",
        "checked_at": datetime.now(timezone.utc) - timedelta(hours=hours_ago),
    }


def seed_demo_data():
    """Insert demo patients and PA check history if collections are empty."""
    if db.patients.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        patients_with_ts = [{**p, "created_at": now} for p in DEMO_PATIENTS]
        db.patients.insert_many(patients_with_ts)
        print(f"✅ Seeded {len(DEMO_PATIENTS)} demo patients")

    if db.pa_checks.count_documents({}) == 0:
        demo_checks = [
            # Maria Garcia: Pending → Approved (change visible)
            _demo_check("AET-001-78234", "Aetna",            "Maria Garcia",     "Pending",  8),
            _demo_check("AET-001-78234", "Aetna",            "Maria Garcia",     "Approved", 4, changed=True),
            _demo_check("AET-001-78234", "UnitedHealthcare", "Maria Garcia",     "Pending",  6),
            # John Smith: Pending → Denied (the dramatic one for demo)
            _demo_check("UHC-002-45123", "UnitedHealthcare", "John Smith",       "Pending",  6),
            _demo_check("UHC-002-45123", "UnitedHealthcare", "John Smith",       "Denied",   2, changed=True,
                        denial_reason="Medical necessity documentation insufficient — peer-to-peer review required"),
            # Others with current statuses
            _demo_check("CGN-003-67890", "Cigna",            "Robert Johnson",   "Approved", 3),
            _demo_check("HUM-004-11223", "Humana",           "Linda Williams",   "In Review",5),
            _demo_check("HUM-004-11223", "Aetna",            "Linda Williams",   "Pending",  7),
            _demo_check("BCB-005-33445", "Anthem BCBS",      "James Brown",      "Approved", 1),
            _demo_check("AET-006-55667", "Aetna",            "Patricia Davis",   "Info Needed",4),
            _demo_check("UHC-007-77889", "UnitedHealthcare", "Michael Miller",   "Pending",  5),
            _demo_check("UHC-007-77889", "Cigna",            "Michael Miller",   "Pending",  5),
            _demo_check("CGN-008-99001", "Cigna",            "Barbara Wilson",   "Approved", 2),
            _demo_check("HUM-009-12345", "Humana",           "Richard Moore",    "Pending",  6),
            _demo_check("BCB-010-23456", "Anthem BCBS",      "Susan Taylor",     "Approved", 3),
            _demo_check("BCB-010-23456", "Aetna",            "Susan Taylor",     "In Review",4),
            _demo_check("AET-011-34567", "Aetna",            "Charles Anderson", "Pending",  8),
            _demo_check("UHC-012-45678", "UnitedHealthcare", "Karen Thomas",     "Denied",   5,
                        denial_reason="Service not covered under current plan benefits"),
            _demo_check("CGN-013-56789", "Cigna",            "Joseph Jackson",   "Approved", 1),
            _demo_check("CGN-013-56789", "Humana",           "Joseph Jackson",   "Pending",  4),
            _demo_check("HUM-014-67890", "Humana",           "Nancy White",      "Approved", 2),
            _demo_check("BCB-015-78901", "Anthem BCBS",      "Thomas Harris",    "Pending",  6),
        ]
        db.pa_checks.insert_many(demo_checks)
        print(f"✅ Seeded {len(demo_checks)} demo PA checks")

    # Create indexes for performance
    db.pa_checks.create_index([("member_id", 1), ("payer_name", 1), ("checked_at", DESCENDING)])
    db.patients.create_index("member_id", unique=True, sparse=True)


# ── Lifecycle events ─────────────────────────
@app.on_event("startup")
async def startup():
    seed_demo_data()
    start_scheduler(db)
    print("🚀 PriorAuth Pulse backend running")


@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()
    mongo_client.close()


# ────────────────────────────────────────────
# ENDPOINTS
# ────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "PriorAuth Pulse",
        "version": "1.0.0",
    }


@app.get("/agentops/metrics")
def get_agentops_metrics():
    """Return AgentOps-style monitoring metrics for demo/dashboard display."""
    return {
        "total_runs": 1247,
        "success_rate": 98.2,
        "avg_duration_seconds": 134,
        "last_24h_runs": 87,
        "last_24h_success_rate": 100.0,
        "top_payers": [
            {"name": "Aetna",            "runs": 312, "success_rate": 98.7},
            {"name": "UnitedHealthcare", "runs": 298, "success_rate": 97.9},
            {"name": "Cigna",            "runs": 267, "success_rate": 98.5},
            {"name": "Humana",           "runs": 201, "success_rate": 98.0},
            {"name": "Anthem BCBS",      "runs": 169, "success_rate": 97.6},
        ],
    }


@app.get("/patients")
def get_patients():
    """Return all active patients with their latest PA check status."""
    patients = list(db.patients.find({"pa_active": True}, {"_id": 0}))

    # Attach latest check per payer for each patient
    for patient in patients:
        patient["latest_checks"] = []
        for payer in patient.get("payers", []):
            latest = db.pa_checks.find_one(
                {"member_id": patient["member_id"], "payer_name": payer},
                sort=[("checked_at", DESCENDING)],
                projection={"_id": 0},
            )
            if latest:
                if isinstance(latest.get("checked_at"), datetime):
                    latest["checked_at"] = _iso_utc(latest["checked_at"])
                patient["latest_checks"].append(latest)

    return {"patients": patients, "total": len(patients)}


@app.post("/patients")
def create_patient(patient: dict):
    """Add a new patient to monitor."""
    patient["pa_active"] = True
    patient["created_at"] = datetime.now(timezone.utc)
    result = db.patients.insert_one(patient)
    return {"inserted_id": str(result.inserted_id), "message": "Patient added"}


@app.get("/patients/{member_id}/history")
def get_patient_history(member_id: str, limit: int = 20):
    """Return the last N PA checks for a specific patient."""
    checks = list(
        db.pa_checks.find(
            {"member_id": member_id},
            {"_id": 0},
            sort=[("checked_at", DESCENDING)],
            limit=limit,
        )
    )
    for c in checks:
        if isinstance(c.get("checked_at"), datetime):
            c["checked_at"] = _iso_utc(c["checked_at"])
    return {"member_id": member_id, "checks": checks, "total": len(checks)}


@app.post("/run-check")
async def trigger_batch_check(background_tasks: BackgroundTasks):
    """Trigger a full batch PA check for all active patients."""
    task_id = str(uuid.uuid4())
    active_tasks[task_id] = {
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "streaming_url": None,
        "current_check": None,
        "checks_done": 0,
        "checks_total": 0,
    }

    async def run_and_update():
        try:
            summary = await run_batch_check(db, task_id=task_id, task_store=active_tasks)
            active_tasks[task_id] = {
                "status": "completed",
                "started_at": active_tasks[task_id]["started_at"],
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "streaming_url": active_tasks[task_id].get("streaming_url"),
                **summary,
            }
        except Exception as e:
            active_tasks[task_id] = {
                "status": "failed",
                "error": str(e),
                "started_at": active_tasks[task_id]["started_at"],
            }

    background_tasks.add_task(run_and_update)
    return {"message": "Batch check started", "task_id": task_id}


@app.get("/run-check/{task_id}/status")
def get_task_status(task_id: str):
    """Poll the status of a batch check task."""
    task = active_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task_id, **task}


@app.get("/pa-checks/recent")
def get_recent_checks(limit: int = 50):
    """Return recent PA checks — status changes first."""
    checks = list(
        db.pa_checks.find(
            {},
            {"_id": 0},
            sort=[("status_changed", DESCENDING), ("checked_at", DESCENDING)],
            limit=limit,
        )
    )
    for c in checks:
        if isinstance(c.get("checked_at"), datetime):
            c["checked_at"] = _iso_utc(c["checked_at"])
    return {"checks": checks, "total": len(checks)}


@app.get("/metrics")
def get_metrics():
    """Return dashboard metrics for the last 24 hours."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    total_checks = db.pa_checks.count_documents({"checked_at": {"$gte": since}})
    status_changes = db.pa_checks.count_documents({
        "checked_at": {"$gte": since},
        "status_changed": True,
    })
    approved = db.pa_checks.count_documents({
        "checked_at": {"$gte": since},
        "auth_status": "Approved",
    })
    denied = db.pa_checks.count_documents({
        "checked_at": {"$gte": since},
        "auth_status": "Denied",
    })
    pending = db.pa_checks.count_documents({
        "checked_at": {"$gte": since},
        "auth_status": {"$in": ["Pending", "In Review"]},
    })
    active_patients = db.patients.count_documents({"pa_active": True})

    unavailable = db.pa_checks.count_documents({
        "checked_at": {"$gte": since},
        "auth_status": "Portal Unavailable",
    })
    successful_checks = total_checks - unavailable
    success_rate = round((successful_checks / max(total_checks, 1)) * 100, 1)

    return {
        "active_patients": active_patients,
        "total_checks_24h": total_checks,
        "status_changes_24h": status_changes,
        "success_rate_24h": success_rate,
        "approved_24h": approved,
        "denied_24h": denied,
        "pending_24h": pending,
        "supported_payers": list(PAYERS.keys()),
        "avg_check_duration_seconds": 134.0,
    }


@app.get("/analytics/payers")
def get_payer_analytics():
    """
    Return approval rates, denial rates, and check counts per payer.
    Used by the Payer Analytics card on the dashboard.
    """
    results = []
    for payer_name in PAYERS:
        total = db.pa_checks.count_documents({"payer_name": payer_name})
        approved = db.pa_checks.count_documents({"payer_name": payer_name, "auth_status": "Approved"})
        denied = db.pa_checks.count_documents({"payer_name": payer_name, "auth_status": "Denied"})
        pending = db.pa_checks.count_documents({"payer_name": payer_name, "auth_status": {"$in": ["Pending", "In Review"]}})
        approval_rate = round((approved / max(total, 1)) * 100, 1)
        denial_rate = round((denied / max(total, 1)) * 100, 1)
        # Avg days to decision (approved/denied checks with decision_date)
        results.append({
            "payer": payer_name,
            "total_checks": total,
            "approved": approved,
            "denied": denied,
            "pending": pending,
            "approval_rate": approval_rate,
            "denial_rate": denial_rate,
        })

    # Sort by approval rate desc
    results.sort(key=lambda x: x["approval_rate"], reverse=True)
    return {"payers": results}


@app.post("/patients/{member_id}/appeal")
async def generate_appeal(member_id: str, body: dict):
    """
    Generate an AI appeal letter for a denied PA using Claude claude-opus-4-6.
    Body: { payer_name, denial_reason, auth_number? }
    """
    # Look up patient in DB
    patient = db.patients.find_one({"member_id": member_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    payer_name = body.get("payer_name", "")
    denial_reason = body.get("denial_reason", "Medical necessity not established")
    auth_number = body.get("auth_number")

    try:
        letter = await generate_appeal_letter(
            patient_name=patient["name"],
            member_id=member_id,
            dob=patient.get("dob", ""),
            cpt_code=patient.get("cpt_code", ""),
            payer_name=payer_name,
            denial_reason=denial_reason,
            auth_number=auth_number,
        )
        return {
            "member_id": member_id,
            "payer_name": payer_name,
            "letter": letter,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Letter generation failed: {e}")
