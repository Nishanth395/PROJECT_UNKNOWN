# Project Unknown - System Architecture (Approved)

## 1. System Overview & Pattern

**Project Unknown** is built as a **Modular Monolith** backend interfacing with a **Flutter cross-platform mobile application**, a managed **Supabase (PostgreSQL + PostGIS + Auth + Storage)** backend-as-a-service, and a decoupled **AI Intent & Skill Parser**.

```mermaid
graph TB
    subgraph "Client Layer (mobile/)"
        FlutterApp["Flutter Mobile App (iOS / Android)"]
    end

    subgraph "Authentication Provider"
        SupaAuth["Supabase Auth (Issues JWTs)"]
    end

    subgraph "Backend Tier - Modular Monolith (backend/)"
        FastAPI["FastAPI Modular Monolith"]
        AuthMiddleware["Supabase JWT Verification Middleware"]
        Routers["Domain Routers (/auth, /workers, /requests, /bookings, /skills)"]
        MatchOrchestrator["Matching Orchestration Service"]
        DeterministicRanker["Deterministic Ranking Engine"]
    end

    subgraph "AI Intelligence Layer (ai/)"
        AIModule["AI Intent & Skill Parser (Gemini / OpenAI Adapter)"]
    end

    subgraph "Data & Persistence Tier (database/)"
        PostgresDB[("PostgreSQL + PostGIS (Spatial & Relational Store)")]
        SupaStorage["Supabase Storage (Worker Avatars & Portfolio)"]
    end

    subgraph "External Services (Client-Side)"
        MapsService["Google Maps / Mapbox (Map Tiles & Geocoding)"]
    end

    %% Auth Flow
    FlutterApp -->|"1. Sign In / Up"| SupaAuth
    SupaAuth -->>|"Session JWT"| FlutterApp

    %% Request Flow
    FlutterApp -->|"2. Header: 'Authorization: Bearer <JWT>' + Body: lat, lng, text"| FastAPI
    FlutterApp -->|"3. Display Map & Pins"| MapsService
    FlutterApp -->|"4. Upload Photos"| SupaStorage

    %% Monolith Auth & Routing
    FastAPI --> AuthMiddleware
    AuthMiddleware -->|"Validate JWT signature"| Routers
    Routers --> MatchOrchestrator

    %% Decoupled AI & Data Flow (NO AI -> DB ACCESS)
    MatchOrchestrator -->|"A. Send Raw Problem Text"| AIModule
    AIModule -->>|"Return Category & Extracted Skills (No DB Access)"| MatchOrchestrator
    MatchOrchestrator -->|"B. Query Spatial Candidates (ST_DWithin & Category)"| PostgresDB
    PostgresDB -->>|"Return Nearby Available Workers"| MatchOrchestrator
    MatchOrchestrator -->|"C. Calculate Composite Scores"| DeterministicRanker
    DeterministicRanker -->>|"Ranked Workers + Match Reasons"| MatchOrchestrator
    MatchOrchestrator -->>|"Return Final Response"| FlutterApp
```

---

## 2. Core Architectural Decisions

### 2.1 Authentication vs. Location Separation
- **Authentication**: Handled via standard HTTP header: `Authorization: Bearer <supabase_jwt_token>`.
- **Location**: Latitude and longitude are standard payload fields passed in JSON request bodies (e.g. `{"latitude": 12.9715, "longitude": 77.5945}`) or query parameters.

### 2.2 Supabase Auth as Identity Provider
- Supabase Auth manages user credentials, OTP/password authentication, and token issuance.
- FastAPI verifies the incoming Supabase JWT signature on all protected endpoints using `SUPABASE_JWT_SECRET` (or public keys) to extract `user_id` and role claims.

### 2.3 Strict AI Decoupling (No Direct DB Access)
- The `ai/` module is a pure stateless analytical function ($Text \rightarrow JSON$).
- The AI module has **no database credentials and no database access**.
- The `Matching Orchestrator` inside `backend/` coordinates the pipeline: calling the AI module to parse the problem, then querying PostgreSQL/PostGIS independently for matching workers.

### 2.4 Deterministic Ranking for MVP v1
- Candidate scoring is computed via a transparent, deterministic mathematical formula:
  $$\text{Score} = 100 \times \left(0.40 \cdot \text{SkillMatch} + 0.30 \cdot \text{ProximityDecay} + 0.20 \cdot \text{Rating} + 0.10 \cdot \text{Experience}\right)$$
- Custom ML and embedding rankers are reserved for future phases.

### 2.5 PostGIS for Spatial Distance Filtering
- PostGIS handles spatial queries (`ST_DWithin`, `ST_Distance`) with `GEOGRAPHY(Point, 4326)` columns and `GIST` spatial indices.
- Google Maps / Mapbox is used strictly on the mobile client for rendering map tiles, pins, and address reverse geocoding.

