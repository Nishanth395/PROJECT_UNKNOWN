# Backend Module (FastAPI Modular Monolith)

FastAPI backend server for **Project Unknown** providing REST APIs for service discovery, worker lookup, canonical skills catalogue, Supabase JWT authentication, customer service requests, AI requirement extraction, and deterministic PostGIS worker matching.

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
│   │   └── workers.py      # GET /workers, GET /workers/{worker_id}
│   ├── schemas/
│   │   ├── ai.py           # AI extraction schemas
│   │   ├── auth.py         # AuthenticatedUser and AuthMeResponse schemas
│   │   ├── common.py       # Health, Database Health, and standard error response models
│   │   ├── matching.py     # MatchedWorkerItem and WorkerMatchResponse schemas
│   │   ├── service_request.py # Service request request/response schemas
│   │   ├── skill.py        # Skill response and grouping schemas
│   │   └── worker.py       # Worker summary and detail schemas
│   └── services/
│       ├── matching_service.py # PostGIS worker matching engine & score calculation
│       ├── service_request_service.py # Service request database operations and PostGIS parsing
│       ├── skill_service.py  # Skill database queries and grouping
│       ├── user_service.py   # Database user lookups by verified JWT sub UUID
│       └── worker_service.py # Worker filtering and profile detail lookups
├── tests/
│   ├── conftest.py         # In-memory test DB fixtures and TestClient
│   ├── test_ai_extraction.py # AI extraction, provider fallback, and canonical validation tests
│   ├── test_auth.py        # JWT authentication, headers, expiry, and role guard tests
│   ├── test_health.py      # Health & DB ping endpoint tests
│   ├── test_matching.py    # Deterministic matching formula, spatial filtering, and tie-breaking tests
│   ├── test_service_requests.py # Customer service request lifecycle, security, and validation tests
│   ├── test_skills.py      # Skills endpoint tests
│   ├── test_workers.py     # Worker listing, pagination, filtering, and 404 tests
│   └── test_integration_db.py # Integration test suite against live Supabase PostgreSQL
├── requirements.txt        # Python package dependencies
├── .env.example            # Environment variables template (variables only)
└── README.md
```

---

## 🎯 Deterministic Worker Matching Engine (Phase 4B)

Project Unknown uses a **deterministic, explainable, database-driven** matching engine to connect customer service requests with qualified local workers. The LLM is used **strictly for intent extraction**; worker selection is calculated entirely via PostGIS and mathematical formulas.

### 1. Matching Pipeline

```text
Service Request (location, extracted_skills, extracted_category)
       ↓
Pre-condition Check: Request MUST have extracted skills (returns 400 if empty)
       ↓
PostGIS Spatial Filter:
  ├── 1. Availability filter: workers.is_available = TRUE
  ├── 2. Skill compatibility: worker has at least 1 worker_skill matching extracted_skills
  ├── 3. Category match: Skill.category matches extracted_category (if specified)
  └── 4. Service Radius: ST_DWithin(worker.location, request.location, worker.service_radius_km * 1000)
       ↓
Distance Calculation: ST_Distance(worker.location, request.location) / 1000.0 (km)
       ↓
Deterministic Scoring Formula (Total: 100 points)
       ↓
Deterministic Tie-Breaking Sort & Limit (Default: 5, Max: 20)
       ↓
Response (WorkerMatchResponse)
```

### 2. Scoring Formula ($0 - 100$ Points)

| Component | Weight | Formula | Description |
| :--- | :--- | :--- | :--- |
| **Skill Match** | $50$ pts | Constant $50.0$ | Worker possesses at least one requested canonical skill |
| **Distance** | $25$ pts | $25.0 \times (1.0 - \frac{\text{distance\_km}}{\text{service\_radius\_km}})$ | Linear normalization relative to worker's own service radius (clamped to $[0, 25]$) |
| **Rating** | $15$ pts | $(\frac{\text{rating}}{5.0}) \times 15.0$ | Normalized against $5.0$ scale (clamped to $[0, 15]$; $0$ if `NULL`) |
| **Experience** | $10$ pts | $\min(\frac{\text{experience\_years}}{10.0}, 1.0) \times 10.0$ | Normalized experience capped at $10$ years (clamped to $[0, 10]$) |

$$\text{match\_score} = \text{skill\_score} + \text{distance\_score} + \text{rating\_score} + \text{experience\_score}$$

### 3. Deterministic Tie-Breaking
When two workers produce identical `match_score` values, the ordering is determined by:
1. **Higher Rating** (`rating DESC`)
2. **Shorter Distance** (`distance_km ASC`)
3. **Higher Experience** (`experience_years DESC`)
4. **Verified Status** (`is_verified DESC`)
5. **Stable Worker UUID** (`str(worker_id) ASC`)

> [!NOTE]
> This engine is a deterministic, explainable rule-based scoring engine for MVP matching. It does not use black-box machine learning ranking.

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
| `AI_PROVIDER` | Active AI provider (`fallback` or `gemini`) | `"fallback"` |
| `AI_API_KEY` | Google Gemini API Key | `your-gemini-api-key` |
| `AI_MODEL` | Gemini model name | `"gemini-1.5-flash"` |
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
# Run full test suite (unit + auth + service requests + AI extraction + matching + live PostGIS)
pytest -v

# Run deterministic matching tests specifically
pytest tests/test_matching.py -v
```

---

## 📡 API Endpoints Reference

### 1. Health Checks (Public)
* `GET /health` or `GET /api/v1/health`
* `GET /health/db` or `GET /api/v1/health/db`

### 2. Authentication (JWT Protected)
* `GET /auth/me` or `GET /api/v1/auth/me`

### 3. Service Requests & Matching (Authenticated Customer Only)
* `POST /service-requests` (or `/api/v1/service-requests`) — Create new service request
* `GET /service-requests` (or `/api/v1/service-requests`) — List customer's requests
* `GET /service-requests/{request_id}` — Get single request
* `POST /service-requests/{request_id}/extract` — AI intent & requirement extraction
* `GET /service-requests/{request_id}/matches` (or `/api/v1/service-requests/{request_id}/matches`)
  * **Query Params**: `limit` (int, 1-20, default 5)
  * **Header**: `Authorization: Bearer <token>`
  * **Response (`200 OK`)**:
    ```json
    {
      "request_id": "e305e940-0255-46fb-a0b4-7b6bb822602e",
      "total_matches": 2,
      "matches": [
        {
          "worker_id": "b0000000-0000-0000-0000-000000000001",
          "name": "Ramesh Kumar",
          "category": "Plumbing",
          "matched_skills": ["Pipe Repair"],
          "distance_km": 3.35,
          "rating": 4.85,
          "total_reviews": 48,
          "experience_years": 9.0,
          "is_verified": true,
          "is_available": true,
          "match_score": 90.57
        }
      ]
    }
    ```

### 4. Skills Catalogue (Public)
* `GET /skills` (or `/api/v1/skills`)
* `GET /skills/grouped`

### 5. Workers Discovery (Public)
* `GET /workers` (or `/api/v1/workers`)
* `GET /workers/{worker_id}` (or `/api/v1/workers/{worker_id}`)
