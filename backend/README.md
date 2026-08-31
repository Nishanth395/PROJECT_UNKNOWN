# Backend Module (FastAPI Modular Monolith)

FastAPI backend server for **Project Unknown** providing REST APIs for service discovery, worker lookup, canonical skills catalogue, Supabase JWT authentication, customer service requests, AI requirement extraction, deterministic PostGIS worker matching, and worker profile onboarding & management.

---

## 🗂️ Architecture & Folder Layout

```text
backend/
├── app/
│   ├── main.py             # FastAPI app initialization, CORS, and router registration
│   ├── ai/                 # AI Intent & Requirement Extraction Module
│   │   ├── base.py         # Abstract AIProvider interface
│   │   ├── schemas.py      # ServiceRequirementExtraction and ExtractionResponse models
│   │   ├── service.py      # AIExtractionService (canonical catalogue validation & updates)
│   │   └── providers/
│   │       ├── fallback_provider.py # Deterministic keyword-based extractor for offline/tests
│   │       └── gemini_provider.py   # Google Gemini 1.5 Flash LLM provider
│   ├── core/
│   │   ├── config.py       # Pydantic Settings reading environment variables
│   │   └── security.py     # Supabase JWT validation & role authorization dependencies
│   ├── db/
│   │   ├── database.py     # SQLAlchemy sessionmaker & get_db dependency
│   │   └── models.py       # SQLAlchemy ORM entity definitions
│   ├── routers/
│   │   ├── auth.py         # GET /auth/me (JWT-protected profile lookup)
│   │   ├── health.py       # GET /health, GET /health/db
│   │   ├── service_requests.py # POST/GET /service-requests, POST /extract, GET /matches
│   │   ├── skills.py       # GET /skills, GET /skills/grouped
│   │   └── workers.py      # GET/POST/PATCH /workers/me, GET/PUT /workers/me/skills, GET /workers/{id}
│   ├── schemas/
│   │   ├── ai.py           # AI extraction schemas
│   │   ├── auth.py         # AuthenticatedUser and AuthMeResponse schemas
│   │   ├── common.py       # Health, Database Health, and standard error response models
│   │   ├── matching.py     # MatchedWorkerItem and WorkerMatchResponse schemas
│   │   ├── service_request.py # Service request request/response schemas
│   │   ├── skill.py        # Skill response and grouping schemas
│   │   └── worker.py       # Worker profile, skills, and listing schemas
│   └── services/
│       ├── matching_service.py # PostGIS worker matching engine & score calculation
│       ├── service_request_service.py # Service request database operations and PostGIS parsing
│       ├── skill_service.py  # Skill database queries and grouping
│       ├── user_service.py   # Database user lookups by verified JWT sub UUID
│       └── worker_service.py # Worker filtering, onboarding, profile updates, and skill assignments
├── tests/
│   ├── conftest.py         # In-memory test DB fixtures and TestClient
│   ├── test_ai_extraction.py # AI extraction, provider fallback, and canonical validation tests
│   ├── test_auth.py        # JWT authentication, headers, expiry, and role guard tests
│   ├── test_health.py      # Health & DB ping endpoint tests
│   ├── test_matching.py    # Deterministic matching formula, spatial filtering, and tie-breaking tests
│   ├── test_service_requests.py # Customer service request lifecycle, security, and validation tests
│   ├── test_skills.py      # Skills endpoint tests
│   ├── test_worker_profile.py # Worker profile onboarding, update, skills management, and security tests
│   ├── test_workers.py     # Worker listing, pagination, filtering, and 404 tests
│   └── test_integration_db.py # Integration test suite against live Supabase PostgreSQL
├── requirements.txt        # Python package dependencies
├── .env.example            # Environment variables template (variables only)
└── README.md
```

---

## 🛠️ Worker Onboarding & Profile Management (Phase 6A)

Workers can onboard, configure their trade skills, adjust their dispatch radius, update their base coordinates, and toggle real-time availability.

### Security & Integrity Rules:
* Protected by `require_worker` FastAPI dependency.
* Identity `user_id` is strictly derived from the verified Supabase JWT `sub` claim.
* Client attempts to modify `rating`, `total_reviews`, `is_verified`, `worker_id`, or `user_id` are ignored/prevented.
* Canonical skills are validated against `public.skills` and duplicates are safely deduplicated.

---

## 📡 API Endpoints Reference

### 1. Health Checks (Public)
* `GET /health` or `GET /api/v1/health`
* `GET /health/db` or `GET /api/v1/health/db`

### 2. Authentication (JWT Protected)
* `GET /auth/me` or `GET /api/v1/auth/me`

### 3. Worker Profile & Skills Management (Authenticated Worker Only)
* `GET /workers/me` (or `/api/v1/workers/me`) — Fetch own worker profile, rating, location, and skills
* `POST /workers/me` — Complete initial worker profile onboarding
* `PATCH /workers/me` — Update editable fields (`bio`, `experience_years`, `service_radius_km`, `latitude`, `longitude`, `is_available`, `address_text`)
* `GET /workers/me/skills` — List assigned canonical skills
* `PUT /workers/me/skills` — Assign or replace canonical skills with experience years

### 4. Service Requests & Matching (Authenticated Customer Only)
* `POST /service-requests` — Create new service request
* `GET /service-requests` — List customer's requests
* `GET /service-requests/{request_id}` — Get single request
* `POST /service-requests/{request_id}/extract` — AI intent & requirement extraction
* `GET /service-requests/{request_id}/matches` — PostGIS deterministic worker matching

### 5. Skills Catalogue (Public)
* `GET /skills`
* `GET /skills/grouped`

### 6. Public Worker Directory
* `GET /workers`
* `GET /workers/{worker_id}`
