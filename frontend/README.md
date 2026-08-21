# Frontend — Mental Health Support for Students

Next.js 16 + TypeScript + Tailwind CSS (App Router, `src/` layout).

This is the **student-facing and admin portal** for the mental health support platform.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.1 |
| UI | React | 19.2.8 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Linting | ESLint 9 + eslint-config-next | ^9 |
| Package Manager | npm | (package-lock.json) |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (student)/           # Student pages (route group)
│   │   │   ├── layout.tsx       # Student shell (AppShell, DisclaimerStrip)
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── chat/            # AI-supported chat
│   │   │   ├── screening/       # PHQ-9 & GAD-7 screening
│   │   │   │   ├── phq9/        # PHQ-9 questionnaire
│   │   │   │   ├── gad7/        # GAD-7 questionnaire
│   │   │   │   └── result/      # Screening results + safety follow-up
│   │   │   ├── booking/         # Counselor booking flow
│   │   │   │   ├── page.tsx     # Counselor list
│   │   │   │   ├── slots/       # Available slots for a counselor
│   │   │   │   ├── confirm/     # Booking confirmation
│   │   │   │   ├── status/      # Status lookup by confirmation code
│   │   │   │   └── [bookingId]/ # Booking details (ownership required)
│   │   │   ├── resources/       # Verified crisis helplines & wellbeing resources
│   │   │   ├── support-now/     # Immediate crisis resources
│   │   │   └── about/           # About the platform
│   │   ├── admin/               # Admin portal
│   │   │   ├── login/           # Admin login page
│   │   │   └── (protected)/     # Protected admin routes (route group)
│   │   │       ├── layout.tsx   # Admin shell (AdminShell, AdminGuard)
│   │   │       ├── page.tsx     # Admin dashboard
│   │   │       ├── analytics/   # Aggregate analytics dashboard
│   │   │       ├── bookings/    # Booking management
│   │   │       │   └── [id]/    # Booking detail + status update
│   │   │       ├── counselors/  # Counselor management
│   │   │       └── availability/ # Counselor slot management
│   │   ├── globals.css          # Global styles (Tailwind v4)
│   │   ├── layout.tsx           # Root layout
│   │   └── favicon.ico
│   ├── components/
│   │   ├── shell/               # App shell components
│   │   │   ├── AppShell.tsx     # Main layout wrapper
│   │   │   ├── DesktopHeader.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── DisclaimerStrip.tsx
│   │   ├── admin/               # Admin-specific components
│   │   │   ├── AdminGuard.tsx   # Client-side route protection
│   │   │   ├── AdminShell.tsx   # Admin layout with sidebar
│   │   │   └── ConfirmDialog.tsx
│   │   └── ui/                  # Reusable UI primitives
│   │       ├── Alert.tsx
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Dialog.tsx
│   │       ├── Input.tsx
│   │       └── Select.tsx
│   └── lib/
│       ├── api.ts               # Student API client (fetch wrapper)
│       ├── session.ts           # Session management (localStorage)
│       ├── types.ts             # Shared TypeScript types
│       ├── admin-api.ts         # Admin API client (with JWT)
│       ├── admin-auth.ts        # Admin auth (token storage, login)
│       ├── admin-format.ts      # Admin formatting utilities
│       └── admin-types.ts       # Admin-specific types
├── public/                      # Static assets
├── .env.local                   # Local env (NEXT_PUBLIC_API_URL)
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
└── postcss.config.mjs
```

---

## Key Routes

| Route | Purpose | Auth |
|---|---|---|
| `/` | Student landing page | None |
| `/chat` | AI chat with safety pipeline | Session (localStorage) |
| `/screening` | Screening selection | Session |
| `/screening/phq9` | PHQ-9 questionnaire | Session |
| `/screening/gad7` | GAD-7 questionnaire | Session |
| `/screening/result` | Results + safety follow-up | Session |
| `/booking` | Counselor list | None |
| `/booking/slots/[counselorId]` | Available slots | None |
| `/booking/confirm/[slotId]` | Create booking | None |
| `/booking/status` | Lookup by confirmation code | None |
| `/booking/[bookingId]` | Booking details | Ownership (session/confirmation) |
| `/resources` | Verified helplines & resources | None |
| `/support-now` | Immediate crisis resources | None |
| `/about` | About the platform | None |
| `/admin/login` | Admin login | None |
| `/admin` | Admin dashboard | JWT (AdminGuard) |
| `/admin/analytics` | Aggregate analytics | JWT |
| `/admin/bookings` | Booking management | JWT |
| `/admin/counselors` | Counselor management | JWT |
| `/admin/availability` | Slot management | JWT |

---

## API Client

Two clients in `src/lib/`:

### Student Client (`api.ts`)
- Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
- No authentication
- Methods for sessions, chat, screenings, bookings, counselors

### Admin Client (`admin-api.ts`)
- Same base URL
- Attaches `Authorization: Bearer <token>` header
- Token managed by `admin-auth.ts` (localStorage)
- Methods for dashboard, analytics, bookings, counselors, slots

---

## Authentication

### Student (Anonymous)
- No login
- Session UUID stored in `localStorage` (`session_id`, `language`)
- Created on first visit via `POST /api/sessions`
- Persisted across browser sessions

### Admin (JWT)
- Login at `/admin/login` → `POST /api/admin/auth/login`
- Access token stored in `localStorage` (`admin_token`)
- `AdminGuard` component protects routes client-side
- Token sent via `Authorization: Bearer` header
- Token expires in 24h (configurable via `ADMIN_AUTH_TOKEN_EXPIRE_MINUTES`)

---

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:8000` |

