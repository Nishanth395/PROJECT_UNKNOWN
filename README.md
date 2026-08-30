# Project Unknown 🛠️

An on-demand local services platform connecting users with skilled local service providers (electricians, plumbers, tutors, mechanics, appliance technicians, etc.) using an AI-assisted intent parser and PostGIS spatial matching engine.

---

## 🎯 MVP Objective
Enable a seamless, low-friction flow where a user describes a problem in plain language, the system understands the requirement, captures user location, queries nearby verified service providers, and presents a ranked list of available workers with clear reasoning for quick booking.

---

## 🏛️ System Architecture

Project Unknown uses a **Modular Monolith** architecture to balance clean separation of concerns with hackathon agility:

```mermaid
graph TB
    subgraph "Client Layer"
        FlutterApp["Flutter Mobile App (iOS / Android)"]
    end

    subgraph "Auth Provider"
        SupaAuth["Supabase Auth (Issues JWTs)"]
    end

    subgraph "Backend Tier - Modular Monolith"
        FastAPI["FastAPI Backend"]
        AuthMiddleware["JWT Verification (Supabase)"]
        Routers["Domain Routers (/auth, /workers, /requests, /bookings, /skills)"]
        Orchestrator["Matching Orchestrator"]
        Ranker["Deterministic Ranking Engine"]
    end

    subgraph "AI Intelligence Layer"
        AIModule["AI Intent & Skill Parser (Isolated - No DB Access)"]
    end

    subgraph "Data & Persistence"
        PostgresDB[("PostgreSQL + PostGIS")]
        SupaStorage["Supabase Storage"]
    end

    subgraph "External Services"
        MapsAPI["Google Maps / Mapbox (Client-Side Rendering & Geocoding)"]
    end

    FlutterApp -->|"1. Auth Sign In / Up"| SupaAuth
    SupaAuth -->>|"Returns JWT"| FlutterApp

    FlutterApp -->|"2. Header: 'Authorization: Bearer <JWT>' + Body: lat, lng, problem"| FastAPI
    FlutterApp -->|"3. Display Map & Places"| MapsAPI
    FlutterApp -->|"4. Upload Profile Photos"| SupaStorage

    FastAPI --> AuthMiddleware
    AuthMiddleware --> Routers
    Routers --> Orchestrator

    Orchestrator -->|"A. Send Raw Problem Text"| AIModule
    AIModule -->>|"Return Structured Intent & Skills"| Orchestrator
    Orchestrator -->|"B. Spatial & Category Query (ST_DWithin)"| PostgresDB
    PostgresDB -->>|"Return Nearby Candidates"| Orchestrator
    Orchestrator -->|"C. Compute Deterministic Scores"| Ranker
    Ranker -->>|"Ranked Candidates + Reasons"| Orchestrator
    Orchestrator -->>|"Return Response Payload"| FlutterApp
```

### Core Architecture Highlights
* **JWT & Location Separation**: Authentication is transmitted via `Authorization: Bearer <token>` HTTP headers. GPS coordinates (`latitude`, `longitude`) are payload data in request bodies.
* **Supabase Auth**: Serves as the identity provider; FastAPI verifies JWT signatures for all protected routes.
* **Decoupled AI Layer**: The AI module is a stateless text-to-JSON extractor with **zero direct database access**. The Backend Matching Orchestrator coordinates AI parsing and database querying separately.
* **Deterministic Ranking**: MVP v1 scores candidates based on skill match, distance decay, rating, and experience without heavy ML overhead.
* **PostGIS for Spatial Search**: PostGIS executes spatial bounding and distance queries (`ST_DWithin`, `ST_Distance`).
* **FastAPI Modular Monolith**: Single clean codebase avoiding microservices complexity.

---

## 🧰 Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Mobile Client** | Flutter 3.x, Dart, Riverpod, Dio |
| **Backend API** | FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy / asyncpg |
| **Database & Auth** | PostgreSQL 15+ with PostGIS Extension, Supabase Auth & Storage |
| **AI / NLP Engine** | LLM APIs (Gemini / OpenAI) with structured output parsing |
| **Maps & Location** | Google Maps SDK / Mapbox for Flutter (Client-Side) |
| **Documentation & Testing** | Markdown, OpenAPI (Swagger), Postman |

---

## 📁 Repository Structure

```text
project-unknown/
├── mobile/       # Flutter cross-platform mobile application
├── backend/      # FastAPI modular monolith backend
├── ai/           # AI intent & skill extraction module (isolated)
├── database/     # Supabase / PostgreSQL schema migrations & seeds
├── docs/         # System specifications, architecture, and API contracts
│   ├── architecture.md
│   ├── api-contract.md
│   └── development-guide.md
├── .env.example  # Environment variable template
├── .gitignore    # Git ignore rules for Flutter, Python, IDEs, and OS
└── README.md     # Project overview and team guide
```

---

## 👥 Team Responsibilities (6-Member Team)

| Team Member | Role | Core Responsibilities |
| :--- | :--- | :--- |
| **Member 1** | **Integration & Architecture Lead** | • System integration & end-to-end flow consistency<br>• API contract alignment across frontend and backend<br>• Code reviews, PR approvals & CI/CD workflow |
| **Member 2** | **Flutter Mobile Lead** | • Flutter UI/UX implementation & screen navigation<br>• Supabase Auth client integration on mobile<br>• State management (Riverpod) & API networking client (Dio) |
| **Member 3** | **FastAPI Backend Lead** | • FastAPI modular monolith setup, routing & middleware<br>• Supabase JWT authentication verification dependency<br>• Business logic for requests, bookings, reviews & matching endpoints |
| **Member 4** | **Database & PostGIS Lead** | • PostgreSQL schema definitions & migrations<br>• PostGIS spatial queries (`ST_DWithin`, `ST_Distance`)<br>• Supabase Row-Level Security (RLS) policies & test seed data |
| **Member 5** | **AI & Matching Lead** | • AI prompt engineering & structured JSON intent parser<br>• Skill categorization taxonomy<br>• Deterministic multi-factor candidate scoring algorithm |
| **Member 6** | **Maps & Worker-Side Lead** | • Mobile map integration (Google Maps / Mapbox markers & pins)<br>• Worker onboarding UI, profile management & availability toggling<br>• Location permissions & reverse geocoding on mobile |

---

## 🔄 Development Workflow

1. **Branching Strategy**:
   - `main`: Production-ready, stable codebase (Protected).
   - `develop`: Shared integration branch for active development.
   - `feature/<module>-<feature-name>`: Working branch created from `develop` (e.g., `feature/ai-intent-parser`, `feature/mobile-auth-ui`).
2. **Commit Conventions**: Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
3. **Pull Request Protocol**:
   - Keep PRs small and focused on a single module.
   - Every PR requires review and approval from the Integration Lead (Member 1) or a module peer before merging into `develop`.
4. **Refer to Documentation**:
   - 📖 Architecture blueprint: [`docs/architecture.md`](docs/architecture.md)
   - 📡 API contracts & schemas: [`docs/api-contract.md`](docs/api-contract.md)
   - 🛠️ Developer onboarding & collaboration guide: [`docs/development-guide.md`](docs/development-guide.md)
