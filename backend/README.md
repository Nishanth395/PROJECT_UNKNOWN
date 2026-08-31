# Backend Module (FastAPI Modular Monolith)

FastAPI backend server for **Project Unknown** providing REST APIs for service discovery, worker lookup, canonical skills catalogue, and Supabase JWT authentication.

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
│   │   ├── skills.py       # GET /skills, GET /skills/grouped
│   │   └── workers.py      # GET /workers, GET /workers/{worker_id}
│   ├── schemas/
│   │   ├── auth.py         # AuthenticatedUser and AuthMeResponse schemas
│   │   ├── common.py       # Health, Database Health, and standard error response models
│   │   ├── skill.py        # Skill response and grouping schemas
│   │   └── worker.py       # Worker summary and detail schemas
│   └── services/
│       ├── skill_service.py  # Skill database queries and grouping
│       ├── user_service.py   # Database user lookups by verified JWT sub UUID
│       └── worker_service.py # Worker filtering and profile detail lookups
├── tests/
│   ├── conftest.py         # In-memory test DB fixtures and TestClient
│   ├── test_auth.py        # JWT authentication, headers, expiry, and role guard tests
│   ├── test_health.py      # Health & DB ping endpoint tests
│   ├── test_skills.py      # Skills endpoint tests
│   ├── test_workers.py     # Worker listing, pagination, filtering, and 404 tests
│   └── test_integration_db.py # Integration test suite against live Supabase PostgreSQL
├── requirements.txt        # Python package dependencies
├── .env.example            # Environment variables template (variables only)
└── README.md
```

---

## 🔐 Supabase Authentication & JWT Architecture

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

### How JWT Verification Works:
1. **Authorization Header**: Clients send tokens via standard Bearer scheme:
   ```http
   Authorization: Bearer <access_token>
   ```
2. **Signature & Algorithm Verification**:
   * **HS256/HS384/HS512**: Verified symmetrically using `SUPABASE_JWT_SECRET`.
   * **RS256/ES256**: Verified asymmetrically using Supabase JWKS from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
3. **Claim Validation**:
   * Token expiration (`exp`) is enforced.
   * Subject (`sub`) claim is extracted as the authenticated user's unique UUID.
   * Client-provided `user_id` parameters are **never** trusted; the verified JWT identity is the sole source of truth.
4. **Role Enforcement**:
   * `get_current_auth_user`: Extracts and validates the typed `AuthenticatedUser`.
   * `get_current_user`: Looks up the corresponding profile in `public.users`.
   * `require_customer`: Enforces that `user.role == 'customer'`.
   * `require_worker`: Enforces that `user.role == 'worker'`.

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
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
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
# Run all tests (unit + auth + integration)
pytest -v

# Run authentication tests specifically
pytest tests/test_auth.py -v

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
  * Returns authenticated user identity and `public.users` profile state:
    ```json
    {
      "user_id": "3c023d8c-7f5b-4c4f-9e2c-2b6e1a4d8f90",
      "email": "user@example.com",
      "role": "customer",
      "full_name": "Ramesh Kumar",
      "phone": "+919876543210",
      "avatar_url": null,
      "profile_exists": true
    }
    ```

### 3. Skills Catalogue (Public)
* `GET /skills` (or `/api/v1/skills`)
  * Optional Query Params: `category` (e.g. `Plumbing`, `Electrical`)
  * Returns list of canonical skills.
* `GET /skills/grouped`
  * Returns all skills structured by category.

### 4. Workers Discovery (Public)
* `GET /workers` (or `/api/v1/workers`)
  * Query Params:
    * `limit` (int, default: 20, max: 100)
    * `offset` (int, default: 0)
    * `category` (string, optional)
    * `skill` (string, optional)
  * Returns paginated list of worker profiles and their skills.
* `GET /workers/{worker_id}` (or `/api/v1/workers/{worker_id}`)
  * Path Param: `worker_id` (UUID)
  * Returns detailed worker profile or `404 Not Found`.

---

## 🔮 Future Endpoint Extension Placeholders

The routing architecture is designed to seamlessly mount upcoming feature modules:
* `POST /requests` — Service request creation
* `POST /search/matches` — AI intent extraction & PostGIS spatial matching
* `POST /bookings` — Service engagement bookings
