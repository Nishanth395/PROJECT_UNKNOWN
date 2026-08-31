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
│   │   └── security.py     # Supabase JWT validation dependencies
│   ├── db/
│   │   ├── database.py     # SQLAlchemy sessionmaker & get_db dependency
│   │   └── models.py       # SQLAlchemy ORM entity definitions
│   ├── routers/
│   │   ├── health.py       # GET /health
│   │   ├── skills.py       # GET /skills, GET /skills/grouped
│   │   └── workers.py      # GET /workers, GET /workers/{worker_id}
│   ├── schemas/
│   │   ├── common.py       # Health and standard error response models
│   │   ├── skill.py        # Skill response and grouping schemas
│   │   └── worker.py       # Worker summary and detail schemas
│   └── services/
│       ├── skill_service.py  # Skill database queries and grouping
│       └── worker_service.py # Worker filtering and profile detail lookups
├── tests/
│   ├── conftest.py         # In-memory test DB fixtures and TestClient
│   ├── test_health.py      # Health endpoint tests
│   ├── test_skills.py      # Skills endpoint tests
│   └── test_workers.py     # Worker listing, pagination, filtering, and 404 tests
├── requirements.txt        # Python package dependencies
└── README.md
```

---

## ⚙️ Environment Variables

The backend loads configuration from the root `.env` or `backend/.env`.

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
pytest -v
```

---

## 📡 API Endpoints Reference

### 1. Health Checks
* `GET /health` or `GET /api/v1/health`
  * Returns `{ "status": "ok", "service": "project-unknown-backend" }`

### 2. Skills Catalogue
* `GET /skills` (or `/api/v1/skills`)
  * Optional Query Params: `category` (e.g. `Plumbing`, `Electrical`)
  * Returns list of canonical skills.
* `GET /skills/grouped`
  * Returns all skills structured by category.

### 3. Workers Discovery
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
