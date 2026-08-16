# Database

Local development database: **PostgreSQL**.

## Option A — Docker (recommended if Docker is installed)

```powershell
docker compose -f docker/docker-compose.yml up -d db
```

Requires `POSTGRES_USER` and `POSTGRES_PASSWORD` to be set (e.g. in `docker/.env`).

## Option B — Portable binaries (no admin required, Windows)

Used on this machine because Docker is not installed. PostgreSQL 17.11 binaries
live outside the repo at `%LOCALAPPDATA%\PostgreSQL\pgsql`.

Start the server:

```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\PostgreSQL\pgdata" -l "$env:LOCALAPPDATA\PostgreSQL\pgdata\server.log" start
```

Stop:

```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\PostgreSQL\pgdata" stop
```

## Configuration

The backend reads `DATABASE_URL` from `backend/.env` (see `backend/.env.example`).

Connection string format: `postgresql+psycopg://USER:PASSWORD@localhost:5432/mental_health`

The full application schema is introduced in Milestone 2 via Alembic migrations
(`backend/migrations/`). No tables exist yet.