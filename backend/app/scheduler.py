"""
scheduler.py — APScheduler cron job: runs batch PA checks every 4 hours
"""

import asyncio
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger


scheduler = AsyncIOScheduler()


def start_scheduler(db):
    """
    Initialize and start the APScheduler.
    Runs run_batch_check() every 4 hours.
    Call this from FastAPI startup event.
    """
    from app.core import run_batch_check  # avoid circular import

    async def scheduled_job():
        start = datetime.now(timezone.utc)
        print(f"\n⏰ [Scheduler] Starting scheduled batch check at {start.isoformat()}")
        try:
            summary = await run_batch_check(db)
            end = datetime.now(timezone.utc)
            elapsed = (end - start).total_seconds()
            print(
                f"⏰ [Scheduler] Batch complete in {elapsed:.1f}s — "
                f"{summary['success']}/{summary['total']} successful "
                f"({summary.get('success_rate', 0)}%)"
            )
        except Exception as e:
            print(f"⏰ [Scheduler] Batch failed with error: {e}")

    scheduler.add_job(
        scheduled_job,
        trigger=IntervalTrigger(hours=4),
        id="pa_batch_check",
        name="PA Batch Check",
        replace_existing=True,
        misfire_grace_time=300,  # 5 minute grace period
    )

    scheduler.start()
    print("✅ Scheduler started — PA checks will run every 4 hours")


def stop_scheduler():
    """Gracefully stop the scheduler on app shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("🛑 Scheduler stopped")
