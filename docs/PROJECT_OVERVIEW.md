# Project Overview — Mental Health Support for Students

A privacy-first mental health support pathway for students, built as a modular monolith
with a FastAPI backend and Next.js frontend.

---

## Problem

**Student mental health is a growing crisis**, but existing solutions have critical gaps:

| Gap | Consequence |
|---|---|
| **No anonymous entry** | Students fear stigma, avoid seeking help |
| **AI without safety boundaries** | LLMs can miss crisis signals, hallucinate dangerous advice |
| **No clinical screening integration** | Self-assessment disconnected from support pathway |
| **Booking requires personal info** | Privacy barrier prevents appointment scheduling |
| **Analytics expose individuals** | Aggregate dashboards can re-identify vulnerable students |
| **No multilingual support** | Non-English speakers excluded |

---

## Solution

A **privacy-first platform** with four integrated pathways:

```
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT ENTRY (Anonymous)                    │
│  UUID session + language (en/hi/as) — no accounts, no PII      │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   CHAT        │    │  SCREENING    │    │  RESOURCES    │
│  AI-supported │    │  PHQ-9 / GAD-7│    │  Verified     │
│  emotional    │    │  clinical     │    │  helplines &  │
│  support      │    │  self-screen  │    │  wellbeing    │
└───────┬───────┘    └───────┬───────┘    └───────────────┘
        │                    │
        │         ┌──────────┴──────────┐
        │         ▼                     ▼
        │  ┌─────────┐             ┌─────────┐
        │  │Safety   │             │Booking  │
        │  │follow-up│             │counselor│
        │  └────┬────┘             └────┬────┘
        │       │                       │
        └───────┼───────────────────────┘
                ▼
      ┌─────────────────┐
      │  COUNSELOR      │
      │  BOOKING        │
      │  (anonymous-    │
      │   first,        │
      │   confirmation  │
      │   code)         │
      └─────────────────┘
                │
                ▼
      ┌─────────────────┐
      │   ADMIN         │
      │  DASHBOARD      │
      │  (JWT,          │
      │  aggregate      │
      │  analytics)     │
      └─────────────────┘
```

---

## Target Users

| User | Needs | Platform Provides |
|---|---|---|
| **Students** | Confidential, anonymous emotional support; self-assessment; easy booking | Anonymous chat, PHQ-9/GAD-7, verified resources, anonymous-first booking with confirmation codes |
| **University Counselors** | Manage availability, view appointments, track sessions | Slot management, booking dashboard, status updates |
| **Administrators** | System oversight, aggregate usage stats, safety monitoring | JWT-protected dashboard, aggregate analytics with small-cell suppression, booking management |

---

## Key Features (Implemented)

### 1. Anonymous Student Sessions
- No accounts, no personal data required
- Session = UUID + language code (`en`, `hi`, `as`)
- Created instantly via `POST /api/sessions`

### 2. Deterministic Safety Engine (Authoritative)
- **Offline, keyword-based** — no LLM involved in risk classification
- **Three risk levels:** `NORMAL`, `MODERATE`, `HIGH_RISK`
- **Unicode-aware** — preserves Hindi (Devanagari), Assamese (Bengali) scripts
- **Contextual negation handling** — excludes false positives (`can't stop`, `no one`, etc.)
- **Fail-closed** — if classifiers fail → `HIGH_RISK`
- **2000-char input limit** — enforced at engine boundary
- **42 unit tests, all passing**

### 3. Crisis Flow (No LLM)
- `HIGH_RISK` messages **bypass the LLM entirely**
- Fixed, warm crisis responses with verified helplines
- Category-specific: suicide/self-harm, passive SI, abuse
- Helplines: Tele-MANAS 14416, KIRAN 1800-599-0019, AASRA 98204-66726, Vandrevala, 112, Childline 1098, Women's Helpline 181

### 4. Chat Pipeline
- Rate limited: 10 messages/minute/session
- Safety pre-check → risk decision → crisis OR AI/fallback → output safety check → persist
- **OutputSafetyCheck** — defense in depth on AI responses
- Only safety metadata persisted — **raw message text never stored**

