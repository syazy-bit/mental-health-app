# Security & Privacy Documentation

This document describes the **currently implemented** security and privacy controls.
It does not claim the system is perfectly secure — it documents what exists today.

---

## Authentication

### Student (Anonymous)

- **No accounts, no login, no passwords**
- Session = UUID v4 + language code (`en`, `hi`, `as`)
- Created via `POST /api/sessions`
- Stored in browser `localStorage` (client-side)
- No server-side session tracking beyond UUID

### Admin (JWT)

| Aspect | Implementation |
|---|---|
| **Algorithm** | HS256 — **hard-pinned** in code (`ADMIN_AUTH_ALGORITHM = "HS256"`), not configurable |
| **Secret** | `ADMIN_AUTH_SECRET` env var (placeholder rejected in production) |
| **Token Lifetime** | `ADMIN_AUTH_TOKEN_EXPIRE_MINUTES` (default 1440 = 24h) |
| **Password Hash** | bcrypt (cost factor default) |
| **Login Endpoint** | `POST /api/admin/auth/login` |
| **Auth Header** | `Authorization: Bearer <token>` |
| **Token Validation** | Every `/api/admin/*` route via `get_current_admin` dependency |

**Hardening:**
- Generic error messages: "Invalid credentials" (no user enumeration)
- Timing-safe comparison (bcrypt constant-time)
- Login throttling (see Rate Limiting)

---

## Authorization

| Resource | Access Control |
|---|---|
| Student chat/screening/booking | Anonymous (session UUID only) |
| Admin dashboard/stats | Valid admin JWT |
| Admin booking management | Valid admin JWT |
| Admin analytics | Valid admin JWT |
| Admin user management | Valid admin JWT |

**No role-based access control** — single admin role. All authenticated admins have full access.

---

## Rate Limiting

| Endpoint | Limit | Window | Store | Lockout |
|---|---|---|---|---|
| `POST /api/chat/message` | 10 req | 60 sec / session | In-memory (per-process) | 429 + Retry-After |
| `POST /api/admin/auth/login` | 5 failures | 15 min / (username, IP) | In-memory (per-process) | 15 min |
| `POST /api/admin/auth/login` | 20 failures | 15 min / IP | In-memory (per-process) | 15 min |

**Limitations:**
- In-memory only — **does not work across multiple workers**
- For production multi-worker: use Redis or reverse-proxy rate limiting (nginx)

---

## Safety Engine (Deterministic)

### Authority

**The SafetyEngine is authoritative for crisis classification.** Risk is never decided by the LLM.

### Pipeline Position

```
Student message
      ↓
Input validation (length, non-empty)
      ↓
Rate limiting (10/min/session)
      ↓
SafetyEngine.evaluate()  ← AUTHORITATIVE DECISION POINT
      ↓
HIGH_RISK → Crisis response (NO LLM)
NORMAL/MODERATE → AI Provider → OutputSafetyCheck
```

### Guarantees

| Guarantee | Implementation |
|---|---|
| **HIGH_RISK never reaches LLM** | Service layer checks `assessment.level == HIGH_RISK` before provider call |
| **Fail-closed on classifier failure** | All classifiers fail → `HIGH_RISK` with `classifier_failure` marker |
| **Input length enforced** | 2000 chars at engine boundary (fail-fast `ValueError`) |
| **Unicode-safe** | NFC normalization, preserves Devanagari/Bengali, no silent empty conversion |
| **Negation handled** | Exclusion patterns for `can't stop`, `no one`, `without help`, `there is no`, `not sure` |
| **Crisis responses fixed** | Pre-written warm messages + verified helplines per category |

### Crisis Helplines (System-Controlled)

| Service | Number | Context |
|---|---|---|
| Emergency | 112 | All crises |
| Tele-MANAS | 14416 | Suicide/self-harm/passive SI |
| KIRAN | 1800-599-0019 | Suicide/self-harm |
| AASRA | 98204-66726 | Suicide/self-harm |
| Vandrevala | 1860-2662-345 / 1800-2333-330 | Suicide/self-harm |
| Childline | 1098 | Abuse |
| Women's Helpline | 181 | Abuse |

> ⚠ **Must be re-verified against official sources before production.**

---

## Output Safety Check (Defense in Depth)

Runs on **all AI/fallback responses** (crisis responses are trusted — deterministic).

### Checks

1. **Unsafe pattern detection** (regex):
   - Self-harm encouragement
   - Crisis dismissal
   - Medical advice/prescribing
   - Professional help dismissal
   - Medical diagnosis claims
   - Prompt injection / roleplay attempts

2. **Hallucinated phone number detection**:
   - Crisis numbers are **SYSTEM-CONTROLLED**
   - Any phone-like pattern not in authorized list → reject
   - Authorized: 112, 14416, 1800-599-0019, 98204-66726, 1860-2662-345, 1800-2333-330, 1098, 181

3. **Crisis indicator leakage**:
   - Multiple crisis keywords in non-HIGH_RISK response → flag

### On Failure

**Entire response REJECTED** (not sanitized) → guaranteed-safe fallback per risk level.

---

## Data Privacy

### What Is Stored

