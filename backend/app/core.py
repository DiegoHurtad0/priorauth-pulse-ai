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
    Build the TinyFish goal prompt for a specific patient × payer check.
    Follows TinyFish Prompting Guide best practices:
    - Specific steps (not vague)
    - Strict JSON schema
    - Edge case handling
    - Guardrails (what NOT to do)
    """
    return f"""You are navigating a health insurance payer portal to check the status of a prior authorization request.

Steps:
1. Log in using the credentials provided via vault
2. Navigate to the "Prior Authorization" or "Authorization Status" section
3. Search for the patient using this information:
   - Patient Name: {patient['name']}
   - Date of Birth: {patient['dob']}
   - Member ID: {patient['member_id']}
4. Locate the most recent prior authorization request for CPT code: {patient['cpt_code']}
5. Extract the authorization details listed below

Required fields to extract:
- auth_status: one of exactly: "Approved", "Pending", "Denied", "Info Needed", "In Review", "Expired"
- auth_number: the authorization reference number if approved/denied (string or null)
- decision_date: date in YYYY-MM-DD format (or null)
- expiration_date: date in YYYY-MM-DD format (or null)
- requesting_provider: name of the requesting provider (or null)
- service_description: brief description of the service being authorized (or null)
- denial_reason: detailed reason if status is "Denied" (or null)
- next_action_required: what the provider needs to do next, if anything (or null)

Edge cases — handle these automatically:
- If a cookie banner or consent popup appears: close or dismiss it immediately before proceeding
- If MFA is required: complete the MFA step using the authenticator credentials from vault
- If the patient has multiple PA requests: select the one matching CPT code {patient['cpt_code']}
- If no PA is found for this patient: return auth_status as "Not Found"
- If the portal shows a maintenance or unavailability page: return auth_status as "Portal Unavailable"
- If the session expires mid-navigation: attempt re-login once, then return "Portal Unavailable" if it fails

Return ONLY this JSON (no extra text or explanation):
{{
  "patient_name": "{patient['name']}",
  "member_id": "{patient['member_id']}",
  "payer_name": "{payer['name']}",
  "auth_status": "string",
  "auth_number": "string or null",
  "decision_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null",
  "requesting_provider": "string or null",
  "service_description": "string or null",
  "denial_reason": "string or null",
  "next_action_required": "string or null",
  "extraction_timestamp": "ISO 8601 timestamp"
}}

IMPORTANT GUARDRAILS:
- Do NOT click any "Submit New Authorization" or "Request New Auth" buttons
- Do NOT click any "Cancel Authorization" or "Withdraw" buttons
- Do NOT modify any existing authorization data
- Do NOT navigate to any section unrelated to authorization status lookup
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
