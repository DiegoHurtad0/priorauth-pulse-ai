"""
core.py — TinyFish PA status checker
Handles: auth, MFA, multi-step navigation, SSE events, status change detection
"""

import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional

from tinyfish import TinyFish
from pymongo.database import Database

from app.models import PACheck, Patient
from app.notifications import send_status_change_alert

# ─────────────────────────────────────────────
# Payer configuration
# ─────────────────────────────────────────────

PAYERS: dict[str, dict] = {
    "Aetna": {
        "name": "Aetna",
        "url": "https://availity.com",
        "vault_id": "cred_aetna",
        "profile": "stealth",
    },
    "UnitedHealthcare": {
        "name": "UnitedHealthcare",
        "url": "https://uhcprovider.com",
        "vault_id": "cred_uhc",
        "profile": "stealth",
    },
    "Cigna": {
        "name": "Cigna",
        "url": "https://cignaforhcp.cigna.com",
        "vault_id": "cred_cigna",
        "profile": "stealth",
    },
    "Humana": {
        "name": "Humana",
        "url": "https://availity.com",
        "vault_id": "cred_humana",
        "profile": "stealth",
    },
    "Anthem BCBS": {
        "name": "Anthem BCBS",
        "url": "https://availity.com",
        "vault_id": "cred_anthem",
        "profile": "stealth",
    },
}


# ─────────────────────────────────────────────
# Goal prompt builder
# ─────────────────────────────────────────────

def build_goal(patient: dict, payer: dict) -> str:
    """
    Level 3 Production-ready TinyFish goal prompt.
    Built following TinyFish Prompting Guide best practices:
    - Specific navigation steps with visual element cues (4.9× faster than vague goals)
    - Strict JSON schema with field types (16× less unnecessary data)
    - Cross-step memory instructions
    - Explicit termination condition
    - Comprehensive edge case handling
    - Clear guardrails (what NOT to do)
    """
    return f"""# OBJECTIVE
Retrieve the current prior authorization (PA) status for one specific patient from the {payer['name']} provider portal. Extract all structured fields and return them as a single JSON object. Do not perform any other action.

# TARGET
Site: {payer['url']}
Payer: {payer['name']}
Portal type: Health insurance provider portal with authenticated login

# PATIENT IDENTITY
- Full Name: {patient['name']}
- Date of Birth: {patient['dob']}
- Member ID: {patient['member_id']}
- CPT Code to match: {patient['cpt_code']}

# NAVIGATION STEPS
Step 1 — LOGIN
  Log in using vault credentials. If a cookie banner, privacy notice, or consent popup appears, close or dismiss it immediately before proceeding. If a "session expired" or "login again" message appears, re-login once using vault credentials.

Step 2 — MFA (if required)
  If multi-factor authentication is required, complete it using the authenticator credentials stored in vault. Remember any verification code you enter — you may need to reference it.

Step 3 — LOCATE PRIOR AUTHORIZATION SECTION
  Navigate to the section labeled "Prior Authorization", "Authorization Status", "Auth Status", or "Prior Auth Lookup". This is usually found in the main navigation under "Clinical", "Patient", or "Authorization" tabs.

Step 4 — SEARCH FOR PATIENT
  Search using Member ID "{patient['member_id']}" first. If no results, try searching by Full Name "{patient['name']}" combined with Date of Birth "{patient['dob']}". Use exact values — do not abbreviate.

Step 5 — IDENTIFY THE CORRECT PA REQUEST
  If multiple PA requests exist for this patient, select the most recent one that matches CPT code {patient['cpt_code']}. If CPT code is not displayed, match by service description or procedure name.

Step 6 — EXTRACT ALL FIELDS
  On the PA detail page, extract every field listed in the OUTPUT SCHEMA section below. For each field, read the exact value displayed — do not infer or paraphrase.

# TERMINATION CONDITION
Stop navigating as soon as you have extracted all required fields from Step 6. Do not continue browsing after extraction is complete.

# OUTPUT SCHEMA
Return ONLY this JSON object — no preamble, no explanation, no markdown:
{{
  "patient_name": "{patient['name']}",
  "member_id": "{patient['member_id']}",
  "payer_name": "{payer['name']}",
  "auth_status": "<ENUM: Approved | Pending | Denied | Info Needed | In Review | Expired | Not Found | Portal Unavailable>",
  "auth_number": "<string: authorization reference number, or null if not yet assigned>",
  "decision_date": "<string: YYYY-MM-DD format, or null>",
  "expiration_date": "<string: YYYY-MM-DD format, or null>",
  "requesting_provider": "<string: name of the requesting/ordering provider, or null>",
  "service_description": "<string: brief description of the authorized service/procedure, or null>",
  "denial_reason": "<string: full denial reason text if status is Denied, or null>",
  "next_action_required": "<string: what the provider must do next (e.g. submit peer-to-peer, provide clinical notes), or null>",
  "extraction_timestamp": "<string: current UTC datetime in ISO 8601 format>"
}}

# EDGE CASES — handle automatically
- Cookie/consent banner: dismiss immediately before any other action
- MFA required: complete using vault authenticator credentials
- Session timeout mid-navigation: attempt one re-login, then return auth_status "Portal Unavailable"
- Multiple PA requests for same patient: use CPT code {patient['cpt_code']} to identify the correct one
- PA request not found: return auth_status "Not Found", all other fields null
- Portal maintenance or error page: return auth_status "Portal Unavailable", all other fields null
- Partial data (some fields missing from portal): return available fields, null for missing ones
- Date displayed in M/D/YYYY format: convert to YYYY-MM-DD in output

# GUARDRAILS — strict prohibitions
- Do NOT click "Submit New Authorization", "Request New Auth", or any button that creates a new PA
- Do NOT click "Cancel Authorization", "Withdraw Request", or any destructive action
- Do NOT modify, update, or edit any existing authorization data
- Do NOT navigate to sections unrelated to authorization status lookup
- Do NOT submit any forms other than the patient search form
"""


