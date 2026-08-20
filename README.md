# Mental Health Support for Students

Privacy-first student support pathway: anonymous entry, AI-supported emotional
support, deterministic safety engine, PHQ-9/GAD-7 screening, resource
navigation, counselor booking, and admin dashboard.

---

# 1. Project Overview

This is a developer onboarding guide for anyone who just cloned the repository.
Read this first, then follow the links in [§14](#14-api--developer-references)
to the detailed architecture and safety-engine documentation.

## What this project is

The project description above is the short version. Concretely, it is a
privacy-first mental-health support pathway for students built as a modular
monolith: a FastAPI backend (Python) with a Next.js frontend (TypeScript),
backed by PostgreSQL. Students enter **anonymously** — no accounts — and are
guided through AI-supported chat, clinical self-screening, verified resources,
and university counseling booking.

## Who it is for

- **Students** who want confidential, anonymous emotional support and guidance.
- **University counseling staff** who manage counselors, availability, and
  appointment bookings.
- **Administrators** who review aggregate, privacy-protected usage statistics.

## Major capabilities

- Anonymous, no-account entry (a session is just a UUID).
- Empathetic chat backed by a **deterministic safety engine** that is
  authoritative for crisis classification.
- **PHQ-9** and **GAD-7** self-screening with severity scoring and a safety
  follow-up workflow.
- A directory of verified crisis helplines and wellbeing resources.
- **Counselor booking** with anonymous-first appointments and confirmation codes.
- An **admin dashboard** with JWT authentication and aggregate analytics.

## Current status

Milestones 1–12 are implemented and covered by the backend pytest suite
(162 test functions). Milestone 13 — this README and the developer onboarding
documentation — is in progress. See [§17](#17-milestone--development-status)
for the milestone table and [§14](#14-api--developer-references) for the
detailed design documents.

# 2. Features

Every feature below exists in the current codebase. See
[§14](#14-api--developer-references) for where each lives in the code.

## Anonymous student sessions

No accounts, no personal data required. A session is a UUID plus a language
code. `POST /api/sessions` creates one; `GET /api/sessions/{id}` retrieves it.

## Deterministic safety engine

Every chat message is classified by the offline, keyword-based
`SafetyEngine` (`backend/app/safety/`) **before** any response is generated.
It produces one of three risk levels — `NORMAL`, `MODERATE`, `HIGH_RISK` —
using Unicode-aware normalization (preserves Hindi/Devanagari and
Assamese/Bengali-script text), a 2000-character input limit, contextual
negation handling, and a fail-closed policy (if all classifiers fail, the
engine returns `HIGH_RISK` rather than risk a safety bypass).

## Crisis flow

`HIGH_RISK` messages never reach the LLM. The engine returns a fixed,
warm crisis response with verified helplines and emergency guidance,
selected by risk category. See `docs/safety-engine.md` for the full design.

## Chat pipeline

`POST /api/chat/message` runs the full pipeline: session validation, input
validation, rate limiting (10 messages/minute/session), safety pre-check,
response generation (crisis, AI, or safe fallback), an **output safety check**,
and persistence of the safety evaluation. Only safety metadata is persisted —
the raw message text is never stored.

## Screening (PHQ-9 / GAD-7)

`backend/app/screening/instruments.py` implements deterministic scoring for
both instruments. Submissions are validated (exact item counts, integer 0–3
responses), scored, and assigned a severity band. A positive PHQ-9 Item 9
(suicidal ideation) triggers a safety follow-up with two actions:
`ESCALATE_CRISIS` (→ `HIGH_RISK` crisis pathway) or `SUPPORTIVE_CARE`
(→ stays `MODERATE`, counseling pathway).

## Resources

A static frontend page (`frontend/src/app/(student)/resources/`) listing
verified crisis helplines, counseling guidance, and wellbeing tools. There is
**no backend resources API**; instead a consistency test
(`backend/tests/test_resources_consistency.py`) keeps every number shown to
students within the authorized helpline set.

## AI provider integration

The chat pipeline depends only on a provider abstraction
(`ChatResponseProvider`). The default is the deterministic
`DeterministicFallbackProvider` (no LLM needed). When configured, the
`OllamaProvider` talks to a local Ollama server (default model `qwen3:8b`),
keeping the model's reasoning trace out of student-facing answers. Provider
output is validated (empty or runaway responses are rejected) and always
passed through the output safety check.

## Multilingual

Sessions carry a language code. The backend supports `en`, `hi`, and `as`
(`backend/app/core/languages.py`).

## Booking

Counselors, availability slots, and appointments. Bookings are
**anonymous-first**: no session or contact details are required. Each booking
gets an 8-character confirmation code used to prove ownership, view, and
cancel. Statuses follow a strict state machine
(`PENDING → CONFIRMED / COMPLETED / CANCELLED`). Admins manage counselors,
slots, and bookings.

## Admin dashboard

A JWT-authenticated admin portal (`frontend/src/app/admin/`, backend
`/api/admin/*`). Passwords are bcrypt-hashed, the JWT algorithm is hard-pinned
to HS256, and login is throttled per username and IP. The dashboard shows
aggregate system statistics only.

## Analytics

An admin-only aggregate dashboard (`/api/admin/analytics`) with day/week/month
granularity. It returns pre-aggregated numbers only and applies **small-cell
suppression** to sensitive cells so individuals cannot be re-identified. The
wellbeing domain and the booking domain are never joined in analytics queries.

# 3. Tech Stack

| Layer | Technology | Version (as configured in this repo) |
|---|---|---|
| Frontend framework | Next.js (App Router, `src/` layout) | 16.3.1 |
| Frontend UI | React | 19.2.8 |
| Frontend language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Backend framework | FastAPI | >=0.115, <1.0 |
| ASGI server | Uvicorn | >=0.30, <1.0 |
| Database | PostgreSQL | 17 (docker image) |
| ORM | SQLAlchemy | >=2.0, <3.0 |
| Migrations | Alembic | >=1.13, <2.0 |
| Settings / env config | pydantic-settings | >=2.2, <3.0 |
| Authentication | python-jose (JWT, HS256 hard-pinned) + bcrypt | >=3.5 / >=4.0 |
| AI / LLM (optional) | Ollama (local) — model | `qwen3:8b` |
| Backend testing | pytest + httpx | >=8.0 / >=0.27 |
| Frontend lint / build | ESLint 9 + Next.js build | ^9 |
| Package managers | pip (`requirements.txt`) / npm (`package-lock.json`) | — |
| Development tools | Docker / docker-compose (PostgreSQL only), `uvicorn --reload` | — |

# 4. Repository Structure

```
mental-health-app/
├── backend/                  FastAPI modular monolith (Python)
│   ├── app/
│   │   ├── main.py           FastAPI app factory (mounts all routers)
│   │   ├── api/routes/       HTTP routers (health, sessions, chat, screenings,
│   │   │                     admin/auth, admin, counselors, bookings, analytics)
│   │   ├── core/             config.py (pydantic-settings), db.py (SQLAlchemy),
│   │   │                     languages.py
│   │   ├── services/         Business logic (chat, safety_evaluations,
│   │   │                     screenings, booking, admin, analytics,
│   │   │                     output_safety, chat_providers, prompts)
│   │   ├── repositories/     Data access layer
│   │   ├── models/           SQLAlchemy ORM models (sessions, safety_evaluations,
│   │   │                     admins, counselors, counselor_slots, bookings)
│   │   ├── schemas/          Pydantic request/response schemas
│   │   ├── safety/           Deterministic safety engine + crisis responses
│   │   └── screening/        PHQ-9 / GAD-7 instruments
│   ├── migrations/           Alembic migrations (5 revisions)
│   ├── tests/                pytest suite (162 test functions)
│   ├── scripts/              Seed/verification scripts (demo counselors,
│   │                         migration checks)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 Next.js 16 + TypeScript + Tailwind CSS (App Router)
│   ├── src/app/(student)/    Student pages (chat, screening, booking,
│   │                         resources, about, support-now)
│   ├── src/app/admin/        Admin portal (login + protected pages)
│   ├── src/components/       Reusable UI + app-shell components
│   └── src/lib/              API clients (student + admin), auth, types
├── database/                 Local PostgreSQL setup notes (README.md)
├── docker/                   docker-compose.yml (PostgreSQL only)
├── docs/                     ARCHITECTURE.md, safety-engine.md
└── .env.example              Canonical environment variable reference
```

**What a beginner should look at first:**

1. `README.md` — this file, top to bottom.
2. `backend/.env.example` — every backend environment variable, with comments.
3. `backend/app/main.py` — where all API routers are mounted; a good map of
   the whole backend.
4. `backend/tests/conftest.py` — how the test suite provisions its own
   database automatically.
5. `docs/ARCHITECTURE.md` and `docs/safety-engine.md` — the technical design.

# 5. Prerequisites

## REQUIRED for basic development

| Tool | Version | Why |
|---|---|---|
| Python | 3.10+ (3.13 is used in this repo's venv) | Backend (FastAPI, SQLAlchemy) |
| Node.js | >=20.9.0 (a current LTS is recommended) | Frontend (Next.js 16 requires this) |
| npm | Bundled with Node.js | Frontend dependencies |
| PostgreSQL | 17 | Application database (Docker or portable binaries, see §8) |

## OPTIONAL / REQUIRED ONLY FOR LOCAL AI

| Tool | Version | Why |
|---|---|---|
| Ollama | Any recent release | Local LLM server for `AI_PROVIDER=ollama` |
| Qwen model | `qwen3:8b` (currently configured model) | The local model the backend points at |

Ollama is **not** required for basic development: the default
`AI_PROVIDER=fallback` uses the deterministic provider, so the app runs fully
without it. A GPU is not required — CPU inference works, but it is slow
(see §11).

# 6. Clone & Setup

## Windows (PowerShell)

```powershell
git clone https://github.com/syazy-bit/mental-health-app.git
cd mental-health-app

# 1) Backend virtual environment
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2) Backend environment configuration
Copy-Item .env.example .env
#    then edit .env and set DATABASE_URL to your PostgreSQL credentials (see §8)

# 3) Frontend dependencies
cd ..\frontend
npm install
```

## Linux / macOS

```bash
git clone https://github.com/syazy-bit/mental-health-app.git
cd mental-health-app/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cd ../frontend
npm install
```

The virtual environment isolates the backend's Python dependencies; the
repository's own docs and scripts assume `.venv`.

After cloning, continue with [§8 Database Setup](#8-database-setup),
[§9 Running the Backend](#9-running-the-backend), and
[§10 Running the Frontend](#10-running-the-frontend).

# 7. Environment Variables

## `.env` vs `.env.example`

- **`.env.example`** is committed to the repository. It is the canonical
  reference for every variable and should never be edited for local use.
- **`.env`** is your local copy (created with `Copy-Item .env.example .env`
  or `cp .env.example .env`). It is **gitignored** and must never be
  committed, because it will contain real credentials.

## Backend variables (`backend/.env`)

| Variable | What it does | Required? | Example / safe default |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (psycopg3 driver) | Yes, for any data-backed feature | `postgresql+psycopg://postgres:CHANGE_ME@localhost:5432/mental_health` |
| `ENVIRONMENT` | Runtime environment: `development` / `test` / `production` | No | `development` |
| `CORS_ORIGINS` | JSON list of allowed browser origins (the frontend) | No | `["http://localhost:3000"]` |
| `AI_PROVIDER` | Chat provider: `fallback` (deterministic) or `ollama` | No | `fallback` |
| `OLLAMA_BASE_URL` | Ollama server URL | Only when `AI_PROVIDER=ollama` | `http://localhost:11434` |
| `OLLAMA_MODEL` | Local model name | Only when `AI_PROVIDER=ollama` | `qwen3:8b` |
| `OLLAMA_TIMEOUT_SECONDS` | Request timeout for the LLM; raise it for slow CPU inference | Only when `AI_PROVIDER=ollama` | `120` (code default is 3.5s) |
| `OLLAMA_ENABLE_THINKING` | Send `think: true` so reasoning models keep the reasoning trace out of answers | Only when `AI_PROVIDER=ollama` | `true` |
| `ADMIN_AUTH_SECRET` | JWT signing secret; the placeholder is refused in production | Yes, in production | `openssl rand -hex 32` |
| `ADMIN_AUTH_TOKEN_EXPIRE_MINUTES` | Admin access-token lifetime | No | `1440` (24 h) |
| `ADMIN_LOGIN_MAX_FAILURES`, `ADMIN_LOGIN_IP_MAX_FAILURES`, `ADMIN_LOGIN_WINDOW_SECONDS`, `ADMIN_LOGIN_LOCKOUT_SECONDS` | Admin login throttling (in-memory, per process) | No | `5` / `20` / `900` / `900` |

## Frontend variable (`frontend/.env.local` or your environment)

| Variable | What it does | Required? | Default |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend, used by the Next.js client | No | `http://localhost:8000` |

Notes:

- `ADMIN_AUTH_ALGORITHM` is hard-pinned to `HS256` in the code and is **not**
  configurable.
- In `production`, the backend refuses to start if `ADMIN_AUTH_SECRET` is still
  the placeholder.
- The backend reads its environment from `backend/.env`; the top-level
  `.env.example` mirrors the backend variables plus the frontend one.

# 8. Database Setup

The backend connects to PostgreSQL via `DATABASE_URL`
(`postgresql+psycopg://USER:PASSWORD@localhost:5432/mental_health`). See also
`database/README.md`.

## Option A — Docker (recommended if Docker is installed)

1. Create `docker/.env` with the variables the compose file requires:
   `POSTGRES_USER`, `POSTGRES_PASSWORD`, and optionally `POSTGRES_DB`
   (defaults to `mental_health`).
2. Start the database:

   ```powershell
   docker compose -f docker/docker-compose.yml up -d db
   ```

   This starts PostgreSQL 17 and creates the `mental_health` database
   automatically.

## Option B — Portable binaries (Windows, no Docker)

This is the setup documented in `database/README.md`, used on machines where
Docker is not installed. The PostgreSQL binaries live outside the repo at
`%LOCALAPPDATA%\PostgreSQL\pgsql`. Start the server:

```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\PostgreSQL\pgdata" -l "$env:LOCALAPPDATA\PostgreSQL\pgdata\server.log" start
```

If the `mental_health` database does not exist yet, create it with
PostgreSQL's standard `createdb` tool (same bin directory):

```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\createdb.exe" -U postgres mental_health
```

## Apply migrations

The schema is defined entirely by Alembic migrations in `backend/migrations/`
(sessions, safety_evaluations, screenings, admins, counselors,
counselor_slots, bookings). Apply them with:

```powershell
cd backend
alembic upgrade head
```

(Your local copy of the DB starts empty; the test suite provisions its own
`mental_health_test` database automatically and applies the same migrations.)

## Verify the connection

Start the backend ([§9](#9-running-the-backend)) and open
`http://localhost:8000/health`. The `"database"` field should read
`"connected"`. If it reads `"unavailable"` or `"not_configured"`, see
[§16 Troubleshooting](#16-troubleshooting).

# 9. Running the Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

- Expected URL: `http://localhost:8000`
- Verify it is running: `http://localhost:8000/health`
- Interactive API docs (Swagger UI): `http://localhost:8000/docs`
- The `--reload` flag auto-restarts the server when backend code changes
  (handy for development).

# 10. Running the Frontend

```powershell
cd frontend
npm run dev
```

- Expected URL: `http://localhost:3000`
- The frontend calls the backend at `NEXT_PUBLIC_API_URL`
  (default `http://localhost:8000`).

## Optional: admin portal

The admin portal lives at `http://localhost:3000/admin/login`. It requires an
admin account in the `admins` table. There is **no bootstrap CLI yet**; create
one using the same code path the tests use:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -c "from app.core.db import SessionLocal; from app.services.admin import AdminService; from app.schemas.admin import AdminCreateInternal; db = SessionLocal(); AdminService(db).create_admin(AdminCreateInternal(username='admin', password_hash=AdminService.hash_password('change-me-now'))); print('Admin created'); db.close()"
```

Change `admin` / `change-me-now` before using this anywhere real.

# 11. Running with Ollama (optional local AI)

Ollama is **optional**. With the default `AI_PROVIDER=fallback`, chat responses
come from the deterministic provider and no local model is needed.

To enable local AI:

1. Pull the configured model:

   ```powershell
   ollama pull qwen3:8b
   ```

2. In `backend/.env`, set:

   ```
   AI_PROVIDER=ollama
   # OLLAMA_MODEL=qwen3:8b          (this is the default)
   # OLLAMA_TIMEOUT_SECONDS=120     (CPU inference is slow — see below)
   # OLLAMA_ENABLE_THINKING=true    (default: keeps reasoning out of answers)
   ```

Relevant environment variables:

- `AI_PROVIDER` — `ollama` to enable the local model, `fallback` for the
  deterministic provider.
- `OLLAMA_MODEL` — which model to use (configured default: `qwen3:8b`).
- `OLLAMA_ENABLE_THINKING` — sends Ollama's `think: true` so reasoning models
  keep their thinking trace out of the student-facing answer.
- `OLLAMA_TIMEOUT_SECONDS` — request timeout. Local CPU inference of `qwen3:8b`
  is slow (typically 40–60s per turn on a laptop), so raise this (e.g. `120`)
  or requests time out and fall back to the safe deterministic response. Keep
  it finite so a dead/unreachable Ollama fails fast instead of hanging.

Notes:

- **No GPU is required.** CPU inference works but is slow.
- If Ollama is unreachable, times out, or returns invalid output, the chat
  pipeline falls back to a guaranteed-safe deterministic response.

# 12. Development Workflow

A simple loop for beginners:

1. Start PostgreSQL (§8).
2. Start the backend (§9).
3. Start the frontend (§10).
4. Optionally start Ollama and set `AI_PROVIDER=ollama` (§11).
5. Open the application at `http://localhost:3000`.
6. Run the backend tests **before** making changes (§13).
7. Make your changes.
8. Run backend tests, frontend lint, and the frontend build again (§13).
9. Review `git diff` before staging anything.
10. Commit (never commit `.env` files or secrets).

# 13. Testing

## Backend tests

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

`backend/tests/` contains 162 test functions. `conftest.py` reads
`DATABASE_URL` from `backend/.env`, provisions a dedicated `mental_health_test`
database, applies all Alembic migrations, and truncates tables between tests.
A configured `DATABASE_URL` is required for the suite to run.

## Frontend lint

```powershell
cd frontend
npm run lint
```

Runs ESLint (via `eslint-config-next`) over the frontend source.

## Frontend build

```powershell
cd frontend
npm run build
```

Runs a Next.js production build, which also performs TypeScript type-checking.

# 14. API / Developer References

- **Interactive API docs (Swagger UI):** `http://localhost:8000/docs`
  (ReDoc at `/redoc`), served by FastAPI while the backend is running.
- **API routes:** `backend/app/api/routes/` — health, sessions, chat,
  screenings, admin/auth, admin, counselors, bookings, admin bookings,
  analytics.
- **Architecture:** `docs/ARCHITECTURE.md` — technical design and design
  decisions. Note: it currently documents the Milestone 1 scope; see
  "Known documentation gaps" at the end of this README.
- **Safety engine design:** `docs/safety-engine.md` — risk levels, the engine
  design, and the crisis flow.
- **Backend business logic:** `backend/app/services/`
- **Backend data access:** `backend/app/repositories/`
- **ORM models:** `backend/app/models/`
- **Frontend structure:** `frontend/src/app/` (pages),
  `frontend/src/components/` (UI + shell), `frontend/src/lib/` (API clients,
  auth, types).
- **Seed script (demo counselors for booking):**
  `backend/scripts/seed_booking_demo.py`

# 15. Security / Privacy

- The **deterministic SafetyEngine is authoritative** for crisis
  classification. Risk is never decided by the AI.
- **`HIGH_RISK` messages bypass the LLM entirely** and return a
  predetermined crisis response with verified helplines.
- **OutputSafetyCheck runs on AI responses** (defense in depth): unsafe output,
  or output containing hallucinated phone numbers/helplines, is rejected and
  replaced with a safe fallback.
- **Admin endpoints require authorization**: every `/api/admin/*` route
  validates a JWT (HS256 hard-pinned). Login is throttled per username and IP,
  passwords are bcrypt-hashed, and response timing is equalized so admin
  usernames cannot be enumerated.
- **Analytics uses small-cell suppression**: sensitive counts below the
  threshold are returned as `None`/`suppressed` so individuals cannot be
  re-identified.
- **Counselor analytics never exposes student wellbeing information**: the
  booking domain and the wellbeing domain are never joined in analytics.
- Booking ownership is proven by a matching session_id or an unguessable
  confirmation code; unknown bookings return 404 rather than revealing
  existence.
- **Secrets must never be committed**: `.env` files are gitignored,
  `.env.example` holds only placeholders, and a strong `ADMIN_AUTH_SECRET` is
  required in production.

# 16. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `/health` shows `"database": "unavailable"` | PostgreSQL is not running. Start it (§8): `docker compose up -d db`, or the `pg_ctl` start command. |
| `/health` shows `"database": "not_configured"` | `DATABASE_URL` is empty. Copy `backend/.env.example` to `.env` and set it. |
| Backend errors about the database connection | Check `DATABASE_URL` (user, password, host, port) and that the `mental_health` database exists (create it with `createdb`, §8). |
| Python virtual environment problems | Delete `backend/.venv` and recreate it, then `pip install -r requirements.txt`. |
| npm dependency problems | Delete `frontend/node_modules` (and `package-lock.json` if it is inconsistent) and run `npm install` again. |
| Ollama unavailable | If `AI_PROVIDER=ollama`, requests fall back to safe deterministic responses. Check `ollama serve` / `ollama list`, or set `AI_PROVIDER=fallback`. |
| Ollama model not installed | `ollama pull qwen3:8b`. |
| AI request takes a long time | CPU inference of `qwen3:8b` is slow (40–60s/turn). Raise `OLLAMA_TIMEOUT_SECONDS` (e.g. 120) or switch to `AI_PROVIDER=fallback`. |
| Port already in use | Change the backend port (`uvicorn app.main:app --port 8001`) and update `NEXT_PUBLIC_API_URL` + `CORS_ORIGINS` accordingly; or run the frontend on another port (`npm run dev -- -p 3001`). |
| Chat returns 429 | Rate limit: 10 messages/minute/session. Wait and retry. |
| Admin login always fails | No admin row exists yet. Create one (§10). |

# 17. Milestone / Development Status

| Milestone | Area | Status |
|---|---|---|
| M1 | Foundation: FastAPI + `/health`, PostgreSQL plumbing, Alembic scaffold, config/secrets hygiene | Done |
| M2 | Anonymous student sessions | Done |
| M3 | Deterministic safety engine + crisis flow | Done |
| M4 | Chat pipeline + safety-evaluation persistence | Done |
| M5 | PHQ-9 / GAD-7 screening + safety follow-up | Done |
| M6 | Resources + AI provider abstraction (deterministic fallback) | Done |
| M7 | Booking: counselors, slots, appointments | Done |
| M8 | Admin authentication (JWT) | Done |
| M9 | Product frontend pages | Done |
| M10 | AI provider integration: Ollama + `qwen3:8b` | Done |
| M11 | Multilingual support (`en`, `hi`, `as`) | Done |
| M12 | Admin analytics (aggregate, small-cell suppression) | Done |
| M13 | README & developer onboarding (this task) | In progress |

Design detail lives in `docs/ARCHITECTURE.md` and `docs/safety-engine.md`.

# 18. Contributing / Development Notes

- **Inspect the architecture before changing services** — read
  `docs/ARCHITECTURE.md` and `docs/safety-engine.md` first.
- **Preserve the safety boundaries**: the SafetyEngine stays authoritative,
  `HIGH_RISK` never reaches the LLM, and the output safety check stays on AI
  responses.
- **Keep the domains separate**: wellbeing (sessions, screenings, safety) and
  booking/analytics are deliberately not joined; analytics stays aggregate-only.
- **Add regression tests** for behavior you change (`backend/tests/`).
- **Run backend tests** (`pytest`), **frontend lint** (`npm run lint`), and
  **the frontend build** (`npm run build`) before finishing (§13).
- **Review `git diff`** before committing.
- **Do not commit secrets** — never commit `.env` files or real credentials.

---

## Known documentation gaps (future work)

These are things this task intentionally left unchanged or could not resolve
from the repository:

- `docs/ARCHITECTURE.md` is written for the Milestone 1 scope and lists M3–M12
  as "not yet implemented", though they now exist in the codebase. It should be
  refreshed in a future documentation task.
- `docs/safety-engine.md` is marked DRAFT and states that no safety tables
  exist; the `safety_evaluations` migration now exists. It should be updated in
  a future task.
- `frontend/README.md` is the default `create-next-app` boilerplate and does
  not describe this project.
- The `v0/` Streamlit prototype directory referenced in older docs no longer
  exists in the repository.
- Helpline numbers must be re-verified against official sources before
  production (already flagged in `docs/safety-engine.md`).
- There is no admin bootstrap CLI; see §10 for the current workaround.