# Backend Module (FastAPI Modular Monolith)

FastAPI backend server for **Project Unknown** providing REST APIs for service discovery, worker lookup, canonical skills catalogue, Supabase JWT authentication, and customer service requests.

---

## 🗂️ Architecture & Folder Layout

```text
backend/
├── app/
│   ├── main.py             # FastAPI app initialization, CORS, and router registration
│   ├── core/
│   │   ├── config.py       # Pydantic Settings reading environment variables
│   │   └── security.py     # Supabase JWT validation & role authorization dependencies
│   ├── db/
│   │   ├── database.py     # SQLAlchemy sessionmaker & get_db dependency
│   │   └── models.py       # SQLAlchemy ORM entity definitions
│   ├── routers/
│   │   ├── auth.py         # GET /auth/me (JWT-protected profile lookup)
│   │   ├── health.py       # GET /health, GET /health/db
│   │   ├── service_requests.py # POST/GET /service-requests (Customer service requests)
│   │   ├── skills.py       # GET /skills, GET /skills/grouped
│   │   └── workers.py      # GET /workers, GET /workers/{worker_id}
│   ├── schemas/
│   │   ├── auth.py         # AuthenticatedUser and AuthMeResponse schemas
│   │   ├── common.py       # Health, Database Health, and standard error response models
│   │   ├── service_request.py # Service request request/response schemas
│   │   ├── skill.py        # Skill response and grouping schemas
│   │   └── worker.py       # Worker summary and detail schemas
│   └── services/
│       ├── service_request_service.py # Service request database operations and PostGIS parsing
│       ├── skill_service.py  # Skill database queries and grouping
│       ├── user_service.py   # Database user lookups by verified JWT sub UUID
│       └── worker_service.py # Worker filtering and profile detail lookups
├── tests/
│   ├── conftest.py         # In-memory test DB fixtures and TestClient
│   ├── test_auth.py        # JWT authentication, headers, expiry, and role guard tests
│   ├── test_health.py      # Health & DB ping endpoint tests
│   ├── test_service_requests.py # Customer service request lifecycle, security, and validation tests
│   ├── test_skills.py      # Skills endpoint tests
│   ├── test_workers.py     # Worker listing, pagination, filtering, and 404 tests
│   └── test_integration_db.py # Integration test suite against live Supabase PostgreSQL
├── requirements.txt        # Python package dependencies
├── .env.example            # Environment variables template (variables only)
└── README.md
```

---

## 🔐 Supabase Authentication & Identity Architecture

Project Unknown uses Supabase Auth for client authentication and identity management:

```text
Flutter App / Web Client
       ↓  (1. Sign in / Sign up)
  Supabase Auth
       ↓  (2. Returns signed JWT access token)
  Flutter App
       ↓  (3. Passes "Authorization: Bearer <JWT>")
FastAPI Backend (app/core/security.py)
       ↓  (4. Verifies JWT signature, exp, and extracts 'sub')
       ↓  (5. Queries public.users using verified user_id)
PostgreSQL Database
```

### Identity Enforcement:
* **Source of Truth**: `customer_id` is **always** obtained from the verified JWT `sub` claim via `require_customer`.
* **Client Isolation**: Client-supplied `customer_id` fields in request bodies or query parameters are strictly ignored.
* **Role Guards**: Endpoints requiring customer access use `require_customer`, returning `403 Forbidden` for worker accounts.

---

## ⚙️ Environment Variables

The backend loads configuration from `backend/.env` or the project root `.env`.

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PROJECT_NAME` | Name of the service | `"Project Unknown API"` |
| `ENVIRONMENT` | Environment name | `"development"` |
| `PORT` | Local server port | `8000` |
| `SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Anon API Key | `your-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `your-service-role-key` |
| `SUPABASE_JWT_SECRET` | Secret to verify JWT signatures | `your-supabase-jwt-secret` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:6543/postgres?sslmode=require` |
| `AI_API_KEY` | LLM API Key (Gemini / OpenAI) | `your-ai-api-key` |
| `MAPS_API_KEY` | Google Maps SDK Key | `your-maps-api-key` |
| `CORS_ORIGINS` | Allowed origins list | `http://localhost:3000,http://10.0.2.2:8000` |

