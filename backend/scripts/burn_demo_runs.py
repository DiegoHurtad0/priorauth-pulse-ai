"""
burn_demo_runs.py — Consume TinyFish credits with real agent runs.

Runs NUM_BATCHES sequential batch checks, each launching one TinyFish agent
per patient × payer combination.  All results (run_ids, streaming_urls,
auth_status) are written to MongoDB so judges can see real data in the dashboard.

Usage (from backend/ directory):
    python scripts/burn_demo_runs.py

Environment required:
    TINYFISH_API_KEY — in backend/.env
    MONGO_URI        — in backend/.env
"""

import asyncio
import os
import sys
import time
from datetime import datetime, timezone

# ── Path setup ─────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from pymongo import MongoClient
from app.core import run_batch_check, PAYERS

# ── Config ──────────────────────────────────────────────────────────────────
# Each batch checks every active patient × payer (~75 checks with the seeded data).
# Adjust to match how many steps you want to consume.
# Rough estimate: each TinyFish run = 80–150 steps on portal navigation.
#   75 checks × 2 batches × 100 avg steps = ~15,000 steps → almost all 16.5K credits.
NUM_BATCHES = 2
DELAY_BETWEEN_BATCHES_SEC = 10   # brief pause between batches

# ── MongoDB ──────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["priorauth_pulse"]


# ── Main ─────────────────────────────────────────────────────────────────────
async def main():
    api_key = os.getenv("TINYFISH_API_KEY", "")
    if not api_key or api_key.startswith("sk-tinyfish-your"):
        print("❌  TINYFISH_API_KEY not set in .env — aborting")
        sys.exit(1)

    patient_count = db.patients.count_documents({"pa_active": True})
    checks_per_batch = patient_count * len(PAYERS)
    total_checks = NUM_BATCHES * checks_per_batch

    print("=" * 65)
    print("  PriorAuth Pulse — TinyFish Credit Burn Script")
    print("=" * 65)
    print(f"  API key  : {api_key[:24]}…")
    print(f"  Patients : {patient_count} active")
    print(f"  Payers   : {len(PAYERS)} ({', '.join(PAYERS.keys())})")
    print(f"  Batches  : {NUM_BATCHES}")
    print(f"  Total runs: {total_checks} TinyFish agent calls")
    print(f"  Est. steps: ~{total_checks * 100:,} – {total_checks * 150:,}")
    print("=" * 65)
    print()

    grand_success = 0
    grand_failed = 0
    all_run_ids: list[str] = []
    all_streaming_urls: list[str] = []

    for batch_num in range(1, NUM_BATCHES + 1):
        print(f"\n{'─' * 65}")
        print(f"  BATCH {batch_num}/{NUM_BATCHES}  —  {datetime.now(timezone.utc).strftime('%H:%M:%S UTC')}")
        print(f"{'─' * 65}")

        t0 = time.time()
        summary = await run_batch_check(db)
        elapsed = time.time() - t0

        grand_success += summary.get("success", 0)
        grand_failed += summary.get("failed", 0)

        # Collect real run_ids and streaming_urls written to MongoDB
        recent_checks = list(
            db.pa_checks.find(
                {"run_id": {"$ne": None}},
                {"run_id": 1, "streaming_url": 1, "payer_name": 1, "patient_name": 1, "auth_status": 1},
                sort=[("checked_at", -1)],
                limit=checks_per_batch,
            )
        )
        batch_run_ids = [c["run_id"] for c in recent_checks if c.get("run_id")]
        batch_urls = [c["streaming_url"] for c in recent_checks if c.get("streaming_url")]
        all_run_ids.extend(batch_run_ids)
        all_streaming_urls.extend(batch_urls)

        print(f"\n  ✅ Batch {batch_num} done in {elapsed:.0f}s")
        print(f"     Success: {summary.get('success', 0)} / {summary.get('total', 0)}")
        print(f"     Real run_ids captured: {len(batch_run_ids)}")
        print(f"     Live replay URLs: {len(batch_urls)}")

        if batch_run_ids:
            for rid in batch_run_ids[:3]:
                print(f"       run_id: {rid}")
            if len(batch_run_ids) > 3:
                print(f"       … and {len(batch_run_ids) - 3} more")

        if batch_urls:
            for url in batch_urls[:2]:
                print(f"       replay: {url}")

        if batch_num < NUM_BATCHES:
            print(f"\n  ⏸  Pausing {DELAY_BETWEEN_BATCHES_SEC}s before next batch…")
            await asyncio.sleep(DELAY_BETWEEN_BATCHES_SEC)

    # ── Final summary ────────────────────────────────────────────────────────
    print(f"\n{'=' * 65}")
    print("  FINAL SUMMARY")
    print(f"{'=' * 65}")
    print(f"  Total TinyFish agent runs : {total_checks}")
    print(f"  Successful extractions    : {grand_success}")
    print(f"  Failed / Portal Unavail   : {grand_failed}")
    print(f"  Unique run_ids in MongoDB : {len(set(all_run_ids))}")
    print(f"  Live replay URLs captured : {len(set(all_streaming_urls))}")
    print()
    print("  📊 View results:")
    print("     Dashboard  → http://localhost:3000/dashboard")
    print("     API docs   → http://localhost:8000/docs")
    print("     PA checks  → http://localhost:8000/pa-checks?limit=100")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(main())