### 2.6 FastAPI as a Modular Monolith
- Built as a single backend application organized into clean domain modules (`auth`, `workers`, `requests`, `bookings`, `skills`) rather than distributed microservices.

---

## 3. Database Schema & Entities

```mermaid
erDiagram
    USERS ||--o| PROFILES : "has"
    PROFILES ||--o| WORKER_PROFILES : "extends (if worker)"
    CATEGORIES ||--o{ WORKER_PROFILES : "categorizes"
    CATEGORIES ||--o{ SERVICE_REQUESTS : "tagged with"
    PROFILES ||--o{ SERVICE_REQUESTS : "creates (customer)"
    SERVICE_REQUESTS ||--o{ MATCH_LOGS : "evaluates"
    WORKER_PROFILES ||--o{ MATCH_LOGS : "candidate in"
    SERVICE_REQUESTS ||--o| BOOKINGS : "results in"
    PROFILES ||--o{ BOOKINGS : "booked by (customer)"
    WORKER_PROFILES ||--o{ BOOKINGS : "serviced by (worker)"
    BOOKINGS ||--o| REVIEWS : "generates"

    PROFILES {
        uuid id PK "Matches Supabase auth.users.id"
        string email
        string full_name
        string phone_number
        string role "customer | worker | admin"
        string avatar_url
        timestamp created_at
        timestamp updated_at
    }

    WORKER_PROFILES {
        uuid profile_id PK,FK
        uuid category_id FK
        text_array skills "['pipe repair', 'faucet fix']"
        float experience_years
        decimal hourly_rate
        text bio
        float average_rating
        integer total_reviews
        boolean is_available
        boolean is_verified
        geography location "Point(longitude, latitude)"
        string address_text
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIES {
        uuid id PK
        string name "Plumbing, Electrical, etc."
        string slug
        string icon_url
        text_array default_skills
        timestamp created_at
    }

    SERVICE_REQUESTS {
        uuid id PK
        uuid customer_id FK
        text raw_description
        uuid extracted_category_id FK
        text_array extracted_skills
        string urgency_level "low | medium | high | emergency"
        geography location "Point(longitude, latitude)"
        string address_text
        string status "open | matched | booked | cancelled | completed"
        timestamp created_at
    }

    BOOKINGS {
        uuid id PK
        uuid request_id FK
        uuid customer_id FK
        uuid worker_id FK
        timestamp scheduled_time
        string status "pending | accepted | in_progress | completed | cancelled"
        decimal total_amount
        string cancellation_reason
        timestamp created_at
        timestamp updated_at
    }

    REVIEWS {
        uuid id PK
        uuid booking_id FK
        uuid customer_id FK
        uuid worker_id FK
        integer rating "1 to 5"
        text comment
        timestamp created_at
    }

    MATCH_LOGS {
        uuid id PK
        uuid request_id FK
        uuid worker_id FK
        float match_score
        jsonb score_breakdown
        text match_reason
        timestamp created_at
    }
```

---

## 4. End-to-End Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer as User (Flutter Mobile)
    participant SupaAuth as Supabase Auth
    participant API as FastAPI Backend
    participant AI as AI Module (LLM Parser)
    participant DB as PostgreSQL (PostGIS)
    actor Worker as Service Worker

    Customer->>SupaAuth: Sign In (Email / Phone)
    SupaAuth-->>Customer: Return JWT Token

    Customer->>Customer: Captures GPS Location (lat: 12.9715, lng: 77.5945)
    Customer->>Customer: Enters Problem: "Kitchen pipe is leaking under sink"

    Customer->>API: POST /search/matches<br>Header: Authorization: Bearer <JWT><br>Body: { raw_description, latitude, longitude }
    API->>API: Verify Supabase JWT

    API->>AI: parse_intent(raw_description)<br>(AI has NO direct database access)
    AI-->>API: { category: "Plumbing", skills: ["pipe repair", "leak repair"], urgency: "high" }

    API->>DB: SELECT * FROM worker_profiles WHERE category_id = :id AND ST_DWithin(...)
    DB-->>API: Return nearby available workers

    API->>API: Score & rank workers using Deterministic Formula
    API->>DB: Record request & match logs
    API-->>Customer: Return Ranked Worker Profiles with match_reason & ETA

    Customer->>Customer: Selects Worker & taps Book
    Customer->>API: POST /bookings<br>Header: Authorization: Bearer <JWT><br>Body: { worker_id, request_id, scheduled_time }
    API->>DB: INSERT into bookings (status: 'pending')
    API-->>Worker: Push Alert: New Booking Received
    API-->>Customer: Booking Confirmation (status: 'pending')
```