---

## 🚀 Local Development Setup

### 1. Virtual Environment & Dependencies
```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# Unix / macOS
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Running the Server
```bash
uvicorn app.main:app --reload --port 8000
```

* **API Base URL**: `http://localhost:8000`
* **Swagger Interactive Docs**: `http://localhost:8000/docs`
* **ReDoc Interactive Docs**: `http://localhost:8000/redoc`

### 3. Running Automated Tests
```bash
# Run all tests (unit + auth + service requests + integration)
pytest -v

# Run authentication tests specifically
pytest tests/test_auth.py -v

# Run service request tests specifically
pytest tests/test_service_requests.py -v

# Run database integration tests against live Supabase
pytest tests/test_integration_db.py -v
```

---

## 📡 API Endpoints Reference

### 1. Health Checks (Public)
* `GET /health` or `GET /api/v1/health`
  * Returns `{ "status": "ok", "service": "project-unknown-backend" }`
* `GET /health/db` or `GET /api/v1/health/db`
  * Returns `{ "status": "ok", "database": "connected" }`

### 2. Authentication (JWT Protected)
* `GET /auth/me` or `GET /api/v1/auth/me`
  * **Header**: `Authorization: Bearer <token>`
  * Returns authenticated user identity and `public.users` profile state.

### 3. Service Requests (Authenticated Customer Only)
* `POST /service-requests` (or `/api/v1/service-requests`)
  * **Header**: `Authorization: Bearer <token>`
  * **Request Body**:
    ```json
    {
      "description": "My ceiling fan isn't working",
      "latitude": 12.9500,
      "longitude": 77.6300,
      "urgency": "normal",
      "address_text": "100ft Road, Indiranagar, Bengaluru"
    }
    ```
  * **Response (`201 Created`)**:
    ```json
    {
      "id": "e305e940-0255-46fb-a0b4-7b6bb822602e",
      "customer_id": "3c023d8c-7f5b-4c4f-9e2c-2b6e1a4d8f90",
      "raw_description": "My ceiling fan isn't working",
      "extracted_category": null,
      "extracted_skills": [],
      "urgency": "normal",
      "status": "open",
      "address_text": "100ft Road, Indiranagar, Bengaluru",
      "latitude": 12.95,
      "longitude": 77.63,
      "created_at": "2026-08-31T09:15:00Z",
      "updated_at": "2026-08-31T09:15:00Z"
    }
    ```

* `GET /service-requests` (or `/api/v1/service-requests`)
  * **Header**: `Authorization: Bearer <token>`
  * **Query Params**: `limit` (default: 20, max: 100), `offset` (default: 0), `status` (optional)
  * Returns paginated list of requests created exclusively by the authenticated customer.

* `GET /service-requests/{request_id}` (or `/api/v1/service-requests/{request_id}`)
  * **Header**: `Authorization: Bearer <token>`
  * **Path Param**: `request_id` (UUID)
  * Returns single service request or `404 Not Found` if nonexistent or owned by another customer.

### 4. Skills Catalogue (Public)
* `GET /skills` (or `/api/v1/skills`)
  * Optional Query Params: `category` (e.g. `Plumbing`, `Electrical`)
  * Returns list of canonical skills.
* `GET /skills/grouped`
  * Returns all skills structured by category.

### 5. Workers Discovery (Public)
* `GET /workers` (or `/api/v1/workers`)
  * Query Params: `limit`, `offset`, `category`, `skill`
  * Returns paginated list of worker profiles and their skills.
* `GET /workers/{worker_id}` (or `/api/v1/workers/{worker_id}`)
  * Path Param: `worker_id` (UUID)
  * Returns detailed worker profile or `404 Not Found`.

---

## 🔮 Future Endpoint Extension Placeholders

The routing architecture is designed to seamlessly mount upcoming feature modules:
* `POST /search/matches` — AI intent extraction & PostGIS spatial matching
* `POST /bookings` — Service engagement bookings
