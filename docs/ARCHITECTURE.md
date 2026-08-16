# Architecture — Milestone 1

Status: documents **only** what is implemented so far (Milestone 1: project
foundation). Features listed under "Not yet implemented" are planned and are
NOT present in this codebase yet.

## Repository layout

```
mental-health-app/
├── v0/            Streamlit prototype (preserved reference implementation, unchanged)
├── frontend/      Next.js 16 + TypeScript + Tailwind CSS (App Router)
├── backend/       FastAPI modular monolith
├── database/      PostgreSQL local setup notes
├── docker/        docker-compose.yml (PostgreSQL only)
├── docs/          Architecture + milestone notes
├── .env.example   Canonical environment variable reference
└── README.md
```

## Backend

### Layout

```
backend/
├── app/
│   ├── main.py          FastAPI application factory (thin)
│   ├── api/routes/      Routers (only health in M1)
│   ├── core/            config.py (pydantic-settings), db.py (SQLAlchemy engine/session)
│   ├── services/        Business logic (placeholder, populated in later milestones)
│   ├── repositories/    Data access (placeholder)
│   ├── models/          SQLAlchemy ORM models (placeholder)
│   ├── schemas/         Pydantic schemas (placeholder)
│   ├── safety/          Deterministic safety engine (placeholder)
│   └── ai/              AI provider abstraction (placeholder)
├── migrations/          Alembic migration environment
├── tests/               pytest suite
├── requirements.txt
└── .env.example
```

### Configuration

- All runtime configuration comes from environment variables or `backend/.env`
  (never committed).
- `app/core/config.py` uses `pydantic-settings`; the only required variable is
  `DATABASE_URL`. No credentials are hardcoded.
- `CORS_ORIGINS` defaults to `["http://localhost:3000"]` (the Next.js dev server).

### Database

- `app/core/db.py` builds a SQLAlchemy engine from `DATABASE_URL` with
  `pool_pre_ping=True`. If `DATABASE_URL` is empty, the engine is not created
  and the app still runs (health reports `not_configured`).
- Alembic is configured (`alembic.ini`, `migrations/env.py`) and wired to the
  ORM `Base.metadata`. The schema itself lands in Milestone 2.

### API

- `GET /health` → `200` with `{ status, service, version, environment, database, timestamp }`.
  `database` is `connected`, `unavailable`, or `not_configured`. The endpoint is
  deliberately non-fatal: the API reports its own liveness even if the DB is down.

### Tests

- `backend/tests/test_health.py` — asserts `/health` returns 200 and a well-formed body.

## Frontend

- Scaffolded with `create-next-app` (Next.js 16, TypeScript, Tailwind CSS v4,
  App Router, `src/` layout).
- No product pages yet; the default scaffold page is present only to prove the
  toolchain starts and builds.

## Configuration & secrets

- `.env.example` files document variables; `.env` files are gitignored.
- `.gitignore` excludes `.env`, `__pycache__/`, `node_modules/`, `.next/`,
  `venv/`, `*.pyc`, local database files, logs, and generated CSV data.

## Not yet implemented (future milestones)

- Chat pipeline and safety/risk engine (M3–M4)
- PHQ-9 / GAD-7 screening (M5)
- Resources API (M6)
- Booking API (M7)
- Admin authentication (M8)
- Product frontend pages (M9)
- AI provider integration (M10)
- Multilingual support (M11)
- Analytics (M12)