### 5. AI Provider Abstraction
- **DeterministicFallbackProvider** (default) — no LLM needed, keyword templates
- **OllamaProvider** (optional) — local LLM via Ollama, model `qwen3:8b`
- **Qwen3 thinking handled** — reasoning trace discarded, only final answer returned
- **Graceful degradation** — Ollama failure → safe fallback, app remains functional
- **Local CPU inference works** — no GPU required (slow: 40-60s/turn)

### 6. Clinical Screening (PHQ-9 / GAD-7)
- Deterministic, validated scoring
- Exact item count validation (9 for PHQ-9, 7 for GAD-7), responses 0-3
- Severity bands: Minimal → Severe
- **PHQ-9 Item 9 (suicidal ideation) triggers safety workflow:**
  - `POSITIVE_SAFETY_SCREEN` → `MODERATE` risk, requires follow-up
  - Follow-up: `ESCALATE_CRISIS` → `HIGH_RISK` crisis pathway
  - Follow-up: `SUPPORTIVE_CARE` → remains `MODERATE`, counseling pathway
- **Only summary metrics stored** — raw item responses never persisted

### 7. Verified Resources
- Static frontend page with crisis helplines, counseling guidance, wellbeing tools
- Consistency test ensures frontend numbers match authorized helpline set

### 8. Counselor Booking (Anonymous-First)
- No session or contact details required to book
- Ownership proven by `session_id` OR unguessable 8-char `confirmation_code`
- Status state machine: `PENDING → CONFIRMED / COMPLETED / CANCELLED`
- Admin manages counselors, slots, bookings
- **Privacy:** Admin booking responses NEVER expose session_id, chat history, screening data, safety evaluations

### 9. Admin Dashboard (JWT)
- bcrypt-hashed passwords, HS256 hard-pinned
- Login throttled per username and IP
- Timing-safe errors (no user enumeration)
- Aggregate system statistics only

### 10. Analytics (Admin, Aggregate, Privacy-Preserving)
- Day/week/month granularity, configurable lookback
- **Small-cell suppression** (threshold=5) — sensitive cells return `null, suppressed: true`
- **Domain separation** — wellbeing (sessions/screenings/safety) NEVER joined to booking domain
- No row-level student data exposed

### 11. Multilingual Support
- Sessions carry language code
- Backend supports `en`, `hi`, `as`
- Crisis responses localized

---

## What Makes This Different

| Architectural Strength | Why It Matters |
|---|---|
| **Deterministic safety authoritative** | Crisis classification never depends on LLM reliability |
| **HIGH_RISK bypasses LLM entirely** | Zero chance of AI missing/hallucinating crisis response |
| **OutputSafetyCheck defense in depth** | Catches unsafe AI output before student sees it |
| **Fail-closed classifier failure** | Safety bypass impossible even if engine errors |
| **Privacy-by-design persistence** | No raw content stored — only metadata |
| **Domain separation** | Wellbeing data never mixed with operational booking data |
| **Small-cell suppression in analytics** | Individuals cannot be re-identified from aggregate stats |
| **Anonymous-first booking** | Students can book without revealing identity |
| **Local AI optional** | Runs fully offline with deterministic fallback; Ollama is enhancement, not requirement |
| **Unicode-safe normalization** | Non-Latin scripts (Hindi, Assamese) preserved, not bypassed |

---

## Architecture (Summary)

```
Frontend (Next.js 16, TypeScript, Tailwind)
        │
        ▼
FastAPI Backend (Python 3.10+, modular monolith)
        │
        ├── API Routes (health, sessions, chat, screenings, counselors, bookings, admin)
        ├── Services (chat, safety, screening, booking, analytics, output_safety, providers)
        ├── Repositories (data access)
        ├── Models (SQLAlchemy ORM)
        ├── Safety Engine (deterministic, extensible classifier protocol)
        ├── Screening Instruments (PHQ-9, GAD-7)
        └── AI Providers (fallback, Ollama)
        │
        ▼
PostgreSQL 17 (Alembic migrations)
```

---

## Privacy (Summary)

