# Database Module (PostgreSQL + PostGIS + Supabase)

This directory contains the complete database schema, spatial indexing setup, and development seed dataset for **Project Unknown**.

---

## 🗂️ Directory Layout

```text
database/
├── schema.sql      # DDL table definitions, enums, triggers, PostGIS indexes, and RLS policies
├── seed.sql        # Realistic development seed data (10 workers, 14 skills, worker-skill mappings)
└── README.md       # Database architecture, table descriptions, constraints, and setup instructions
```

---

## 🏛️ Database Tables & Important Constraints

### 1. `public.users`
* **Purpose**: Application profile table linked 1-to-1 with Supabase Auth (`auth.users.id`).
* **Primary Key**: `id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
* **Key Columns**:
  * `full_name TEXT NOT NULL`
  * `phone TEXT`, `email TEXT`, `avatar_url TEXT`
  * `role user_role NOT NULL DEFAULT 'customer'` (Controlled values: `'customer'`, `'worker'`)
  * `created_at`, `updated_at` (Auto-updated via trigger)

### 2. `public.workers`
* **Purpose**: Worker profile extension for users providing services.
* **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
* **Key Constraints**:
  * `user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE` — **Enforces 1:1 relationship** (one user can have at most one worker profile).
  * `experience_years NUMERIC(4,1) CHECK (experience_years >= 0)` — Represents **total professional experience**.
  * `rating NUMERIC(3,2) CHECK (0.00 <= rating <= 5.00)` — **Derived/cached value** automatically recalculated by `fn_recalculate_worker_rating()` trigger on reviews table (not freely editable by users).
  * `total_reviews INTEGER CHECK (total_reviews >= 0)` — **Derived/cached count** maintained by trigger.
  * `is_available BOOLEAN NOT NULL DEFAULT TRUE`
  * `is_verified BOOLEAN NOT NULL DEFAULT FALSE`
  * `service_radius_km NUMERIC(5,2) CHECK (service_radius_km > 0)` — Service operational radius.
  * `location GEOGRAPHY(Point, 4326) NOT NULL` — PostGIS point location indexed with GiST.

### 3. `public.skills`
* **Purpose**: Master canonical skills catalogue across domains.
* **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
* **Key Columns**:
  * `name TEXT NOT NULL UNIQUE` (e.g., `'Pipe Repair'`, `'House Wiring'`)
  * `category TEXT NOT NULL` (e.g., `'Plumbing'`, `'Electrical'`, `'Carpentry'`, `'Appliance Repair'`)
  * `description TEXT`

### 4. `public.worker_skills`
* **Purpose**: Many-to-many relationship linking workers to their qualified skills.
* **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
* **Key Constraints**:
  * `worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE`
  * `skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE`
  * `CONSTRAINT uq_worker_skill UNIQUE (worker_id, skill_id)` — Prevents duplicate worker-skill mappings.
  * `experience_years NUMERIC(4,1) CHECK (experience_years >= 0)` — Represents **experience specific to this skill**.

### 5. `public.service_requests`
* **Purpose**: User-submitted problem descriptions and AI-extracted requirement parameters.
* **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
* **Key Constraints**:
  * `customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE`
  * `raw_description TEXT NOT NULL`
  * `extracted_category TEXT`
  * `extracted_skills TEXT[] DEFAULT '{}'` — PostgreSQL array of tags extracted by AI (*Note: Canonical skills are stored in the `skills` table*).
  * `urgency urgency_level NOT NULL DEFAULT 'normal'` (Controlled values: `'low'`, `'normal'`, `'high'`, `'emergency'`).
  * `location GEOGRAPHY(Point, 4326) NOT NULL` — PostGIS point location indexed with GiST.
  * `status request_status NOT NULL DEFAULT 'open'` (Controlled values: `'open'`, `'matched'`, `'booked'`, `'completed'`, `'cancelled'`).

### 6. `public.bookings`
* **Purpose**: Service booking transactions between customer and worker.
* **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
* **Key Constraints**:
  * `customer_id UUID REFERENCES public.users(id) ON DELETE RESTRICT` (Preserves booking transaction history).
  * `worker_id UUID REFERENCES public.workers(id) ON DELETE RESTRICT` (Preserves booking transaction history).
  * `service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL`
  * `scheduled_time TIMESTAMPTZ NOT NULL`
  * `status booking_status NOT NULL DEFAULT 'pending'` (Controlled values: `'pending'`, `'accepted'`, `'rejected'`, `'cancelled'`, `'completed'`).
  * `notes TEXT`

### 7. `public.reviews`
* **Purpose**: Customer feedback and star rating upon booking completion.
* **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
* **Key Constraints**:
  * `booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE` — **Enforces at most one review per booking**.
  * `customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE`
  * `worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE`
  * `rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)`
  * `comment TEXT`

---

## 🌍 PostGIS Spatial Querying & Indexes

### Spatial GiST Indexes
```sql
CREATE INDEX idx_workers_location ON public.workers USING GIST (location);
CREATE INDEX idx_service_requests_location ON public.service_requests USING GIST (location);
```

### Standard Indexes
```sql
CREATE INDEX idx_workers_user_id ON public.workers(user_id);
CREATE INDEX idx_workers_is_available ON public.workers(is_available);
CREATE INDEX idx_workers_is_verified ON public.workers(is_verified);

