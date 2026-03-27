# PriorAuth Pulse 🏥

> **TinyFish $2M Pre-Accelerator Hackathon — March 2026**

**"Automated prior authorization status monitoring across 50+ health plan portals in real time."**

---

## The Problem

Prior authorization (PA) coordinators in specialty clinics (oncology, orthopedics, cardiology) spend **4+ hours daily** logging into Aetna, UHC, Cigna, Humana, and BCBS portals to check whether a patient's authorization was approved, denied, or is still pending.

- Each check: 8–12 manual steps (login → MFA → search → extract)
- Cost: **$228,000/year per clinic** in manual labor (CAQH 2024 Index: $14.6B/year industry-wide)
- Zero payer portals have public APIs for PA status (FHIR adoption < 15%)

## The Solution

PriorAuth Pulse uses the **TinyFish Web Agent API** to navigate 50+ payer portals simultaneously — with authentication, MFA handling, and structured data extraction — completing 150 PA checks in under 3 minutes.

When a PA status changes (Approved → Denied, Pending → Approved), coordinators get instant Slack/email alerts.

**Before:** $228,800/year | **After:** $199/month | **ROI: 96x**

---

## Why TinyFish is Core & Irreplaceable

- All portals require authenticated multi-step navigation (8–12 steps)
- JavaScript rendering + Cloudflare anti-bot on every major payer portal
- TinyFish: **81% accuracy** on Mind2Web (vs 43% OpenAI Operator)
- TinyFish Vault handles credentials securely (AES-256)
- `stealth` browser profile bypasses Cloudflare on Availity, UHC, Cigna

---

## Architecture

```
[Scheduler: every 4 hours]
        ↓
[MongoDB: active patients list]
        ↓
[FastAPI: build goal prompts per patient]
        ↓
[TinyFish Bulk API: 50 portals simultaneously]
    ├── Aetna/Availity → login → MFA → search → JSON
    ├── UnitedHealthcare → login → search → JSON
    ├── Cigna → login → search → JSON
    └── ... (50 payers in parallel)
        ↓
[SSE Stream → AgentOps metrics]
        ↓
[MongoDB: update status + timestamp]
        ↓
[Diff Engine: status changed?]
    ├── YES → Composio webhook → Slack alert
    └── NO  → log, next patient
        ↓
[Next.js Dashboard: real-time updates]
```

## Tech Stack

| Layer | Tool | Role |
|-------|------|------|
| Web Automation | **TinyFish Web Agent API** | Core — stealth + vault + parallel |
| Database | **MongoDB Atlas** | JSON-native PA check storage |
| Backend | **FastAPI** (Python) | API + async TinyFish orchestration |
| Frontend | **Next.js + v0 by Vercel** | Real-time dashboard |
| Agent Monitoring | **AgentOps** | Success rate, run metrics |
| Logging | **Axiom** | Structured backend logs |
| Alerts | **Composio** | Slack/email on status change |

---

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| Starter | $49/mo | 100 patients, 3 payers, daily checks |
| Pro | $199/mo | Unlimited patients, 10 payers, 4x/day + Slack alerts |
| RCM | $499/mo | Multi-clinic, API access, analytics |

---

## Setup

### 1. Clone & configure

```bash
git clone https://github.com/your-username/priorauth-pulse
cd priorauth-pulse/backend
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Test TinyFish connection

```bash
python test_connection.py
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/patients` | List active patients |
| POST | `/patients` | Add new patient |
| GET | `/patients/{member_id}/history` | PA check history |
| POST | `/run-check` | Trigger batch check |
| GET | `/pa-checks/recent` | Latest 50 checks |
| GET | `/metrics` | Success rate, totals |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TINYFISH_API_KEY` | From agent.tinyfish.ai/api-keys |
| `MONGO_URI` | MongoDB Atlas connection string |
| `AGENTOPS_API_KEY` | From agentops.ai |
| `COMPOSIO_API_KEY` | From composio.dev (Slack alerts) |
| `PORT` | Server port (default: 8000) |

---

## Built for

**TinyFish $2M Pre-Accelerator Hackathon**
Deadline: March 29, 2026 | Builder: Diego Hurtado

*Prior auth coordinators deserve to do work that matters.*

[![Built with TinyFish](https://img.shields.io/badge/Built%20with-TinyFish-blue)](https://tinyfish.ai)
[![Hackathon](https://img.shields.io/badge/TinyFish-Accelerator%202026-green)](https://accelerator.tinyfish.ai)
