"""
diff_engine.py — Status change detection and alert message formatting
"""

from typing import Optional


def detect_change(old_check: Optional[dict], new_check: dict) -> dict:
    """
    Compare the previous PA check with the new one.
    Returns a dict describing what changed.
    """
    if not old_check:
        return {"changed": False, "old_status": None, "new_status": new_check.get("auth_status"), "field_changes": []}

    field_changes = []
    fields_to_track = ["auth_status", "auth_number", "decision_date", "expiration_date", "denial_reason"]

    for field in fields_to_track:
        old_val = old_check.get(field)
        new_val = new_check.get(field)
        if old_val != new_val:
            field_changes.append({
                "field": field,
                "old": old_val,
                "new": new_val,
            })

    changed = any(f["field"] == "auth_status" for f in field_changes)

    return {
        "changed": changed,
        "old_status": old_check.get("auth_status"),
        "new_status": new_check.get("auth_status"),
        "field_changes": field_changes,
    }


def format_alert_message(
    patient: dict,
    payer_name: str,
    old_status: Optional[str],
    new_status: str,
    denial_reason: Optional[str] = None,
) -> str:
    """
    Format a human-readable Slack/email alert message for a PA status change.
    """
    emoji = {
        "Approved": "✅",
        "Denied": "❌",
        "Pending": "⏳",
        "Info Needed": "⚠️",
        "In Review": "🔍",
        "Expired": "⏰",
        "Not Found": "❓",
        "Portal Unavailable": "🔴",
    }

    status_emoji = emoji.get(new_status, "📋")
    change_str = f"{old_status} → {new_status}" if old_status else new_status

    lines = [
        f"{status_emoji} *PA Status Change — {payer_name}*",
        f"Patient: {patient.get('name', 'Unknown')} (Member ID: {patient.get('member_id', 'N/A')})",
        f"CPT Code: {patient.get('cpt_code', 'N/A')}",
        f"Status: *{change_str}*",
    ]

    if denial_reason and new_status == "Denied":
        lines.append(f"Denial Reason: _{denial_reason}_")

    lines.append("\n_PriorAuth Pulse — automated PA monitoring_")

    return "\n".join(lines)