CREATE INDEX idx_worker_skills_worker_id ON public.worker_skills(worker_id);
CREATE INDEX idx_worker_skills_skill_id ON public.worker_skills(skill_id);

CREATE INDEX idx_service_requests_customer_id ON public.service_requests(customer_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);

CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_worker_id ON public.bookings(worker_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

CREATE INDEX idx_reviews_worker_id ON public.reviews(worker_id);
```

### Dynamic Spatial Search Query Example
To find available plumbers within 5 km of user coordinates (`longitude: 77.6400`, `latitude: 12.9750`):

```sql
SELECT 
    w.id AS worker_id,
    u.full_name,
    u.phone,
    w.hourly_rate,
    w.rating,
    w.total_reviews,
    w.experience_years AS total_experience_years,
    ROUND(
        (ST_Distance(
            w.location, 
            ST_SetSRID(ST_MakePoint(77.6400, 12.9750), 4326)::geography
        ) / 1000.0)::numeric, 
        2
    ) AS distance_km
FROM public.workers w
JOIN public.users u ON w.user_id = u.id
JOIN public.worker_skills ws ON w.id = ws.worker_id
JOIN public.skills s ON ws.skill_id = s.id
WHERE s.category = 'Plumbing'
  AND w.is_available = TRUE
  AND ST_DWithin(
      w.location, 
      ST_SetSRID(ST_MakePoint(77.6400, 12.9750), 4326)::geography, 
      5000 -- 5 km in meters
  )
GROUP BY w.id, u.full_name, u.phone, w.hourly_rate, w.rating, w.total_reviews, w.experience_years, w.location
ORDER BY distance_km ASC;
```

---

## 🔒 Row Level Security (RLS) Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | Public | Self (`auth.uid() = id`) | Self (`auth.uid() = id`) | Self |
| **`workers`** | Public | Self (`auth.uid() = user_id`) | Self (`auth.uid() = user_id`) | Self |
| **`skills`** | Public | Admin | Admin | Admin |
| **`worker_skills`** | Public | Owning worker | Owning worker | Owning worker |
| **`service_requests`** | Customer (`auth.uid() = customer_id`) | Customer (`auth.uid() = customer_id`) | Customer | Customer |
| **`bookings`** | Booking participants | Customer | Booking participants | None |
| **`reviews`** | Public | Customer on completed booking | None | Self |

---

## 🚀 Setup & Execution Guide

### In Supabase Dashboard
1. Go to **SQL Editor**.
2. Run [`schema.sql`](schema.sql) to initialize tables, GiST indexes, triggers, and RLS policies.
3. Run [`seed.sql`](seed.sql) to populate 10 fictional workers, 14 canonical skills, and Bengaluru reference coordinates.
