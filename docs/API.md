# API Reference

This document describes the **actual implemented API endpoints** as of Milestone 12.
All endpoints are defined in `backend/app/api/routes/`.

**Interactive documentation (Swagger UI):** `http://localhost:8000/docs` (when backend running)
**ReDoc:** `http://localhost:8000/redoc`

---

## Authentication Summary

| Endpoint Group | Auth Required | Auth Type |
|---|---|---|
| `/health` | No | — |
| `/api/sessions` | No | Anonymous (UUID) |
| `/api/chat` | No | Anonymous (session_id) |
| `/api/screenings` | No | Anonymous (session_id) |
| `/api/counselors` | No | Public |
| `/api/bookings` | No | Anonymous-first (confirmation_code or session_id) |
| `/api/admin/auth` | No (login) / Yes (me) | JWT (HS256) |
| `/api/admin/*` | Yes | JWT (HS256) |

---

## 1. Health

### GET `/health`

**Purpose:** Liveness/readiness check. Reports database connectivity.

**Auth:** None

**Response (200):**
```json
{
  "status": "ok",
  "service": "mental-health-backend",
  "version": "0.1.0",
  "environment": "development",
  "database": "connected",  // "connected" | "unavailable" | "not_configured"
  "timestamp": "2026-08-21T12:34:56.789Z"
}
```

**Notes:**
- Non-fatal: returns 200 even if DB is down
- `database: "not_configured"` → `DATABASE_URL` not set
- `database: "unavailable"` → DB connection failed

---

## 2. Sessions (Anonymous)

### POST `/api/sessions`

**Purpose:** Create a new anonymous student session.

**Auth:** None

**Request:**
```json
{
  "language": "en"  // optional, default "en"; supported: "en", "hi", "as"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "language": "en",
  "created_at": "2026-08-21T12:34:56.789Z",
  "updated_at": "2026-08-21T12:34:56.789Z"
}
```

### GET `/api/sessions/{session_id}`

**Purpose:** Retrieve session metadata.

**Auth:** None

**Response (200):**
```json
{
  "id": "uuid",
  "language": "en",
  "created_at": "2026-08-21T12:34:56.789Z",
  "updated_at": "2026-08-21T12:34:56.789Z"
}
```

**Errors:** 404 if session not found.

---

## 3. Chat

### POST `/api/chat/message`

**Purpose:** Process a student message through the safety pipeline.

**Auth:** None (requires valid `session_id`)

**Rate Limit:** 10 requests/minute/session (429 if exceeded)

**Request:**
```json
{
  "session_id": "uuid",
  "message": "I'm feeling stressed about exams",
  "history": [                          // optional, max 8 messages (4 turns)
    {"role": "user", "content": "Hi"},
    {"role": "assistant", "content": "Hello! How can I help?"}
  ]
}
```

**Response (200):**
```json
{
  "session_id": "uuid",
  "message_index": 3,
  "risk_level": "NORMAL",           // "NORMAL" | "MODERATE" | "HIGH_RISK"
  "category": "STRESS",             // RiskCategory
  "response": "Stress can build up...",
  "is_crisis": false,
  "language": "en",
  "provider": "deterministic_fallback",  // or "ollama", "crisis", "safe_fallback"
  "model": "qwen3:8b"               // only for ollama provider
}
```

**Pipeline (internal):**
1. Session validation (404 if not found)
2. Input validation (length 1–2000, non-empty)
3. Rate limiting (10/min/session)
4. SafetyEngine evaluation (authoritative)
5. Risk decision:
   - `HIGH_RISK` → crisis response (NO LLM)
   - `NORMAL`/`MODERATE` → AI provider (with fallback on error)
6. OutputSafetyCheck (defense in depth)
7. Persist SafetyEvaluation (with session lock for message_index)
8. Return response

**Errors:**
- 400: Empty message, message > 2000 chars
- 404: Session not found
- 429: Rate limit exceeded (Retry-After header)
- 500: Unexpected error (no internal details leaked)

