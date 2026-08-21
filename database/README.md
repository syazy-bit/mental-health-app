# Database

Local development database: **PostgreSQL 17**.

---

## Quick Start

### Option A — Docker (recommended)

```powershell
# 1. Create docker/.env with your credentials
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=your_password
# POSTGRES_DB=mental_health

docker compose -f docker/docker-compose.yml up -d db
```

This starts PostgreSQL 17 and creates the `mental_health` database automatically.

### Option B — Portable Binaries (Windows, no Docker)

PostgreSQL 17 binaries at `%LOCALAPPDATA%\PostgreSQL\pgsql`.

Start server:
```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\PostgreSQL\pgdata" -l "$env:LOCALAPPDATA\PostgreSQL\pgdata\server.log" start
```

Create database (if not exists):
```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\createdb.exe" -U postgres mental_health
```

---

## Configuration

Backend reads `DATABASE_URL` from `backend/.env`:

```ini
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/mental_health
```

Format: `postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE_NAME`

---

## Migrations

All schema changes are managed by **Alembic** in `backend/migrations/`.

### Apply Migrations

```powershell
cd backend
alembic upgrade head
```

### Migration History

| Revision | Description | Creates |
|---|---|---|
| `3d7165a43ae7` | Initial | `sessions` |
| `13cda6c930c1` | Safety evaluations | `safety_evaluations` |
| `552ba90ff6e0` | Screenings | `screenings` |
| `7f8a9b2c1d4e` | Admins | `admins` |
| `6a03dfac38c3` | Booking domain | `counselors`, `counselor_slots`, `bookings` |

### Inspect Migration Status

```powershell
cd backend
alembic current          # Show current revision
alembic history          # Show all revisions
alembic show head        # Show latest revision SQL
```

### Create New Migration (after model changes)

```powershell
cd backend
alembic revision --autogenerate -m "description"
# Review generated file in backend/migrations/versions/
alembic upgrade head
```

---

## Schema Overview

### Wellbeing Domain (Student Mental Health Data)

| Table | Purpose | Key Privacy Notes |
|---|---|---|
| `sessions` | Anonymous sessions (UUID + language) | No PII, no content |
| `safety_evaluations` | Per-message risk assessment | Metadata only (risk_level, category, patterns); **no raw text** |
| `screenings` | PHQ-9/GAD-7 summary scores | Summary only (total_score, severity, safety_flag); **no item responses** |

### Booking Domain (Operational — Separate)

| Table | Purpose |
|---|---|
| `counselors` | University counseling staff profiles |
| `counselor_slots` | Availability windows (max 4 hours) |
| `bookings` | Appointments with confirmation codes |

### Admin Domain

| Table | Purpose |
|---|---|
| `admins` | Admin accounts (bcrypt-hashed passwords) |

---

## Privacy Boundaries (Enforced at Schema & Query Level)

```
WELLBEING DOMAIN          BOOKING DOMAIN          ADMIN DOMAIN
sessions ──────────────┐
safety_evaluations ────┤   NEVER JOINED          admins
screenings ────────────┘                         (auth only)
```

- **No foreign keys** between wellbeing and booking domains
- **Analytics queries** run separately on each domain
- **Admin booking endpoints** return only booking metadata

---

## Verification

After migrations, verify:
```powershell
# Start backend and check health
uvicorn app.main:app --reload --port 8000
# Visit http://localhost:8000/health → "database": "connected"
```

Or directly:
```sql
psql "postgresql://postgres:your_password@localhost:5432/mental_health" -c "\dt"
```

Should show: `admins`, `bookings`, `counselor_slots`, `counselors`, `safety_evaluations`, `screenings`, `sessions`