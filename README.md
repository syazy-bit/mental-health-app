# Mental Health Support for Students

Privacy-first student support pathway: anonymous entry, AI-supported emotional
support, deterministic safety engine, PHQ-9/GAD-7 screening, resource
navigation, counselor booking, and admin dashboard.

## Repository layout

```
v0/            Streamlit prototype — preserved reference implementation
frontend/      Next.js 16 + TypeScript + Tailwind CSS (App Router)
backend/       FastAPI modular monolith (Python)
database/      PostgreSQL local setup
docker/        docker-compose (PostgreSQL)
docs/          Architecture and milestone notes
```

## Status

Milestone 1 complete: foundation. Backend (FastAPI + `/health`), PostgreSQL
connectivity, Alembic scaffold, Next.js scaffold, config/secrets hygiene.
Product features begin in Milestone 2.

## Quick start

### 1. PostgreSQL

See `database/README.md` (Docker or portable binaries).

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env        # then fill in DATABASE_URL
uvicorn app.main:app --reload --port 8000
```

Verify: http://localhost:8000/health

Run tests: `pytest`

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### 4. v0 (reference prototype)

```powershell
cd v0
streamlit run app.py
```

## Migrations

```powershell
cd backend
alembic revision --autogenerate -m "message"
alembic upgrade head
```