---

## 4. Screenings (PHQ-9 / GAD-7)

### POST `/api/screenings`

**Purpose:** Submit a PHQ-9 or GAD-7 screening.

**Auth:** None (requires valid `session_id`)

**Request:**
```json
{
  "session_id": "uuid",
  "instrument": "PHQ9",           // "PHQ9" | "GAD7"
  "responses": [1, 0, 2, 1, 0, 1, 2, 0, 1]  // exactly 9 for PHQ-9, 7 for GAD-7; each 0-3
}
```

**Validation:**
- Session must exist
- Instrument must be PHQ9 or GAD7
- Exact item count (9 or 7)
- Each response integer 0–3

**Response (201):**
```json
{
  "id": "uuid",
  "session_id": "uuid",
  "instrument": "PHQ9",
  "total_score": 8,
  "severity": "Mild",
  "safety_flag": false,
  "item9_score": 0,
  "safety_info": null,              // present only if PHQ-9 Item 9 > 0
  "created_at": "2026-08-21T12:34:56.789Z"
}
```

**If PHQ-9 Item 9 > 0 (safety_flag=true):**
```json
{
  "safety_info": {
    "safety_state": "POSITIVE_SAFETY_SCREEN",
    "risk_level": "MODERATE",
    "requires_followup": true,
    "supportive_guidance": "Your responses indicate...",
    "safety_resources": [
      "India: Call 14416 (Tele-MANAS) or 112 (Emergency)",
      "India: Vandrevala Foundation 1860-2662-345 / 1800-2333-330",
      "International: https://findahelpline.com/",
      "If you are in immediate danger, call emergency services (112 in India)"
    ]
  }
}
```

**Errors:**
- 400: Invalid instrument, wrong item count, invalid response values
- 404: Session not found
- 500: Unexpected error

---

### POST `/api/screenings/followup`

**Purpose:** Submit safety follow-up action for PHQ-9 positive Item 9.

**Auth:** None (requires valid `session_id`)

**Request:**
```json
{
  "session_id": "uuid",
  "screening_id": "uuid",
  "action": "ESCALATE_CRISIS"      // "ESCALATE_CRISIS" | "SUPPORTIVE_CARE"
}
```

**Actions:**
- `ESCALATE_CRISIS` → Student indicates current/imminent danger
  - New state: `HIGH_RISK_AFTER_SAFETY_FOLLOWUP`, risk_level: `HIGH_RISK`
  - Crisis pathway resources returned
- `SUPPORTIVE_CARE` → Student chooses supportive resources
  - State remains: `POSITIVE_SAFETY_SCREEN`, risk_level: `MODERATE`
  - Counseling pathway resources returned

**Only valid for:** PHQ-9 screenings with Item 9 > 0 (state = `POSITIVE_SAFETY_SCREEN`)

**Response (200):**
```json
{
  "screening_id": "uuid",
  "action": "ESCALATE_CRISIS",
  "new_safety_state": "HIGH_RISK_AFTER_SAFETY_FOLLOWUP",
  "new_risk_level": "HIGH_RISK",
  "supportive_guidance": "You indicated current or imminent danger...",
  "safety_resources": [
    "India: Call 14416 (Tele-MANAS) or 112 (Emergency) NOW",
    "India: Vandrevala Foundation 1860-2662-345 / 1800-2333-330",
    "International: https://findahelpline.com/",
    "Go to nearest emergency department"
  ]
}
```

**Errors:**
- 400: Invalid action, screening not in follow-up state
- 404: Session/screening not found
- 500: Unexpected error

---

## 5. Counselors (Public)

### GET `/api/counselors`

**Purpose:** List active university counseling staff.

