# Backend Module (FastAPI Modular Monolith)

FastAPI backend server for **Project Unknown** providing REST APIs for service discovery, worker lookup, canonical skills catalogue, Supabase JWT authentication, customer service requests, and AI-assisted requirement extraction.

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
│   │   ├── service_requests.py # POST/GET /service-requests & POST /service-requests/{id}/extract
│   │   ├── skills.py       # GET /skills, GET /skills/grouped
│   │   └── workers.py      # GET /workers, GET /workers/{worker_id}
│   ├── schemas/
│   │   ├── ai.py           # Re-exported AI extraction schemas
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
│   ├── test_ai_extraction.py # AI extraction, provider fallback, and canonical validation tests
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

## 🤖 AI Service Request Extraction Architecture

Project Unknown uses an AI abstraction layer to convert unstructured customer problem descriptions into structured canonical requirements:

```text
Customer Input ("Kitchen PVC water pipe burst and leaking heavily")
       ↓
POST /service-requests/{id}/extract (Customer Authenticated)
       ↓
AIExtractionService (app/ai/service.py)
       ↓  (Fetches canonical catalogue from database: public.skills)
AIProvider Interface (FallbackProvider / GeminiProvider)
       ↓  (Extracts raw intent: category, skills, urgency, confidence)
Canonical Validation & Normalization Filter
  ├── 1. Validates category against public.skills categories
  ├── 2. Filters out any non-canonical / hallucinated skills
  └── 3. Deduplicates skills (Idempotent)
       ↓  (Updates service_requests table)
PostgreSQL Database:
  ├── extracted_category: "Plumbing"
  ├── extracted_skills: ["Pipe Repair", "Leak Fixing"]
  └── raw_description: PRESERVED UNTOUCHED
```

### Key AI Design Principles:
1. **Vendor Agnostic Abstraction**: The core service layer depends strictly on the `AIProvider` interface.
2. **Canonical Skill Constraining**: AI output is strictly validated against the 14 canonical skills in `public.skills`. Hallucinated or non-canonical skills are never stored in the database.
3. **Deterministic Fallback Engine**: If no API key is provided or external LLM providers encounter a network/timeout error, the system automatically falls back to the deterministic keyword extractor with zero downtime.
4. **Idempotency**: Repeated extractions do not corrupt database records or produce duplicate skill entries.

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
# Run all tests (unit + auth + service requests + AI extraction + integration)
pytest -v

# Run AI extraction tests specifically
pytest tests/test_ai_extraction.py -v

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
  * Returns authenticated user identity and `public.users` profile state.

### 3. Service Requests (Authenticated Customer Only)
* `POST /service-requests` (or `/api/v1/service-requests`)
  * Submits new customer request.
* `GET /service-requests` (or `/api/v1/service-requests`)
  * Lists paginated requests owned by current customer.
* `GET /service-requests/{request_id}` (or `/api/v1/service-requests/{request_id}`)
  * Retrieves single customer request.
* `POST /service-requests/{request_id}/extract` (or `/api/v1/service-requests/{request_id}/extract`)
  * **Header**: `Authorization: Bearer <token>`
  * **Response (`200 OK`)**:
    ```json
    {
      "request_id": "e305e940-0255-46fb-a0b4-7b6bb822602e",
      "category": "Plumbing",
      "skills": ["Pipe Repair", "Leak Fixing"],
      "urgency": "high",
      "confidence": 0.90
    }
    ```

### 4. Skills Catalogue (Public)
* `GET /skills` (or `/api/v1/skills`)
* `GET /skills/grouped`

### 5. Workers Discovery (Public)
* `GET /workers` (or `/api/v1/workers`)
* `GET /workers/{worker_id}` (or `/api/v1/workers/{worker_id}`)

---

## 🔮 Future Endpoint Extension Placeholders

The routing architecture is designed to seamlessly mount upcoming feature modules:
* `POST /search/matches` — Spatial PostGIS worker matching using extracted skills
* `POST /bookings` — Service engagement bookings
