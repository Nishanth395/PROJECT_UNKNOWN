# Project Unknown Web Client (Next.js App Router)

Full-stack Next.js web application for **Project Unknown** providing an end-to-end customer and worker journey: Supabase Auth, natural-language problem description, browser geolocation & manual coordinates, AI requirement extraction, deterministic PostGIS worker matching, worker job feed, and full marketplace customer & worker booking lifecycle management.

---

## 🗂️ Architecture & Folder Layout

```text
web/
├── app/
│   ├── layout.tsx             # Root layout with AuthProvider and responsive Navbar
│   ├── page.tsx               # Landing page with hero, trade domains & CTAs
│   ├── globals.css            # Tailwind base & custom utility layers
│   ├── login/
│   │   └── page.tsx           # Email/password login with role redirection
│   ├── signup/
│   │   └── page.tsx           # Customer & Worker registration
│   ├── dashboard/
│   │   └── page.tsx           # Customer dashboard with quick actions, booking summary & recent requests
│   ├── bookings/
│   │   ├── page.tsx           # Customer bookings list with status filter tabs
│   │   └── [id]/
│   │       └── page.tsx       # Customer booking detail & cancellation actions
│   ├── request/
│   │   └── new/
│   │       └── page.tsx       # Create request with browser GPS & manual coordinates
│   ├── requests/
│   │   ├── page.tsx           # My Requests list
│   │   └── [id]/
│   │       ├── page.tsx       # Request detail, AI extraction trigger & booking status
│   │       └── matches/
│   │           └── page.tsx   # Recommended worker cards ranked by PostGIS with Request Booking modal
│   └── worker/
│       ├── dashboard/
│       │   └── page.tsx       # Worker dashboard (status, availability toggle, profile)
│       ├── onboarding/
│       │   └── page.tsx       # Worker trade profile setup
│       ├── skills/
│       │   └── page.tsx       # Canonical skills catalogue & experience manager
│       ├── feed/
│       │   ├── page.tsx       # Worker nearby active job feed
│       │   └── [id]/
│       │       └── page.tsx   # Job detail requirement view
│       └── bookings/
│           ├── page.tsx       # Worker bookings list & tabbed manager
│           └── [id]/
│               └── page.tsx   # Worker booking detail with Accept/Reject actions
├── components/
│   ├── navbar.tsx             # Responsive desktop/mobile header navigation (role-aware)
│   ├── worker-card.tsx        # Ranked worker card with score, distance & Request Booking CTA
│   ├── booking-confirmation-modal.tsx # Booking confirmation dialog with date/time picker
│   ├── customer-booking-card.tsx # Customer booking card with status badge & scheduled time
│   ├── worker-booking-card.tsx # Worker booking card with schedule & actions
│   ├── job-feed-card.tsx      # Worker job feed card with distance & match badges
│   ├── request-card.tsx       # Service request card with status & urgency badges
│   ├── loading-spinner.tsx    # Reusable spinner with animated messages
│   └── error-alert.tsx        # Standardized error component with retry action
├── lib/
│   ├── api/
│   │   └── api-client.ts      # Centralized API client with JWT injection & error handling
│   ├── auth/
│   │   └── supabase-client.ts # Supabase client instance with auto-refreshing sessions
│   ├── config/
│   │   └── app-config.ts      # Environment configuration defaults
│   └── utils.ts               # Coordinate validation & booking status styling helpers
├── providers/
│   └── auth-provider.tsx      # AuthContext provider syncing with /api/v1/auth/me
├── types/
│   ├── user.ts                # UserProfile and AuthSession interfaces
│   ├── service-request.ts     # ServiceRequest and create input types
│   ├── extraction.ts          # AI extraction result and response types
│   ├── worker-match.ts        # MatchedWorker and match response types
│   ├── booking.ts             # Booking, BookingCreateInput, BookingStatus types
│   ├── skill.ts               # Canonical Skill and Category grouped types
│   └── worker-profile.ts      # Worker profile and onboarding types
├── __tests__/
│   ├── utils.test.ts          # Coordinate validation & urgency format tests
│   ├── api-client.test.ts     # API client error code & network failure tests
│   ├── types.test.ts          # Type structure tests
│   ├── customer-flow.test.ts  # Customer service request workflow tests
│   ├── customer-booking-flow.test.ts # Customer booking payload & model tests
│   ├── customer-booking-components.test.tsx # WorkerCard, CustomerBookingCard, Modal tests
│   ├── worker-flow.test.ts    # Worker status transition tests
│   ├── worker-components.test.tsx # Worker UI component tests
│   └── worker-card.test.tsx   # Worker card ranking tests
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
└── README.md
```

---

## 🔄 Customer Booking Journey (Phase 8B)

```text
Worker Matches (/requests/[id]/matches)
                  ↓
       Click "Request Booking"
                  ↓
Booking Confirmation Modal (Date/Time + Notes)
                  ↓
POST /api/v1/bookings -> status="pending"
                  ↓
  Customer Bookings (/bookings & /bookings/[id])
                  ↓
       [Worker Accepts / Rejects]
                  ↓
     Accepted  ───►  Completed
        │
        └──────►  Cancelled (via Customer Cancellation)
```

### Booking Status Definitions:
* **`pending`**: *"Waiting for worker response"* — Worker has received the request and has not yet accepted or rejected.
* **`accepted`**: *"Worker has accepted your request"* — Worker confirmed the appointment.
* **`rejected`**: *"Worker declined this request"* — Worker was unavailable or declined.
* **`cancelled`**: *"This booking was cancelled"* — Customer cancelled the pending or accepted engagement.
* **`completed`**: *"Service completed"* — Assigned worker marked the job as successfully completed.

### Customer Cancellation & 409 Conflict Handling:
* Customers can cancel their own bookings when in `pending` or `accepted` status via `PATCH /api/v1/bookings/{id}/cancel`.
* If a worker is no longer available or accepts another booking on the same request concurrently, the client gracefully presents: *"This worker is no longer available for this request."*

---

## ⚙️ Environment Variables

Create a `.env.local` file in the `web/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 🧪 Testing, Linting & Build

```bash
# Run Vitest test suite (44 tests)
npm test

# Run ESLint validation (0 errors, 0 warnings)
npm run lint

# Production Next.js build (15 static/dynamic routes)
npm run build
```
