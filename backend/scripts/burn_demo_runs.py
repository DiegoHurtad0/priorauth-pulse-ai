"""
burn_demo_runs.py — Maximum TinyFish step consumption via PUBLIC healthcare sites.

Strategy: use CMS.gov, NPI Registry, FDA, ICD-10, CPT databases — all publicly
accessible with no login wall. Agents navigate freely for 150-300+ steps/run.

Usage:
    cd backend/
    python scripts/burn_demo_runs.py

Run multiple terminals in parallel for maximum burn.
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

import pandas as pd
from pymongo import MongoClient
from tinyfish import TinyFish
from tinyfish.agent.types import (
    BrowserProfile, ProxyConfig, ProxyCountryCode,
    StartedEvent, StreamingUrlEvent, ProgressEvent, CompleteEvent,
)

# ── Config ────────────────────────────────────────────────────────────────────
NUM_BATCHES = 20
DELAY_BETWEEN_BATCHES_SEC = 2
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["priorauth_pulse"]

# ── Public healthcare research tasks ──────────────────────────────────────────
# These sites have NO login wall → agents navigate freely → 150–300 steps/run
PUBLIC_TASKS = [
    {
        "name": "CMS Prior Auth Policy Research",
        "url": "https://www.cms.gov/medical-review/prior-authorization-and-pre-claim-review-initiatives",
        "goal_template": lambda p: f"""# COMPREHENSIVE CMS PRIOR AUTHORIZATION RESEARCH

You are a healthcare policy researcher. Perform a thorough multi-step investigation on CMS.gov about prior authorization for the following patient's procedure:

## PATIENT CONTEXT
- Patient: {p['name']}, DOB: {p['dob']}, Member ID: {p['member_id']}
- CPT Code: {p['cpt_code']}
- Payers involved: {', '.join(p.get('payers', ['Unknown']))}

## RESEARCH TASKS (complete ALL in order)

### Task 1 — CMS PA Policy Overview
Start at https://www.cms.gov/medical-review/prior-authorization-and-pre-claim-review-initiatives
a) Read the full page and identify all prior authorization programs listed
b) Click on each program link and read the details
c) Note which programs apply to CPT code {p['cpt_code']}
d) Record effective dates and applicable service types

### Task 2 — Medicare Coverage Database
Navigate to https://www.cms.gov/medicare-coverage-database/
a) Search for CPT code {p['cpt_code']} in the coverage database
b) Find and open the National Coverage Determination (NCD) if it exists
c) Read the full coverage criteria and indications/limitations
d) Note any Local Coverage Determinations (LCD) listed
e) Record the coverage article number and policy dates

### Task 3 — PA Model Requirements
Navigate to https://www.cms.gov/priorities/key-initiatives/burden-reduction/prior-authorization
a) Find the PA reform requirements that took effect in 2024
b) Read about the 72-hour urgent and 7-day standard decision timelines
c) Identify which payers listed ({', '.join(p.get('payers', ['Unknown']))}) are subject to these rules
d) Note the electronic PA (ePA) transaction requirements

### Task 4 — ICD-10 / CPT Code Reference
Navigate to https://www.cms.gov/medicare/coding-billing/icd-10-codes
a) Look up any ICD-10 codes related to CPT {p['cpt_code']}
b) Navigate to the most recent ICD-10-CM code files
c) Find codes in the range that would justify this procedure
d) Record 3-5 relevant diagnosis codes and their descriptions

### Task 5 — Fee Schedule Research
Navigate to https://www.cms.gov/medicare/payment/fee-schedules/physician
a) Find the Medicare Physician Fee Schedule lookup tool
b) Look up the reimbursement rate for CPT code {p['cpt_code']}
c) Note the national payment amount, facility vs non-facility rates
d) Record the work RVU, practice expense RVU, and malpractice RVU values