Create `.env.local`:
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (with Turbopack)
npm run dev

# Production build (includes TypeScript type-checking)
npm run build

# Start production server
npm start

# Lint (ESLint 9 + Next.js config)
npm run lint
```

---

## Development Workflow

1. **Start backend first** (see root `docs/GETTING_STARTED.md`)
   - Backend at `http://localhost:8000`
   - API docs at `http://localhost:8000/docs`

2. **Start frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   - Frontend at `http://localhost:3000`
   - Proxies API calls to `NEXT_PUBLIC_API_URL`

3. **Make changes**
   - Hot reload enabled for both frontend and backend
   - TypeScript errors shown in terminal and browser overlay

4. **Before committing**
   ```bash
   npm run lint    # Must pass
   npm run build   # Must pass (type-checks + production build)
   ```

---

## Relationship with Backend

```
Frontend (Next.js)          Backend (FastAPI)
     │                           │
     ├── GET /health ──────────► │
     ├── POST /api/sessions ───► │
     ├── POST /api/chat/message ► │
     ├── POST /api/screenings ──► │
     ├── GET /api/counselors ───► │
     ├── POST /api/bookings ────► │
     ├── POST /api/admin/auth/login (admin)
     └── GET /api/admin/* ──────► │ (JWT required)
```

- **No direct database access** — all data via REST API
- **CORS** configured in backend (`CORS_ORIGINS`)
- **Shared types** — TypeScript types in `src/lib/types.ts` mirror backend Pydantic schemas

---

## Notable Implementation Details

### Route Groups
- `(student)` — applies `AppShell` layout to all student pages
- `(protected)` — applies `AdminShell` + `AdminGuard` to admin pages

### Session Management
- `src/lib/session.ts` handles `localStorage` read/write
- Auto-creates session on first page load if missing
- Language preference persisted

### Admin Auth Flow
1. User submits credentials at `/admin/login`
2. `admin-auth.ts` calls `POST /api/admin/auth/login`
3. On success: token stored in `localStorage`, redirect to `/admin`
4. `AdminGuard` checks token on each protected route
5. `admin-api.ts` auto-attaches token to requests

### Safety Integration
- Chat page calls `POST /api/chat/message`
- Displays `risk_level`, `is_crisis` badges
- Crisis responses (`is_crisis: true`) shown with distinct styling
- No client-side safety logic — all authoritative on backend

---

## Building for Production

```bash
npm run build
npm start
```

- Output in `.next/`
- Runs on port 3000 (configurable)
- Set `NEXT_PUBLIC_API_URL` to production backend URL
- Ensure backend `CORS_ORIGINS` includes production frontend origin

---

## Common Issues

| Issue | Fix |
|---|---|
| API calls fail (CORS) | Check backend `CORS_ORIGINS` includes `http://localhost:3000` |
| Admin redirect loop | Clear `localStorage` (corrupted token) |
| Type errors after backend changes | Regenerate types or update `src/lib/types.ts` manually |
| Tailwind styles not applying | Ensure `globals.css` has `@import "tailwindcss"` (v4 syntax) |