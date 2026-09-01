# Project Unknown Web Client (Next.js App Router)

Full-stack Next.js web application for **Project Unknown** providing an end-to-end customer and worker journey: Supabase Auth, natural-language problem description, browser geolocation & manual coordinates, AI requirement extraction, and deterministic PostGIS worker matching.

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
│   │   └── page.tsx           # Customer dashboard with quick actions & recent requests
│   ├── request/
│   │   └── new/
│   │       └── page.tsx       # Create request with browser GPS & manual coordinates
│   ├── requests/
│   │   ├── page.tsx           # My Requests list
│   │   └── [id]/
│   │       ├── page.tsx       # Request detail & AI intent extraction trigger
│   │       └── matches/
│   │           └── page.tsx   # Recommended worker cards ranked by PostGIS
│   └── worker/
│       └── dashboard/
│           └── page.tsx       # Worker dashboard (status, availability toggle, profile)
├── components/
│   ├── navbar.tsx             # Responsive desktop/mobile header navigation
│   ├── worker-card.tsx        # Ranked worker card with score, distance & verified badge
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
│   └── utils.ts               # Coordinate validation & styling helpers
├── providers/
│   └── auth-provider.tsx      # AuthContext provider syncing with /api/v1/auth/me
├── types/
│   ├── user.ts                # UserProfile and AuthSession interfaces
│   ├── service-request.ts     # ServiceRequest and create input types
│   ├── extraction.ts          # AI extraction result and response types
│   └── worker-match.ts        # MatchedWorker and match response types
├── __tests__/
│   ├── utils.test.ts          # Coordinate validation & urgency format tests
│   ├── api-client.test.ts     # API client error code & network failure tests
│   └── types.test.ts          # Type structure tests
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env.local` file in the `web/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Template available in `.env.example`.

---

## 🚀 Local Development Setup

### 1. Install Dependencies
```bash
cd web
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing, Linting & Build

```bash
# Run Vitest test suite
npm test

# Run ESLint validation
npm run lint

# Production Next.js build
npm run build
```

---

## 📱 Mobile Browser & Responsive Design

The web client is built with Tailwind CSS mobile-first principles:
* Responsive navigation drawer on mobile viewports.
* Browser Geolocation API integration (`navigator.geolocation.getCurrentPosition`) for mobile devices.
* Touch-friendly card sizing, urgency selectors, and worker match score callouts.