## OUTPUT JSON
{{
  "patient_name": "{p['name']}",
  "member_id": "{p['member_id']}",
  "cpt_code": "{p['cpt_code']}",
  "cms_pa_programs_found": ["<list>"],
  "ncd_exists": "<true|false>",
  "ncd_number": "<string or null>",
  "coverage_criteria_summary": "<string>",
  "pa_required_by_cms": "<true|false|unknown>",
  "decision_timeline_urgent_hours": "<number>",
  "decision_timeline_standard_days": "<number>",
  "relevant_icd10_codes": ["<list of codes>"],
  "cpt_work_rvu": "<number or null>",
  "medicare_payment_rate": "<dollar amount or null>",
  "research_timestamp": "<UTC ISO 8601>"
}}
"""
    },
    {
        "name": "NPI Registry Deep Lookup",
        "url": "https://npiregistry.cms.hhs.gov/search",
        "goal_template": lambda p: f"""# NPI REGISTRY COMPREHENSIVE PROVIDER INVESTIGATION

Research all providers and payers associated with patient {p['name']} (Member ID: {p['member_id']}, CPT: {p['cpt_code']}).

## TASK 1 — Provider Search for CPT {p['cpt_code']} Specialists
At https://npiregistry.cms.hhs.gov/search:
a) Search for providers who perform CPT {p['cpt_code']} (use taxonomy search)
b) Filter by state (try CA, TX, NY, FL, IL in sequence)
c) For each state, collect the first 5 results: NPI number, provider name, address, taxonomy
d) Note the taxonomy codes associated with this procedure type

## TASK 2 — Taxonomy Code Deep Dive
a) Navigate to https://nucc.org/index.php/code-sets-mainmenu-41/provider-taxonomy-mainmenu-40
b) Find the taxonomy code(s) for providers who perform CPT {p['cpt_code']}
c) Record the full taxonomy description and classification
d) Note any specialty board certifications typically associated

## TASK 3 — Organization NPI Search
Back at https://npiregistry.cms.hhs.gov/search:
a) Search for Type 2 (Organization) NPIs for each of these payers: {', '.join(p.get('payers', ['Aetna']))}
b) For each payer, record: NPI, legal business name, address, phone, taxonomy
c) Note any EFT/EDI enrollment details visible

## TASK 4 — CMS Certification Numbers
Navigate to https://data.cms.gov/provider-data/
a) Search the provider data catalog for facilities performing CPT {p['cpt_code']}
b) Find the relevant dataset (e.g., physician compare, hospital compare)
c) Download or preview the first page of results
d) Record facility names, CCNs (CMS Certification Numbers), and quality ratings

## OUTPUT JSON
{{
  "patient_name": "{p['name']}",
  "member_id": "{p['member_id']}",
  "cpt_code": "{p['cpt_code']}",
  "specialist_taxonomy_code": "<string>",
  "taxonomy_description": "<string>",
  "sample_providers": [{{"npi": "<>", "name": "<>", "state": "<>", "taxonomy": "<>"}}],
  "payer_npis": [{{"payer": "<>", "npi": "<>", "address": "<>"}}],
  "cms_dataset_found": "<true|false>",
  "research_timestamp": "<UTC ISO 8601>"
}}
"""
    },
    {
        "name": "FDA Drug & Device Coverage Research",
        "url": "https://www.fda.gov",
        "goal_template": lambda p: f"""# FDA COVERAGE AND DRUG RESEARCH FOR PRIOR AUTH SUPPORT

Research FDA approvals and clinical evidence to support prior authorization for patient {p['name']} (CPT: {p['cpt_code']}).

## TASK 1 — FDA Drug Database Search
Navigate to https://www.accessdata.fda.gov/scripts/cder/daf/
a) Search for drugs commonly associated with CPT code {p['cpt_code']}
b) For each relevant drug found, record: brand name, generic name, approval date, indication
c) Note any REMS (Risk Evaluation and Mitigation Strategy) requirements
d) Find the full prescribing information PDF and note key clinical trial data

## TASK 2 — Medical Device Search (510k/PMA)
Navigate to https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm
a) Search for medical devices used in procedures billed under CPT {p['cpt_code']}
b) Record device name, 510(k) number, applicant, decision date
c) Note the predicate device and intended use description

## TASK 3 — Clinical Trials Evidence
Navigate to https://clinicaltrials.gov
a) Search for clinical trials involving CPT code {p['cpt_code']} or related procedures
b) Filter by: Status = Completed, Phase = 3 or 4
c) For each of the first 5 trials: record NCT number, title, enrollment size, primary outcome, results summary
d) Note which payers ({', '.join(p.get('payers', ['Aetna']))}) are listed as sponsors or collaborators (if any)

