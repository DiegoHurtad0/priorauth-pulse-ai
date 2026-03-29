"""
burn_demo_runs.py — Consume TinyFish credits with real agent runs.

Runs NUM_BATCHES sequential batch checks, each launching one TinyFish agent
per patient × payer combination.  Every extraction is saved in TWO places:

  1. MongoDB  → db.pa_checks  (real-time, via core.py)
  2. Parquet  → data/pa_checks_<timestamp>.parquet  (offline backup)

Usage (from backend/ directory):
    python scripts/burn_demo_runs.py

Environment required (backend/.env):
    TINYFISH_API_KEY
    MONGO_URI
"""

import asyncio
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# ── Path setup ─────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

import pandas as pd
from pymongo import MongoClient

from app.core import run_batch_check, PAYERS

# ── Config ──────────────────────────────────────────────────────────────────
# Each batch checks every active patient × payer (~75 checks with seeded data).
# 75 checks × 2 batches × 100 avg steps ≈ 15,000 steps (of 16,500 available).
NUM_BATCHES = 2
DELAY_BETWEEN_BATCHES_SEC = 10

# Parquet output directory (backend/data/)
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# ── MongoDB ──────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["priorauth_pulse"]


# ── Parquet helpers ───────────────────────────────────────────────────────────
def _fetch_recent_checks(limit: int) -> list[dict]:
    """Pull the most recent PA check docs from MongoDB (for Parquet export)."""
    return list(
        db.pa_checks.find(
            {},
            {
                "_id": 0,
                "member_id": 1,
                "patient_name": 1,
                "payer_name": 1,
                "auth_status": 1,
                "auth_number": 1,
                "decision_date": 1,
                "expiration_date": 1,
                "denial_reason": 1,
                "next_action_required": 1,
                "run_id": 1,
                "streaming_url": 1,
                "status_changed": 1,
                "checked_at": 1,
            },
            sort=[("checked_at", -1)],
            limit=limit,
        )
    )


def save_parquet(docs: list[dict], label: str) -> Path | None:
    """Convert a list of PA check dicts to a Parquet file and return its path."""
    if not docs:
        print("  ⚠️  No docs to save — skipping Parquet")
        return None

    df = pd.DataFrame(docs)

    # Normalise datetime columns so pyarrow serialises cleanly
    for col in ("checked_at", "decision_date", "expiration_date"):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce", utc=True)

    # Cast object columns to str (handles ObjectId, None, etc.)
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).replace("None", pd.NA)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = DATA_DIR / f"pa_checks_{label}_{ts}.parquet"
    df.to_parquet(path, engine="pyarrow", index=False, compression="snappy")
    kb = path.stat().st_size // 1024
    print(f"  💾 Parquet saved → {path}  ({len(df)} rows, {kb} KB)")
    return path


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
    print(f"  API key   : {api_key[:24]}…")
    print(f"  Patients  : {patient_count} active")
    print(f"  Payers    : {len(PAYERS)}  ({', '.join(PAYERS.keys())})")
    print(f"  Batches   : {NUM_BATCHES}")
    print(f"  Total runs: {total_checks} TinyFish agent calls")
    print(f"  Est. steps: ~{total_checks * 100:,} – {total_checks * 150:,}")
    print(f"  Storage   : MongoDB  +  Parquet → {DATA_DIR}/")
    print("=" * 65)

    grand_success = 0
    grand_failed = 0
    parquet_paths: list[Path] = []

    for batch_num in range(1, NUM_BATCHES + 1):
        print(f"\n{'─' * 65}")
        print(f"  BATCH {batch_num}/{NUM_BATCHES}  —  {datetime.now(timezone.utc).strftime('%H:%M:%S UTC')}")
        print(f"{'─' * 65}")

        t0 = time.time()
        summary = await run_batch_check(db)
        elapsed = time.time() - t0

        grand_success += summary.get("success", 0)
        grand_failed += summary.get("failed", 0)

        print(f"\n  ✅ Batch {batch_num} done in {elapsed:.0f}s")
        print(f"     Successful: {summary.get('success', 0)} / {summary.get('total', 0)}")

        # ── Save this batch to Parquet ─────────────────────────────────────
        recent = _fetch_recent_checks(checks_per_batch)
        path = save_parquet(recent, label=f"batch{batch_num}")
        if path:
            parquet_paths.append(path)

        # Show sample run_ids so it's clear real agents ran
        real_runs = [d for d in recent if d.get("run_id")]
        if real_runs:
            print(f"\n  🔗 Sample run_ids (real TinyFish agents):")
            for d in real_runs[:4]:
                print(f"     {d['run_id']}  →  {d['payer_name']} / {d.get('auth_status', '?')}")
            if len(real_runs) > 4:
                print(f"     … and {len(real_runs) - 4} more")

        replay_urls = [d["streaming_url"] for d in recent if d.get("streaming_url")]
        if replay_urls:
            print(f"\n  🎥 Live replay URLs:")
            for url in replay_urls[:3]:
                print(f"     {url}")

        if batch_num < NUM_BATCHES:
            print(f"\n  ⏸  Pausing {DELAY_BETWEEN_BATCHES_SEC}s before next batch…")
            await asyncio.sleep(DELAY_BETWEEN_BATCHES_SEC)

    # ── Merge all batches into one master Parquet ──────────────────────────
    if parquet_paths:
        all_docs = _fetch_recent_checks(total_checks + 50)
        master_path = save_parquet(all_docs, label="ALL_BATCHES")
        if master_path:
            print(f"\n  📦 Master Parquet (all batches merged) → {master_path}")

    # ── Final summary ──────────────────────────────────────────────────────
    total_mongo = db.pa_checks.count_documents({})
    print(f"\n{'=' * 65}")
    print("  FINAL SUMMARY")
    print(f"{'=' * 65}")
    print(f"  Total TinyFish agent runs  : {total_checks}")
    print(f"  Successful extractions     : {grand_success}")
    print(f"  Failed / Portal Unavail    : {grand_failed}")
    print(f"  Total docs in MongoDB      : {total_mongo}")
    print(f"  Parquet files written      : {len(parquet_paths) + (1 if parquet_paths else 0)}")
    print()
    print("  📊 View results:")
    print("     Dashboard  → http://localhost:3000/dashboard")
    print("     API docs   → http://localhost:8000/docs")
    print("     PA checks  → http://localhost:8000/pa-checks?limit=100")
    print(f"     Parquet    → {DATA_DIR}/")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(main())
