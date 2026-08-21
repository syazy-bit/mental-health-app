# Getting Started — Step-by-Step Guide for Beginners

This guide assumes **no prior experience** with this project. It walks you through
every step from zero to a running application.

---

## 1. Prerequisites

You need the following tools installed. Verify each one before continuing.

### Git

```powershell
git --version
```
Expected: `git version 2.x.x` or newer.

### Python 3.10+

```powershell
python --version
```
Expected: `Python 3.10.x` or newer (3.13 works fine).

### Node.js 20.9+ (LTS recommended)

```powershell
node --version
```
Expected: `v20.9.0` or newer.

### npm (bundled with Node.js)

```powershell
npm --version
```
Expected: `10.x.x` or newer.

### PostgreSQL 17

```powershell
psql --version
```
Expected: `psql (PostgreSQL) 17.x`

**If you don't have PostgreSQL installed**, you have two options:
- **Docker** (recommended): Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and use the provided `docker-compose.yml`.
- **Portable binaries (Windows)**: Download PostgreSQL 17 binaries and place them at `%LOCALAPPDATA%\PostgreSQL\pgsql` (see `database/README.md`).

### Ollama (OPTIONAL — only if you want local AI)

```powershell
ollama --version
```
Expected: any recent version.

> **Important:** Ollama is **not required** for basic development. The default
> `AI_PROVIDER=fallback` uses a deterministic provider so the app runs fully
> without a local LLM.

---

## 2. Clone the Repository

```powershell
git clone https://github.com/syazy-bit/mental-health-app.git
cd mental-health-app
```

---

## 3. Backend Setup

All backend commands run from the `backend/` directory.

### 3.1 Create a Virtual Environment

```powershell
cd backend
python -m venv .venv
```

### 3.2 Activate the Virtual Environment

**Windows PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS (bash/zsh):**
```bash
source .venv/bin/activate
```

You should see `(.venv)` at the start of your prompt.

### 3.3 Install Python Dependencies

```powershell
pip install -r requirements.txt
```

### 3.4 Configure Environment Variables

```powershell
Copy-Item .env.example .env
```

Now open `backend/.env` in a text editor and **set `DATABASE_URL`** to your
PostgreSQL connection string. Example:

```ini
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/mental_health
```

> **What is `DATABASE_URL`?** It tells the backend how to connect to PostgreSQL.
> Format: `postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE_NAME`

---

## 4. Database Setup

The application uses **PostgreSQL** as its database. All tables are created via
**Alembic migrations** (versioned schema changes).

### 4.1 Start PostgreSQL

**Option A — Docker (recommended if Docker is installed):**

1. Create `docker/.env` with:
   ```ini
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=mental_health
   ```
2. Start the database:
   ```powershell
   docker compose -f docker/docker-compose.yml up -d db
   ```

**Option B — Portable binaries (Windows, no Docker):**

```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\PostgreSQL\pgdata" -l "$env:LOCALAPPDATA\PostgreSQL\pgdata\server.log" start
```

If the `mental_health` database doesn't exist yet, create it:
```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\createdb.exe" -U postgres mental_health
```

### 4.2 Apply Migrations

```powershell
cd backend
alembic upgrade head
```

> **What does `alembic upgrade head` do?**
> - Alembic is a database migration tool.
> - "Migrations" are versioned SQL scripts that create/update tables.
> - `head` means "the latest version."
> - This command runs all pending migrations in order, creating the complete
>   schema: `sessions`, `safety_evaluations`, `screenings`, `admins`,
>   `counselors`, `counselor_slots`, `bookings`.

### 4.3 Verify the Database Connection

Start the backend (next section) and open:
```
http://localhost:8000/health
```
The `"database"` field should read `"connected"`.

---

## 5. Frontend Setup

All frontend commands run from the `frontend/` directory.

```powershell
cd frontend
npm install
```

No additional environment variables are required for development. The frontend
defaults to calling the backend at `http://localhost:8000`.

---

## 6. Running the Complete Application

You need **three (or four) terminal windows**. Keep each one running.

### Terminal 1 — PostgreSQL (if not using Docker)

```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\PostgreSQL\pgdata" -l "$env:LOCALAPPDATA\PostgreSQL\pgdata\server.log" start
```
*If using Docker, the container runs in the background — no terminal needed.*

### Terminal 2 — Backend

```powershell
cd mental-health-app/backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
- Runs at: `http://localhost:8000`
- Health check: `http://localhost:8000/health`
- API docs (Swagger UI): `http://localhost:8000/docs`

### Terminal 3 — Frontend

```powershell
cd mental-health-app/frontend
npm run dev
```
- Runs at: `http://localhost:3000`

### Terminal 4 — Ollama (OPTIONAL, only if `AI_PROVIDER=ollama`)

```powershell
ollama serve
```
Then in another terminal (or same, if you background it):
```powershell
ollama pull qwen3:8b
```
And set in `backend/.env`:
```ini
AI_PROVIDER=ollama
OLLAMA_TIMEOUT_SECONDS=120
```

---

## 7. Verification — Is Everything Working?

### 7.1 Backend Health
Open: `http://localhost:8000/health`

Expected response:
```json
{
  "status": "ok",
  "service": "mental-health-backend",
  "version": "0.1.0",
  "environment": "development",
  "database": "connected",
  "timestamp": "2026-08-21T12:34:56.789Z"
}
```

### 7.2 API Documentation (Swagger UI)
Open: `http://localhost:8000/docs`

You should see all API endpoints grouped by tag.

### 7.3 Frontend
Open: `http://localhost:3000`

You should see the student landing page with navigation to:
- Chat
- Screening (PHQ-9 / GAD-7)
- Booking
- Resources
- Support Now
- About

### 7.4 Optional: Test AI Chat (if Ollama is running)
1. Go to `http://localhost:3000/chat`
2. Send a message like "I'm feeling stressed about exams"
3. You should get a supportive response

### 7.5 Optional: Test Safety Engine
1. Send a message containing crisis language (e.g., "I want to end my life")
2. You should get an **immediate crisis response** with helpline numbers
3. This response comes from the **deterministic SafetyEngine**, not the AI

---

## 8. Common Issues & Quick Fixes

| Symptom | Fix |
|---------|-----|
| `/health` shows `"database": "unavailable"` | PostgreSQL isn't running. Start it (§4.1). |
| `/health` shows `"database": "not_configured"` | `DATABASE_URL` is empty. Edit `backend/.env`. |
| `psql` / `createdb` not found | Add PostgreSQL `bin` folder to PATH, or use full path. |
| `alembic upgrade head` fails | Check `DATABASE_URL` credentials and that DB exists. |
| `npm run dev` fails | Delete `frontend/node_modules` and `package-lock.json`, then `npm install`. |
| Ollama timeout / connection error | Increase `OLLAMA_TIMEOUT_SECONDS` (e.g., 120) or set `AI_PROVIDER=fallback`. |
| Port 8000 or 3000 already in use | Change port: `uvicorn --port 8001` and update `NEXT_PUBLIC_API_URL`. |
| Admin login fails | No admin exists yet. Create one (see README §10). |

---

## 9. Next Steps

- Read `docs/ARCHITECTURE.md` to understand the system design.
- Read `docs/safety-engine.md` for the safety architecture.
- Run backend tests: `cd backend && pytest`
- Run frontend lint: `cd frontend && npm run lint`
- Run frontend build: `cd frontend && npm run build`

Welcome to the project! 🎉