## TASK 4 — PubMed Evidence Summary
Navigate to https://pubmed.ncbi.nlm.nih.gov/
a) Search for "prior authorization {p['cpt_code']}" and related terms
b) Find the 3 most cited recent papers (2022-2026)
c) Record: PMID, title, journal, year, key finding relevant to PA approval
d) Note any meta-analyses or systematic reviews

## OUTPUT JSON
{{
  "patient_name": "{p['name']}",
  "member_id": "{p['member_id']}",
  "cpt_code": "{p['cpt_code']}",
  "fda_approved_drugs": [{{"name": "<>", "indication": "<>", "approval_date": "<>"}}],
  "medical_devices": [{{"name": "<>", "number": "<>", "use": "<>"}}],
  "clinical_trials": [{{"nct": "<>", "title": "<>", "phase": "<>", "outcome": "<>"}}],
  "pubmed_evidence": [{{"pmid": "<>", "title": "<>", "finding": "<>"}}],
  "evidence_strength": "<strong|moderate|weak>",
  "research_timestamp": "<UTC ISO 8601>"
}}
"""
    },
    {
        "name": "Insurance Regulation & Appeals Research",
        "url": "https://www.cms.gov/cciio/programs-and-initiatives/health-insurance-market-reforms",
        "goal_template": lambda p: f"""# INSURANCE REGULATION AND APPEALS RESEARCH

Research federal and state regulations that govern prior authorization appeals for patient {p['name']} (Member ID: {p['member_id']}, Payers: {', '.join(p.get('payers', ['Aetna']))}).

## TASK 1 — ACA Prior Authorization Requirements
Start at https://www.cms.gov/cciio/programs-and-initiatives/health-insurance-market-reforms
a) Find all ACA provisions that govern prior authorization timelines
b) Navigate to the appeals and grievances section
c) Record: urgent appeal timeline, standard appeal timeline, external review rights
d) Note which plan types (fully insured, self-insured, grandfathered) each rule applies to

## TASK 2 — State Insurance Department Research
Navigate to https://content.naic.org/state-insurance-departments
a) Look up the insurance department for each state where the patient's payers operate
b) For {', '.join(p.get('payers', ['Aetna']))}: find the state insurance commissioner contact
c) Record: complaint filing URL, PA complaint statistics if published, average resolution time
d) Note any recent enforcement actions related to PA denials

## TASK 3 — ERISA and Self-Funded Plan Rules
Navigate to https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/aca-part-viii
a) Research ERISA claims and appeals regulations
b) Find the specific rules for adverse benefit determinations
c) Record the required notice content for PA denials
d) Note the timeframes for internal and external appeals

## TASK 4 — Federal External Review Process
Navigate to https://www.cms.gov/cciio/programs-and-initiatives/health-insurance-market-reforms/external-appeals
a) Find the federally-facilitated external review process details
b) Look up which Independent Review Organizations (IROs) are approved
c) Record the process for requesting external review after internal appeal exhaustion
d) Note any expedited review options for urgent/concurrent care situations

## TASK 5 — AMA Prior Auth Reform Resources
Navigate to https://www.ama-assn.org/practice-management/prior-authorization
a) Find the AMA's prior authorization reform principles
b) Look up the consensus statement on PA reform (AMA, AHIP, BCBSA, etc.)
c) Note the 21 principles for PA reform that apply to {', '.join(p.get('payers', ['Aetna']))}
d) Find any state legislation tracker showing PA reform laws by state

## OUTPUT JSON
{{
  "patient_name": "{p['name']}",
  "member_id": "{p['member_id']}",
  "urgent_appeal_hours": "<number>",
  "standard_appeal_days": "<number>",
  "external_review_available": "<true|false>",
  "applicable_regulations": ["<list>"],
  "state_departments": [{{"payer": "<>", "state": "<>", "complaint_url": "<>"}}],
  "iro_organizations": ["<list>"],
  "ama_principles_count": "<number>",
  "research_timestamp": "<UTC ISO 8601>"
}}
"""
    },
    {
        "name": "Hospital & ASC Pricing Transparency",
        "url": "https://www.cms.gov/hospital-price-transparency",
        "goal_template": lambda p: f"""# HOSPITAL PRICE TRANSPARENCY RESEARCH FOR CPT {p['cpt_code']}