# ─────────────────────────────────────────────
# Single PA check
# ─────────────────────────────────────────────

async def check_pa_status(
    patient: dict,
    payer_name: str,
    db: Database,
    task_id: Optional[str] = None,
    task_store: Optional[dict] = None,
) -> Optional[dict]:
    """
    Run a TinyFish SSE agent to check PA status for one patient × payer.
    - Streams events to console (STREAMING_URL visible for demo)
    - Detects status changes vs previous MongoDB entry
    - Inserts result into db.pa_checks
    - Triggers Slack alert if status changed
    """
    payer = PAYERS.get(payer_name)
    if not payer:
        print(f"  ⚠️  Unknown payer: {payer_name}")
        return None

    tf_client = TinyFish()
    goal = build_goal(patient, payer)
    result: Optional[dict] = None
    run_id: Optional[str] = None
    streaming_url: Optional[str] = None

    print(f"\n  ▶ Checking {payer_name} for {patient['name']} ({patient['member_id']})")

    try:
        with tf_client.agent.stream(
            url=payer["url"],
            goal=goal,
            browser_profile=payer["profile"],
            use_vault=True,
            credential_item_ids=[payer["vault_id"]],
            proxy_config={"enabled": True, "country_code": "US"},
            feature_flags={"enable_agent_memory": True},
        ) as stream:
            for event in stream:
                event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)

                if event_type == "STARTED":
                    run_id = event.get("run_id") if isinstance(event, dict) else getattr(event, "run_id", None)
                    print(f"  🚀 Started — run_id: {run_id}")

                elif event_type == "STREAMING_URL":
                    url = event.get("streaming_url") if isinstance(event, dict) else getattr(event, "url", None)
                    streaming_url = url  # persist to MongoDB doc
                    print(f"  🔴 LIVE BROWSER: {url}")
                    if task_id and task_store and task_id in task_store:
                        task_store[task_id]["streaming_url"] = url
                        task_store[task_id]["current_check"] = f"{patient['name']} — {payer_name}"

                elif event_type == "PROGRESS":
                    purpose = event.get("purpose") if isinstance(event, dict) else getattr(event, "action_description", "")
                    print(f"  ⏳ {purpose}")

                elif event_type == "COMPLETE":
                    raw = event.get("result") if isinstance(event, dict) else getattr(event, "result_json", None)
                    if isinstance(raw, str):
                        result = json.loads(raw)
                    elif isinstance(raw, dict):
                        result = raw

    except Exception as e:
        print(f"  ❌ TinyFish error for {payer_name}/{patient['member_id']}: {e}")
        return None

    if not result:
        print(f"  ⚠️  No result returned for {payer_name}/{patient['member_id']}")
        return None

    # ── Detect status change ──────────────────
    prev = db.pa_checks.find_one(
        {"member_id": patient["member_id"], "payer_name": payer_name},
        sort=[("checked_at", -1)],
    )
    old_status = prev.get("auth_status") if prev else None
    new_status = result.get("auth_status")
    status_changed = bool(prev and old_status != new_status)

    # ── Persist to MongoDB ────────────────────
    doc: PACheck = {
        **result,
        "payer_name": payer_name,
        "patient_name": patient["name"],
        "member_id": patient["member_id"],
        "status_changed": status_changed,
        "run_id": run_id,
        "streaming_url": streaming_url,  # TinyFish replay URL for observability
        "checked_at": datetime.now(timezone.utc),
    }
    db.pa_checks.insert_one(doc)

    # ── Alert on change ───────────────────────
    if status_changed:
        print(f"  🔔 STATUS CHANGE: {patient['name']} on {payer_name}: {old_status} → {new_status}")
        await send_status_change_alert(
            patient=patient,
            payer_name=payer_name,
            old_status=old_status,
            new_status=new_status,
            denial_reason=result.get("denial_reason"),
        )

    print(f"  ✅ {payer_name}: {new_status} (changed={status_changed})")
    return result


