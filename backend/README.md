# Backend Module (FastAPI Modular Monolith)

FastAPI backend server for **Project Unknown** providing REST APIs for service discovery, worker lookup, canonical skills catalogue, Supabase JWT authentication, customer service requests, AI requirement extraction, deterministic PostGIS worker matching, worker profile management, worker job feeds, and full marketplace booking & job lifecycle management.

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
│   │   ├── bookings.py     # POST /bookings, GET /bookings/me, PATCH /bookings/{id}/status, /cancel, /complete
│   │   ├── health.py       # GET /health, GET /health/db
│   │   ├── service_requests.py # POST/GET /service-requests, POST /extract, GET /matches
│   │   ├── skills.py       # GET /skills, GET /skills/grouped
│   │   └── workers.py      # GET/POST/PATCH /workers/me, GET/PUT /workers/me/skills, GET /workers/me/feed
│   ├── schemas/
│   │   ├── ai.py           # AI extraction schemas
│   │   ├── auth.py         # AuthenticatedUser and AuthMeResponse schemas
│   │   ├── booking.py      # Booking create, response, status, and list schemas
│   │   ├── common.py       # Health, Database Health, and standard error response models
│   │   ├── matching.py     # MatchedWorkerItem and WorkerMatchResponse schemas
│   │   ├── service_request.py # Service request request/response schemas
│   │   ├── skill.py        # Skill response and grouping schemas
│   │   ├── worker.py       # Worker profile, skills, and listing schemas
│   │   └── worker_feed.py  # Worker job feed item and response schemas
│   └── services/
│       ├── booking_service.py # Booking creation, list filtering, and atomic status transitions
│       ├── matching_service.py # PostGIS worker matching engine & score calculation
│       ├── service_request_service.py # Service request database operations and PostGIS parsing
│       ├── skill_service.py  # Skill database queries and grouping
│       ├── user_service.py   # Database user lookups by verified JWT sub UUID
│       ├── worker_feed_service.py # Nearby spatial active job filtering for workers
│       └── worker_service.py # Worker filtering, onboarding, profile updates, and skill assignments
├── tests/
│   ├── conftest.py         # In-memory test DB fixtures and TestClient
│   ├── test_ai_extraction.py # AI extraction, provider fallback, and canonical validation tests
│   ├── test_auth.py        # JWT authentication, headers, expiry, and role guard tests
│   ├── test_bookings.py    # Marketplace booking creation, authorization, and state transitions
│   ├── test_health.py      # Health & DB ping endpoint tests
│   ├── test_matching.py    # Deterministic matching formula, spatial filtering, and tie-breaking tests
│   ├── test_service_requests.py # Customer service request lifecycle, security, and validation tests
│   ├── test_skills.py      # Skills endpoint tests
│   ├── test_worker_feed.py # Worker spatial feed, skill matching, and ordering tests
│   ├── test_worker_profile.py # Worker profile onboarding, update, skills management, and security tests
│   ├── test_workers.py     # Worker listing, pagination, filtering, and 404 tests
│   └── test_integration_db.py # Integration test suite against live Supabase PostgreSQL
├── requirements.txt        # Python package dependencies
├── .env.example            # Environment variables template
└── README.md
```

---

## 🔄 Booking Lifecycle & State Machine (Phase 8A)

```text
               ┌───────────────┐
               │    PENDING    │
               └──┬────┬────┬──┘
                  │    │    │
       Worker     │    │    │  Customer
       Accepts    │    │    │  Cancels
                  ▼    │    ▼
         ┌────────────┐│  ┌────────────┐
         │  ACCEPTED  ││  │ CANCELLED  │
         └──┬───────┬─┘│  └────────────┘
            │       │  │
     Worker │       │  │ Worker
  Completes │       │  │ Rejects
            ▼       │  ▼
   ┌───────────┐    │┌───────────┐
   │ COMPLETED │    ││ REJECTED  │
   └───────────┘    │└───────────┘
                    │
                    │ Customer Cancels
                    └──────────────────► (To CANCELLED)
