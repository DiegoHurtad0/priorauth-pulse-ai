# Contributing to PriorAuth Pulse

Thank you for your interest in contributing! PriorAuth Pulse automates prior authorization monitoring across 50+ health plan portals using TinyFish AI web agents. This guide covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Coding Standards](#coding-standards)
- [Making a Pull Request](#making-a-pull-request)
- [Issue Labels](#issue-labels)
- [Architecture Notes](#architecture-notes)

---

## Code of Conduct

Be respectful and constructive. Healthcare technology impacts real patients — accuracy and reliability are paramount.

---

## Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 20+ |
| MongoDB | 6+ (or Atlas) |
| Docker | 24+ (optional) |

### Option A — Docker (recommended)

```bash
git clone https://github.com/DiegoHurtad0/priorauth-pulse-ai.git
cd priorauth-pulse-ai
cp .env.example .env          # fill in your API keys
docker compose up --build
```

Dashboard: http://localhost:3000
API docs: http://localhost:8000/docs

### Option B — Manual

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env       # or set env vars directly
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev                    # http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TINYFISH_API_KEY` | Yes (live mode) | TinyFish web agent API key |
| `ANTHROPIC_API_KEY` | Recommended | Claude AI for appeal letters |
| `MONGO_URI` | Yes | MongoDB connection string |
| `AGENTOPS_API_KEY` | Optional | AgentOps session tracing |
| `SLACK_WEBHOOK_URL` | Optional | Slack status-change alerts |

---

## Project Structure

```
priorauth-pulse-ai/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + all endpoints
│   │   ├── core.py          # TinyFish agent + 3-phase goal builder
│   │   ├── appeal.py        # Claude Opus appeal letter generator
│   │   ├── scheduler.py     # APScheduler (runs every 4 hours)
│   │   ├── models.py        # Pydantic request/response models
│   │   └── notifications.py # Slack/Composio alerts
│   ├── tests/
│   │   ├── test_api.py      # FastAPI endpoint tests (pytest)
│   │   └── test_core.py     # Core logic unit tests
│   ├── scripts/
│   │   └── burn_demo_runs.py # Burn TinyFish credits on public sites
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── dashboard/       # Main dashboard page + layout
│   │   ├── components/      # React components
│   │   └── globals.css
│   ├── lib/
│   │   └── api.ts           # Typed API client
│   └── __tests__/           # Jest + React Testing Library tests
├── docker-compose.yml
├── .github/workflows/ci.yml # GitHub Actions CI
└── .env.example
```

---

## Running Tests

### Backend (pytest)

```bash
cd backend
pytest tests/ -v --tb=short
```

Tests use `TestClient` with MongoDB fully mocked — no live database needed.

To run a specific test:
```bash
pytest tests/test_api.py::test_health_returns_ok -v
```

### Frontend (Jest)

```bash
cd frontend
npm test                       # run once
npm run test:watch             # watch mode
npm run test:coverage          # coverage report
```

### Full CI check locally

```bash
# Backend
cd backend && pytest tests/ -v

# Frontend type check
cd frontend && npx tsc --noEmit

# Frontend tests
cd frontend && npm test -- --watchAll=false
```

---

## Coding Standards

### Python (Backend)

- **Formatter:** `black` (line length 100)
- **Linter:** `ruff`
- **Type hints:** required on all public functions
- **Docstrings:** Google style for public endpoints

```bash
cd backend
black app/ tests/
ruff check app/ tests/
```

### TypeScript (Frontend)

- **Formatter:** Prettier (default Next.js config)
- **Linter:** ESLint (Next.js rules)
- **Types:** explicit interfaces for all API responses (see `lib/api.ts`)
- No `any` types without a comment explaining why

```bash
cd frontend
npm run lint
npx prettier --write "app/**/*.{ts,tsx}"
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add retry logic for TinyFish portal timeouts
fix: correct MongoDB index creation on fresh install
docs: add setup instructions for Windows
test: cover appeal letter 422 validation
refactor: extract payer config to separate module
```

---

## Making a Pull Request

1. **Fork** the repo and create a branch: `git checkout -b feat/your-feature`
2. **Write tests** — every new endpoint or core function needs a test
3. **Run CI locally** (see above) — all tests must pass before opening a PR
4. **Open a PR** against `main` with:
   - A clear description of what changed and why
   - Screenshots/recordings for UI changes
   - Any breaking changes clearly noted
5. **Respond to review** — PRs are typically reviewed within 48 hours

### PR Checklist

- [ ] Tests added or updated
- [ ] `pytest tests/ -v` passes locally
- [ ] `tsc --noEmit` passes locally
- [ ] No hardcoded API keys or secrets
- [ ] Environment variables documented in `.env.example`

---

## Issue Labels

| Label | Meaning |
|-------|---------|
| `bug` | Something is broken |
| `enhancement` | New feature request |
| `good first issue` | Great for newcomers |
| `help wanted` | Extra attention needed |
| `tinyfish` | TinyFish agent/SDK related |
| `healthcare` | Domain-specific healthcare logic |
| `performance` | Speed or cost optimization |

---

## Architecture Notes

### TinyFish 3-Phase Goal

Each PA check runs a 3-phase TinyFish goal (see `backend/app/core.py`):

1. **Phase 1 — CMS.gov Research** (public, always succeeds):
   Navigate CMS coverage database, extract LCD/NCD policies, fee schedules, and PA requirements for the CPT code. Produces 80–150 real navigation steps.

2. **Phase 2 — NPI Registry Lookup** (public):
   Look up provider and payer NPIs. Validates the requesting provider is enrolled with the payer.

3. **Phase 3 — Payer Portal Check**:
   Attempt live PA status lookup. If login is required, document the portal structure and requirements. Always saves results to MongoDB regardless of portal outcome.

### MongoDB Schema

**`patients` collection:**
```json
{
  "member_id": "AET-001-78234",
  "name": "Maria Garcia",
  "dob": "1978-03-14",
  "cpt_code": "27447",
  "payers": ["Aetna", "UnitedHealthcare"],
  "pa_active": true,
  "created_at": "2026-03-01T00:00:00Z"
}
```

**`pa_checks` collection:**
```json
{
  "member_id": "AET-001-78234",
  "payer_name": "Aetna",
  "auth_status": "Approved",
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "streaming_url": "https://replay.tinyfish.ai/r/...",
  "steps_executed": 147,
  "cms_coverage": "...",
  "checked_at": "2026-03-28T12:00:00Z"
}
```

### Adding a New Payer

1. Add entry to `PAYERS` dict in `backend/app/core.py`
2. Add the payer name to `SUPPORTED_PAYERS` in `backend/app/models.py`
3. Add a test in `test_api.py` verifying the new payer is accepted
4. Update `README.md` payer count

---

## Questions?

Open a GitHub Discussion or reach out via the [#BuildInPublic](https://twitter.com/search?q=%23BuildInPublic) thread.