| Principle | Implementation |
|---|---|
| **Anonymous entry** | No accounts, UUID sessions only |
| **Minimal collection** | Only what's needed for function |
| **No raw content storage** | Chat messages, screening items never persisted |
| **Domain separation** | Wellbeing ↔ Booking ↔ Admin never joined |
| **Aggregate-only analytics** | Small-cell suppression (threshold=5) |
| **System-controlled crisis info** | Helplines never generated by AI |
| **Secrets never committed** | `.env` gitignored, `.env.example` placeholders only |

---

## Current Status

| Milestone | Area | Status |
|---|---|---|
| M1 | Foundation: FastAPI, PostgreSQL, Alembic, config | ✅ Done |
| M2 | Anonymous student sessions | ✅ Done |
| M3 | Deterministic safety engine + crisis flow | ✅ Done |
| M4 | Chat pipeline + safety-evaluation persistence | ✅ Done |
| M5 | PHQ-9 / GAD-7 screening + safety follow-up | ✅ Done |
| M6 | Resources + AI provider abstraction (fallback) | ✅ Done |
| M7 | Booking: counselors, slots, appointments | ✅ Done |
| M8 | Admin authentication (JWT) | ✅ Done |
| M9 | Product frontend pages | ✅ Done |
| M10 | AI provider integration: Ollama + `qwen3:8b` | ✅ Done |
| M11 | Multilingual support (`en`, `hi`, `as`) | ✅ Done |
| M12 | Admin analytics (aggregate, small-cell suppression) | ✅ Done |
| M13 | Documentation & developer onboarding | ✅ Done |

**Test Coverage:** 326 backend test functions (pytest + httpx)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.3.1, React 19.2.8, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI ≥0.115, Uvicorn, SQLAlchemy 2.0, psycopg3 |
| Database | PostgreSQL 17, Alembic migrations |
| Auth | python-jose (JWT, HS256 hard-pinned), bcrypt |
| AI (optional) | Ollama local, `qwen3:8b` model |
| Testing | pytest, httpx (326 tests) |
| Linting | ESLint 9, Next.js build (type-check) |

---

## Repository Structure

```
mental-health-app/
├── backend/                  FastAPI modular monolith
│   ├── app/
│   │   ├── api/routes/       HTTP routers
│   │   ├── core/             config, db, languages
│   │   ├── services/         Business logic
│   │   ├── repositories/     Data access
│   │   ├── models/           SQLAlchemy ORM models
│   │   ├── schemas/          Pydantic request/response
│   │   ├── safety/           Deterministic safety engine
│   │   └── screening/        PHQ-9 / GAD-7 instruments
│   ├── migrations/           5 Alembic revisions
│   ├── tests/                326 test functions
│   └── requirements.txt
├── frontend/                 Next.js 16 + TypeScript
│   ├── src/app/(student)/    Student pages
│   ├── src/app/admin/        Admin portal
│   └── src/lib/              API clients, auth, types
├── database/                 PostgreSQL setup notes
├── docker/                   docker-compose.yml (PostgreSQL)
├── docs/                     Architecture, safety, AI, API, security, getting started
└── .env.example              Canonical environment reference
```

---

## Documentation

| Document | Purpose |
|---|---|
| `README.md` | Project front door, quick links |
| `docs/GETTING_STARTED.md` | Step-by-step beginner setup |
| `docs/ARCHITECTURE.md` | Technical architecture & data flows |
| `docs/safety-engine.md` | Safety engine design & guarantees |
| `docs/AI.md` | AI provider abstraction & configuration |
| `docs/API.md` | Complete API endpoint reference |
| `docs/SECURITY-AND-PRIVACY.md` | Implemented security & privacy controls |
| `database/README.md` | Database setup & migrations |
| `frontend/README.md` | Frontend-specific guide |

---

## Not Yet Implemented (Future Work)

- Admin bootstrap CLI (currently manual SQL)
- Refresh tokens / token revocation for admin
- Redis-backed rate limiting for multi-worker
- Automated dependency scanning in CI
- Penetration testing / formal security review
- Additional languages beyond `en`, `hi`, `as`
- Production deployment hardening (TLS, CSP, HSTS)

---

## License

[Specify license — e.g., MIT, Apache 2.0, etc.]

---

## Contact

[Project maintainer contact information]

---

*Built for students. Designed for safety. Engineered for privacy.*