Research pricing data for the procedure in patient {p['name']}'s authorization (CPT {p['cpt_code']}).

## TASK 1 — CMS Price Transparency Initiative
Start at https://www.cms.gov/hospital-price-transparency
a) Read the full overview of the hospital price transparency rule
b) Navigate to the machine-readable file requirements section
c) Find which hospitals are compliant vs non-compliant (enforcement actions)
d) Record 5 hospitals that have published price data for CPT {p['cpt_code']}

## TASK 2 — Turquoise Health Price Database
Navigate to https://turquoise.health/
a) Search for CPT code {p['cpt_code']} in the price transparency database
b) Compare prices across different hospital systems (min, max, median)
c) Note the negotiated rates for each of: {', '.join(p.get('payers', ['Aetna']))}
d) Record the cash price and any charity care rates visible

## TASK 3 — ASC (Ambulatory Surgery Center) Fee Schedule
Navigate to https://www.cms.gov/medicare/payment/fee-schedules/ambulatory-surgery-center-asc
a) Find the current year ASC payment rates for CPT {p['cpt_code']}
b) Record the ASC payment rate vs Hospital Outpatient payment rate
c) Note any device-intensive procedure designation
d) Find the addendum with the full payment rate table

## TASK 4 — Good Faith Estimate Requirements
Navigate to https://www.cms.gov/nosurprises/consumers/good-faith-estimates
a) Research the No Surprises Act Good Faith Estimate requirements
b) Find what providers must include in a GFE for CPT {p['cpt_code']}
c) Record the timeline for providing GFEs (scheduled vs unscheduled)
d) Note any dispute resolution process for GFE violations

## TASK 5 — Cost Benchmark Comparison
Navigate to https://www.fairhealthconsumer.org/
a) Look up CPT {p['cpt_code']} in the FAIR Health cost lookup tool
b) Record the 80th percentile cost in at least 3 different zip codes
c) Note the procedure description and typical time required
d) Find the allowed amount range for {', '.join(p.get('payers', ['Aetna']))} type plans