```

### Allowed State Transitions:
* `pending -> accepted` (Worker)
* `pending -> rejected` (Worker)
* `pending -> cancelled` (Customer)
* `accepted -> completed` (Worker)
* `accepted -> cancelled` (Customer)

### Disallowed State Transitions (Return HTTP 409 Conflict):
* Any transition from `completed` (immutable state)
* Any transition from `rejected` or `cancelled`
* `accepted -> rejected` or `pending -> completed`

---

## 📡 API Endpoints Reference

### 1. Health Checks (Public)
* `GET /health` or `GET /api/v1/health`
* `GET /health/db` or `GET /api/v1/health/db`

### 2. Authentication (JWT Protected)
* `GET /auth/me` or `GET /api/v1/auth/me`

### 3. Worker Profile & Feed (Authenticated Worker Only)
* `GET /workers/me` — Fetch authenticated worker profile, rating, location, and skills
* `POST /workers/me` — Complete worker profile onboarding
* `PATCH /workers/me` — Update editable fields (`bio`, `experience_years`, `service_radius_km`, `latitude`, `longitude`, `is_available`, `address_text`)
* `GET /workers/me/skills` — List assigned canonical skills
* `PUT /workers/me/skills` — Assign or replace canonical skills with experience years
* `GET /workers/me/feed` — Get nearby active customer service requests matching worker's skills within operating service radius

### 4. Marketplace Booking Lifecycle (Phase 8A)

#### 1. Create Booking (Authenticated Customer Only)
* `POST /bookings` or `POST /api/v1/bookings`
* Headers: `Authorization: Bearer <customer_jwt>`
```json
{
  "worker_id": "b0000000-0000-0000-0000-000000000001",
  "service_request_id": "e305e940-0255-46fb-a0b4-7b6bb822602e",
  "scheduled_time": "2026-09-02T10:00:00Z",
  "notes": "Please bring pipe replacement washers."
}
```
* **Response (201 Created)**: Starts in `pending` status. Prevents duplicate active bookings and enforces spatial radius.

#### 2. List Bookings (Authenticated Users)
* `GET /bookings/me` or `GET /api/v1/bookings/me`
* Filter by optional `status` query parameter (`pending`, `accepted`, `rejected`, `cancelled`, `completed`).
* Customers receive their requested bookings; Workers receive jobs assigned to them.

#### 3. Accept / Reject Booking (Authenticated Worker Only)
* `PATCH /bookings/{booking_id}/status` or `PATCH /api/v1/bookings/{booking_id}/status`
* Headers: `Authorization: Bearer <worker_jwt>`
```json
{
  "status": "accepted"
}
```
* **Atomic Synchronization**: Accepting a booking atomically updates the associated `ServiceRequest.status` from `'open'`/`'matched'` to `'booked'`.

#### 4. Cancel Booking (Authenticated Customer Only)
* `PATCH /bookings/{booking_id}/cancel` or `PATCH /api/v1/bookings/{booking_id}/cancel`
* Headers: `Authorization: Bearer <customer_jwt>`
* **Rollback Synchronization**: If an accepted booking is cancelled and no other accepted bookings exist for the request, `ServiceRequest.status` reverts from `'booked'` to `'matched'`/`'open'`.

#### 5. Complete Booking (Authenticated Worker Only)
* `PATCH /bookings/{booking_id}/complete` or `PATCH /api/v1/bookings/{booking_id}/complete`
* Headers: `Authorization: Bearer <worker_jwt>`
* **Completion Synchronization**: Transition `accepted -> completed` atomically marks both `Booking.status` and `ServiceRequest.status` as `'completed'`.

### 5. Service Requests & Matching (Authenticated Customer Only)
* `POST /service-requests` — Create new service request
* `GET /service-requests` — List customer's requests
* `GET /service-requests/{request_id}` — Get single request
* `POST /service-requests/{request_id}/extract` — AI intent & requirement extraction
* `GET /service-requests/{request_id}/matches` — PostGIS deterministic worker matching

### 6. Skills Catalogue (Public)
* `GET /skills`
* `GET /skills/grouped`

### 7. Public Worker Directory
* `GET /workers`
* `GET /workers/{worker_id}`