# ─────────────────────────────────────────────
# Batch check — all active patients × all their payers
# ─────────────────────────────────────────────

async def run_batch_check(
    db: Database,
    task_id: Optional[str] = None,
    task_store: Optional[dict] = None,
) -> dict:
    """
    Run PA checks for every active patient across all their assigned payers.
    Executes all checks concurrently via asyncio.gather().
    Returns a summary dict with success/failure counts.
    """
    patients = list(db.patients.find({"pa_active": True}))
    if not patients:
        return {"total": 0, "success": 0, "failed": 0, "message": "No active patients"}

    tasks = []
    task_labels = []

    for patient in patients:
        for payer_name in patient.get("payers", []):
            tasks.append(check_pa_status(patient, payer_name, db, task_id=task_id, task_store=task_store))
            task_labels.append(f"{patient['name']} × {payer_name}")

    if task_id and task_store and task_id in task_store:
        task_store[task_id]["checks_total"] = len(tasks)

    total = len(tasks)
    print(f"\n🚀 Starting batch check: {total} PA checks across {len(patients)} patients")
    print(f"   Payers: {list(PAYERS.keys())}\n")

    async def _tracked(coro):
        """Wrap a check coroutine to increment checks_done in task_store."""
        result = await coro
        if task_id and task_store and task_id in task_store:
            task_store[task_id]["checks_done"] = task_store[task_id].get("checks_done", 0) + 1
        return result

    results = await asyncio.gather(*[_tracked(t) for t in tasks], return_exceptions=True)

    success = sum(1 for r in results if isinstance(r, dict) and r is not None)
    failed = total - success
    rate = (success / total * 100) if total > 0 else 0

    print(f"\n✅ Batch complete: {success}/{total} successful ({rate:.1f}%)")
    return {
        "total": total,
        "success": success,
        "failed": failed,
        "success_rate": round(rate, 1),
    }