**Auth:** None

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Dr. Priya Sharma",
    "title": "Senior Counselor",
    "areas_of_support": ["anxiety", "depression", "academic stress"],
    "bio": "Experienced counselor...",
    "is_active": true,
    "created_at": "2026-08-21T12:34:56.789Z",
    "updated_at": "2026-08-21T12:34:56.789Z"
  }
]
```

---

### GET `/api/counselors/{counselor_id}/slots`

**Purpose:** List future available appointment times for a counselor.

**Auth:** None

**Response (200):**
```json
[
  {
    "id": "uuid",
    "counselor_id": "uuid",
    "starts_at": "2026-08-25T10:00:00Z",
    "ends_at": "2026-08-25T11:00:00Z",
    "created_at": "2026-08-21T12:34:56.789Z"
  }
]
```

**Errors:** 404 if counselor not found or not active.

---

## 6. Bookings (Anonymous-First)

### POST `/api/bookings`

**Purpose:** Create an appointment booking.

**Auth:** None (anonymous-first)

**Request:**
```json
{
  "slot_id": "uuid",
  "session_id": "uuid",              // optional
  "student_name": "Alex",            // optional
  "contact_email": "alex@example.com",  // optional
  "contact_phone": "+91-9876543210", // optional
  "reason": "Anxiety about exams"    // optional
}
```

**Ownership:** Proven by `session_id` (if provided) OR `confirmation_code` (returned).

**Response (201):**
```json
{
  "id": "uuid",
  "slot_id": "uuid",
  "session_id": "uuid",
  "confirmation_code": "A7K9M2N4",  // 8 chars, unguessable
  "student_name": "Alex",
  "contact_email": "alex@example.com",
  "contact_phone": "+91-9876543210",
  "reason": "Anxiety about exams",
  "status": "PENDING",
  "admin_notes": null,
  "created_at": "2026-08-21T12:34:56.789Z",
  "updated_at": "2026-08-21T12:34:56.789Z"
}
```

**Errors:**
- 400: Session not found (if provided)
- 404: Slot not found
- 409: Slot already booked, slot unavailable, counselor inactive
- 422: Slot in past, invalid data

---

### GET `/api/bookings/status/{confirmation_code}`

**Purpose:** Minimal public appointment-status lookup by confirmation code.

**Auth:** None

**Response (200):**
```json
{
  "confirmation_code": "A7K9M2N4",
  "status": "CONFIRMED",
  "counselor_name": "Dr. Priya Sharma",
  "starts_at": "2026-08-25T10:00:00Z",
  "ends_at": "2026-08-25T11:00:00Z"
}
```

**Privacy:** Returns only status + appointment identity. Never returns booking_id,
student contact, reason, admin_notes, or session_id. Unknown codes → 404.

---

### GET `/api/bookings/{booking_id}`

**Purpose:** View a booking (requires ownership proof).

**Auth:** None (ownership via query params)

**Query Parameters:**
- `session_id` (optional UUID)
- `code` (optional confirmation_code)

**Ownership:** Must match `session_id` OR `confirmation_code`. Otherwise 404.

**Response (200):** Full `BookingResponse` (includes contact fields, reason).

**Errors:** 404 if not found or ownership mismatch.

---

### PATCH `/api/bookings/{booking_id}/cancel`

**Purpose:** Cancel a booking (only PENDING or CONFIRMED).

**Auth:** None (ownership via query params)

**Query Parameters:** Same as GET (session_id or code)

**Response (200):** Updated booking with `status: "CANCELLED"`

**Errors:** 404 if not found/ownership mismatch, 409 if status not cancellable.

---

## 7. Admin Authentication

### POST `/api/admin/auth/login`

**Purpose:** Authenticate admin, return JWT access token.

**Auth:** None

**Rate Limit:** 5 failures/15min per username, 20/15min per IP (lockout 15min)

**Request:**
```json
{
  "username": "admin",
  "password": "secret"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Errors:**
- 401: Invalid credentials (generic message — no user enumeration)
- 429: Too many attempts (Retry-After header)

---

### GET `/api/admin/auth/me`

**Purpose:** Get current authenticated admin info.

**Auth:** JWT Bearer token required

**Response (200):**
```json
{
  "id": "uuid",
  "username": "admin",
  "is_active": true,
  "created_at": "2026-08-21T12:34:56.789Z",
  "updated_at": "2026-08-21T12:34:56.789Z"
}
```

**Errors:** 401 if token invalid/expired.

---

## 8. Admin Dashboard & Management

### GET `/api/admin/dashboard`

**Purpose:** System statistics (admin only).

**Auth:** JWT Bearer token required

**Response (200):**
```json
{
  "admin": "admin",
  "statistics": {
    "total_sessions": 150,
    "total_screenings": 45,
    "total_safety_evaluations": 1200,
    "screenings_by_instrument": {"PHQ9": 30, "GAD7": 15},
    "safety_flagged_screenings": 3,
    "risk_level_distribution": {
      "NORMAL": 800,
      "MODERATE": 350,
      "HIGH_RISK": 50
    }
  }
}
```

---

### GET `/api/admin/admins`

**Purpose:** List all admins (password hashes excluded).

**Auth:** JWT Bearer token required

**Response (200):**
```json
{
  "admins": [
    {
      "id": "uuid",
      "username": "admin",
      "is_active": true,
      "created_at": "2026-08-21T12:34:56.789Z",
      "updated_at": "2026-08-21T12:34:56.789Z"
    }
  ]
}
```

---

## 9. Admin Booking Management

### GET `/api/admin/bookings`

**Purpose:** List all bookings (optionally filtered by status).

**Auth:** JWT Bearer token required

**Query:** `status_filter` (optional: PENDING, CONFIRMED, CANCELLED, COMPLETED)

**Response (200):** List of `AdminBookingResponse` (booking metadata only — NEVER exposes session_id, chat history, screening data, or safety evaluations).

---

### GET `/api/admin/bookings/{booking_id}`

**Purpose:** Fetch single booking for admin UI.

**Auth:** JWT Bearer token required

**Privacy:** Same as list — no wellbeing data exposed.

---

### PATCH `/api/admin/bookings/{booking_id}/status`

**Purpose:** Update booking status (state machine enforced).

**Auth:** JWT Bearer token required

**Request:**
```json
{
  "status": "CONFIRMED",      // PENDING→CONFIRMED/CANCELLED; CONFIRMED→CANCELLED/COMPLETED
  "admin_notes": "Confirmed by admin"  // optional
}
```

**State Machine:**
```
PENDING → CONFIRMED, CANCELLED
CONFIRMED → CANCELLED, COMPLETED
CANCELLED → (no transitions)
COMPLETED → (no transitions)
```

---

### POST `/api/admin/counselors`

**Purpose:** Create a counselor profile.

**Auth:** JWT Bearer token required

**Request:**
```json
{
  "name": "Dr. New Counselor",
  "title": "Counselor",
  "areas_of_support": ["anxiety", "relationships"],
  "bio": "Brief bio...",
  "is_active": true
}
```

---

### GET `/api/admin/counselors`

**Purpose:** List ALL counselors (active + inactive) for admin UI.

**Auth:** JWT Bearer token required

---

### PATCH `/api/admin/counselors/{counselor_id}`

**Purpose:** Update counselor profile/activation state.

**Auth:** JWT Bearer token required

**Request:** Any subset of fields (uses `model_fields_set` to distinguish "not provided" from "explicitly cleared").

---

### GET `/api/admin/counselors/{counselor_id}/slots`

**Purpose:** List all future slots for a counselor with booking status.

**Auth:** JWT Bearer token required

**Privacy:** Slot metadata + booking status only. Never student name, contact, reason, or session_id.

---

### DELETE `/api/admin/counselors/{counselor_id}/slots/{slot_id}`

**Purpose:** Delete an unused, not-yet-started slot.

**Auth:** JWT Bearer token required

**Errors:** 404 if not found, 422 if already started, 409 if active booking exists.

---

### POST `/api/admin/counselors/{counselor_id}/slots`

**Purpose:** Add an availability slot for a counselor.

**Auth:** JWT Bearer token required

**Request:**
```json
{
  "starts_at": "2026-08-25T10:00:00Z",
  "ends_at": "2026-08-25T11:00:00Z"
}
```

**Validation:** End > start, max 4 hours, future only, no overlaps.

---

## 10. Admin Analytics

### GET `/api/admin/analytics`

**Purpose:** Aggregate admin analytics dashboard.

**Auth:** JWT Bearer token required

**Query Parameters:**
- `granularity`: "day" | "week" | "month" (default: "day")
- `days`: lookback window in days (1–3650, default: 30)

**Response (200):** `AnalyticsResponse` with sections:

```json
{
  "generated_at": "2026-08-21T12:34:56.789Z",
  "overview": {
    "total_sessions": 150,
    "total_screenings": 45,
    "total_safety_evaluations": 1200,
    "total_bookings": 40,
    "active_counselors": 5,
    "total_counselor_slots": 120,
    "booking_completion_rate": 0.75,
    "booking_cancellation_rate": 0.1
  },
  "sessions": {
    "over_time": [{"bucket": "2026-08-20", "count": 10}, ...],
    "language_distribution": [{"language": "en", "count": 100}, {"language": "hi", "count": 50}],
    "average_messages_per_session": 8.0
  },
  "screenings": {
    "by_instrument": [{"instrument": "PHQ9", "count": 30}, {"instrument": "GAD7", "count": 15}],
    "severity_distribution": [
      {"instrument": "PHQ9", "severity": "Mild", "count": 10, "suppressed": false}
    ],
    "safety_flag_rate": {"value": 0.067, "suppressed": false}
  },
  "safety": {
    "risk_level_distribution": [
      {"risk_level": "NORMAL", "count": 800, "suppressed": false},
      {"risk_level": "MODERATE", "count": 350, "suppressed": false},
      {"risk_level": "HIGH_RISK", "count": null, "suppressed": true}  // small-cell suppression
    ],
    "risk_category_distribution": [...],
    "risk_trends": [{"bucket": "2026-08-20", "risk_level": "HIGH_RISK", "count": null, "suppressed": true}, ...]
  },
  "bookings": {
    "by_status": [...],
    "funnel": [...],
    "cancellation_rate": 0.1,
    "over_time": [...]
  },
  "counselors": [
    {
      "counselor_id": "uuid",
      "name": "Dr. Priya Sharma",
      "is_active": true,
      "total_slots": 20,
      "booked_slots": 15,
      "completed_bookings": 10,
      "pending_bookings": 3,
      "cancelled_bookings": 2,
      "utilization_rate": 0.75
    }
  ]
}
```

**Privacy Rules Enforced:**
- Aggregate-only (no row-level data)
- **Small-cell suppression** (MIN_CELL_SIZE=5): sensitive cells < 5 → `count: null, suppressed: true`
- **Domain separation**: wellbeing domain NEVER joined to booking domain
- NORMAL/MODERATE risk levels NOT suppressed (low-sensitivity volume)
- HIGH_RISK and risk categories ARE suppressed below threshold

---

## Error Response Format

All errors follow FastAPI standard:

```json
{
  "detail": "Human-readable error message"
}
```

Validation errors (422):
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "missing"
    }
  ]
}
```

---

## Rate Limits Summary

| Endpoint | Limit | Window | Response on Exceed |
|---|---|---|---|
| `/api/chat/message` | 10 req | 60 sec / session | 429 + Retry-After |
| `/api/admin/auth/login` | 5 failures | 15 min / (username, IP) | 429 + Retry-After |
| `/api/admin/auth/login` | 20 failures | 15 min / IP | 429 + Retry-After |

---

## CORS

Configured via `CORS_ORIGINS` (default: `["http://localhost:3000"]`).
Allows credentials, all methods, all headers.