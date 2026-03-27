"""
notifications.py — Slack alerts via Composio webhook
Falls back to console print if COMPOSIO_WEBHOOK_URL is not set.
"""

import os
from typing import Optional

import httpx

from app.diff_engine import format_alert_message


COMPOSIO_WEBHOOK_URL = os.getenv("COMPOSIO_WEBHOOK_URL", "")


async def send_slack_alert(message: str) -> bool:
    """
    POST a Slack message via Composio webhook.
    Returns True on success, False on failure.
    If COMPOSIO_WEBHOOK_URL is not configured, prints to console instead.
    """
    if not COMPOSIO_WEBHOOK_URL:
        print(f"\n📣 [ALERT — no webhook configured]\n{message}\n")
        return True

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                COMPOSIO_WEBHOOK_URL,
                json={"text": message},
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            print(f"  📣 Slack alert sent successfully")
            return True
    except Exception as e:
        print(f"  ⚠️  Failed to send Slack alert: {e}")
        return False


async def send_status_change_alert(
    patient: dict,
    payer_name: str,
    old_status: Optional[str],
    new_status: str,
    denial_reason: Optional[str] = None,
) -> bool:
    """
    Format and send a PA status change alert.
    Called automatically by core.py when a status change is detected.
    """
    message = format_alert_message(
        patient=patient,
        payer_name=payer_name,
        old_status=old_status,
        new_status=new_status,
        denial_reason=denial_reason,
    )
    return await send_slack_alert(message)