| Table | Stored | NOT Stored |
|---|---|---|
| `sessions` | UUID, language, timestamps | Name, email, phone, IP |
| `safety_evaluations` | risk_level, category, matched_patterns (IDs), classifier_sources, language, message_index | **Raw message text**, excerpts, hashes, PII |
| `screenings` | instrument, total_score, severity, safety_flag, item9_score | **Individual item responses** |
| `bookings` | confirmation_code, optional name/email/phone/reason, status | Chat history, screening results, risk levels |

### What Is NEVER Stored

- Raw chat messages
- Raw screening item responses
- Text hashes of messages
- IP addresses (except in-memory login throttle)
- Cross-domain joins (wellbeing ↔ booking)

### Privacy by Design

```
WELLBEING DOMAIN          BOOKING DOMAIN          ADMIN DOMAIN
sessions ──────────────┐
safety_evaluations ────┤   NEVER JOINED          admins
screenings ────────────┘                         (auth only)
```

- **No FKs** between wellbeing and booking tables
- **Analytics queries** separate per domain
- **Admin booking endpoints** return only booking metadata

---

## Analytics Privacy

### Small-Cell Suppression

- `MIN_CELL_SIZE = 5` (configurable in `schemas/analytics.py`)
- Sensitive cells < 5 → `count: null, suppressed: true`
- Applied to: HIGH_RISK counts, risk categories, severity distributions, safety flags
- **NOT applied to**: NORMAL/MODERATE risk levels (low-sensitivity volume), operational totals

### Domain Separation

| Analytics Section | Domain | Cross-Domain Joins |
|---|---|---|
| Sessions, Screenings, Safety | Wellbeing | **Never** |
| Bookings, Counselors | Booking | **Never** |
| Overview totals | Separate counts | **Never** |

### No Provider Metrics

Chat provider (fallback vs ollama) is **not persisted** — only deterministic
`classifier_sources` stored on `safety_evaluations`.

---

## Secret Management

### Environment Variables (`.env` files)

| Variable | Sensitivity | Storage |
|---|---|---|
| `DATABASE_URL` | High (DB credentials) | `backend/.env` (gitignored) |
| `ADMIN_AUTH_SECRET` | Critical (JWT signing) | `backend/.env` (gitignored) |
| `OLLAMA_BASE_URL` | Low | `backend/.env` |
| `NEXT_PUBLIC_API_URL` | Low | `frontend/.env.local` |

### Rules

1. **Never commit `.env` files** — all `.env` in `.gitignore`
2. **`.env.example` only** — placeholders, no real values
3. **Production `ADMIN_AUTH_SECRET`** must be strong: `openssl rand -hex 32`
4. **Backend refuses to start** in production with placeholder secret

---

## Transport Security

### Development

- HTTP localhost (no TLS)
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- CORS: `CORS_ORIGINS` (default `["http://localhost:3000"]`)

### Production Requirements (Not Yet Implemented)

- [ ] TLS termination (nginx reverse proxy)
- [ ] Secure cookies (if session cookies added)
- [ ] HSTS, CSP headers
- [ ] Rate limiting at reverse proxy (multi-worker)
- [ ] Shared throttle store (Redis) for admin login

---

## Known Limitations / Things to Verify Before Production

| Area | Limitation | Recommended Action |
|---|---|---|
| **Rate limiting** | In-memory, per-process only | Add Redis-backed or nginx rate limiting |
| **Admin sessions** | No refresh token, no revocation | Implement token blocklist or short expiry + refresh |
| **Audit logging** | None implemented | Add structured audit logs for admin actions |
| **Helpline numbers** | Not recently verified | Verify against official sources |
| **Multi-language crisis responses** | Only `en`, `hi`, `as` supported | Add more languages or fallback strategy |
| **Database encryption** | Not configured | Enable PostgreSQL TDE or volume encryption |
| **Backup/restore** | Not documented | Document and test backup procedure |
| **Penetration testing** | Not performed | Engage security review before production |
| **Dependency scanning** | Not automated | Add `pip-audit` / `npm audit` to CI |
| **Secrets rotation** | Manual only | Document rotation procedure |

---

## What Should NEVER Be Committed

```
*.env
*.env.local
*.env.*.local
backend/.venv/
frontend/node_modules/
*.pyc
__pycache__/
.pytest_cache/
.coverage
*.log
*.sqlite
*.db
```

---

## Incident Response (Placeholder)

No formal incident response plan exists. Before production:

1. Define security contacts
2. Document breach notification procedure
3. Establish log retention policy
4. Create runbook for common incidents (DB compromise, token leak, etc.)

---

## Summary of Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT-FACING BOUNDARY                      │
│  Anonymous entry → SafetyEngine (deterministic) → Crisis/Chat  │
│  Rate limited (10/min) → OutputSafetyCheck → Metadata only     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN BOUNDARY                             │
│  JWT (HS256) → Throttled login → Aggregate analytics only      │
│  Domain separation → Small-cell suppression → No PII exposure  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA BOUNDARY                              │
│  Wellbeing domain ────── NEVER JOINED ────── Booking domain    │
│  No raw content → Summary metrics only → Encrypted at rest     │
└─────────────────────────────────────────────────────────────────┘
```