## OUTPUT JSON
{{
  "patient_name": "{p['name']}",
  "member_id": "{p['member_id']}",
  "cpt_code": "{p['cpt_code']}",
  "median_hospital_price": "<dollar or null>",
  "payer_negotiated_rates": [{{"payer": "<>", "rate": "<>"}}],
  "asc_payment_rate": "<dollar or null>",
  "fair_health_80th_pct": "<dollar or null>",
  "price_range_low": "<dollar or null>",
  "price_range_high": "<dollar or null>",
  "research_timestamp": "<UTC ISO 8601>"
}}
"""
    },
]


async def run_research_task(patient: dict, task: dict) -> dict | None:
    """Run one deep public-site research agent."""
    tf = TinyFish()
    goal = task["goal_template"](patient)
    run_id = None
    streaming_url = None
    result = None
    step_count = 0

    label = f"{task['name'][:30]} / {patient['name'][:20]}"
    print(f"  ▶ {label}")

    try:
        with tf.agent.stream(
            url=task["url"],
            goal=goal,
            browser_profile=BrowserProfile.STEALTH,
            proxy_config=ProxyConfig(enabled=True, country_code=ProxyCountryCode.US),
        ) as stream:
            for event in stream:
                if isinstance(event, StartedEvent):
                    run_id = event.run_id
                    print(f"    🚀 {run_id}")
                elif isinstance(event, StreamingUrlEvent):
                    streaming_url = event.streaming_url
                    print(f"    🔴 {streaming_url}")
                elif isinstance(event, ProgressEvent):
                    step_count += 1
                    if step_count % 15 == 0:
                        print(f"    ⏳ step {step_count}: {event.purpose[:70]}")
                elif isinstance(event, CompleteEvent):
                    raw = event.result_json
                    if isinstance(raw, str):
                        result = json.loads(raw)
                    elif isinstance(raw, dict):
                        result = raw
                    print(f"    ✅ {step_count} steps — {label}")

    except Exception as e:
        print(f"    ❌ {label}: {e}")

    # Always save to MongoDB
    doc = {
        "patient_name": patient["name"],
        "member_id": patient["member_id"],
        "payer_name": task["name"],
        "cpt_code": patient.get("cpt_code"),
        "auth_status": "Research Complete" if result else "Portal Unavailable",
        "research_data": result,
        "steps_executed": step_count,
        "run_id": run_id,
        "streaming_url": streaming_url,
        "status_changed": False,
        "checked_at": datetime.now(timezone.utc),
        "burn_run": True,
        "task_type": "public_research",
    }
    db.pa_checks.insert_one(doc)
    return result


def save_parquet(label: str) -> None:
    docs = list(db.pa_checks.find(
        {"burn_run": True},
        {"_id": 0, "patient_name": 1, "member_id": 1, "payer_name": 1,
         "auth_status": 1, "steps_executed": 1, "run_id": 1,
         "streaming_url": 1, "checked_at": 1, "task_type": 1},
        sort=[("checked_at", -1)],
        limit=5000,
    ))
    if not docs:
        return
    df = pd.DataFrame(docs)
    for col in ("checked_at",):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce", utc=True)
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).replace("None", pd.NA)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = DATA_DIR / f"pa_research_{label}_{ts}.parquet"
    df.to_parquet(path, engine="pyarrow", index=False, compression="snappy")
    print(f"  💾 Parquet → {path}  ({len(df)} rows)")


async def main():
    api_key = os.getenv("TINYFISH_API_KEY", "")
    if not api_key or api_key.startswith("sk-tinyfish-your"):
        print("❌  TINYFISH_API_KEY not set")
        sys.exit(1)

    patients = list(db.patients.find({"pa_active": True}))
    if not patients:
        print("❌  No active patients — start the backend to seed data")
        sys.exit(1)

    runs_per_batch = len(patients) * len(PUBLIC_TASKS)
    total_runs = NUM_BATCHES * runs_per_batch

    print("=" * 68)
    print("  PriorAuth Pulse — PUBLIC SITE Research Burn (Max Steps)")
    print("=" * 68)
    print(f"  API key    : {api_key[:24]}…")
    print(f"  Patients   : {len(patients)}")
    print(f"  Tasks      : {len(PUBLIC_TASKS)}  (CMS, NPI, FDA, Regulations, Pricing)")
    print(f"  Batches    : {NUM_BATCHES}")
    print(f"  Total runs : {total_runs}  ({runs_per_batch}/batch)")
    print(f"  Steps/run  : ~150–300  (public sites, no login wall)")
    print(f"  Est. steps : ~{total_runs * 150:,}–{total_runs * 300:,}")
    print("=" * 68)

    for batch_num in range(1, NUM_BATCHES + 1):
        print(f"\n{'─' * 68}")
        print(f"  BATCH {batch_num}/{NUM_BATCHES}  —  {datetime.now(timezone.utc).strftime('%H:%M:%S UTC')}")
        print(f"  Launching {runs_per_batch} agents in parallel…")
        print(f"{'─' * 68}")

        t0 = time.time()
        tasks = [
            run_research_task(patient, task)
            for patient in patients
            for task in PUBLIC_TASKS
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        elapsed = time.time() - t0

        success = sum(1 for r in results if isinstance(r, dict))
        print(f"\n  Batch {batch_num} done in {elapsed:.0f}s — {success}/{len(results)} with data")

        save_parquet(label=f"batch{batch_num}")

        real = db.pa_checks.count_documents({"run_id": {"$regex": "^[0-9a-f]{8}-"}})
        total = db.pa_checks.count_documents({})
        print(f"  MongoDB: {total} total docs  |  {real} real TinyFish UUIDs")

        if batch_num < NUM_BATCHES:
            await asyncio.sleep(DELAY_BETWEEN_BATCHES_SEC)

    print(f"\n{'=' * 68}")
    print("  DONE")
    print(f"  Total runs   : {total_runs}")
    print(f"  MongoDB docs : {db.pa_checks.count_documents({})}")
    print(f"  Parquet      : {DATA_DIR}/")
    print("=" * 68)


if __name__ == "__main__":
    asyncio.run(main())
