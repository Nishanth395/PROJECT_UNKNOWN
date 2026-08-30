# Database Module (PostgreSQL + PostGIS + Supabase)

This directory contains the complete database schema, spatial indexing setup, and development seed dataset for **Project Unknown**.

---

## 🗂️ Directory Layout

```text
database/
├── schema.sql      # DDL table definitions, enums, triggers, PostGIS indexes, and RLS policies
├── seed.sql        # Realistic fictional development seed data (skills, workers, worker_skills)
└── README.md       # Database architecture, spatial query examples, and setup instructions
```

---

## 🏛️ Database Entities & Relationships

| Entity | Primary Key | Foreign Keys | Key Columns |
| :--- | :--- | :--- | :--- |
| **`users`** | `id UUID` | Linked 1-to-1 to `auth.users(id)` | `full_name`, `phone`, `email`, `role`, `avatar_url` |
| **`workers`** | `id UUID` | `user_id -> users(id)` (1-to-1) | `experience_years`, `hourly_rate`, `rating`, `total_reviews`, `is_available`, `is_verified`, `service_radius_km`, `location (Point, 4326)` |
| **`skills`** | `id UUID` | None | `name` (UNIQUE), `category`, `description` |
| **`worker_skills`** | `(worker_id, skill_id)` | `worker_id -> workers(id)`, `skill_id -> skills(id)` | `experience_years` |
| **`service_requests`** | `id UUID` | `customer_id -> users(id)` | `raw_description`, `extracted_category`, `extracted_skills`, `urgency`, `location (Point, 4326)`, `status` |
| **`bookings`** | `id UUID` | `customer_id -> users(id)`, `worker_id -> workers(id)`, `service_request_id -> service_requests(id)` | `scheduled_time`, `status`, `total_amount`, `notes` |
| **`reviews`** | `id UUID` | `booking_id -> bookings(id)` (UNIQUE), `customer_id -> users(id)`, `worker_id -> workers(id)` | `rating (1..5)`, `comment` |

---

## 🌍 PostGIS Spatial Querying

Both `workers.location` and `service_requests.location` use `GEOGRAPHY(Point, 4326)` with **GiST (Generalized Search Tree) spatial indexing** for fast geographic bounding calculations.

### Example: "Find electricians within 5 km of user coordinates"
Given user location: Longitude `77.6300`, Latitude `12.9500`:

```sql
SELECT 
    w.id AS worker_id,
    u.full_name,
    u.phone,
    w.hourly_rate,
    w.rating,
    w.total_reviews,
    w.address_text,
    ROUND(
        (ST_Distance(
            w.location, 
            ST_SetSRID(ST_MakePoint(77.6300, 12.9500), 4326)::geography
        ) / 1000.0)::numeric, 
        2
    ) AS distance_km
FROM public.workers w
JOIN public.users u ON w.user_id = u.id
JOIN public.worker_skills ws ON w.id = ws.worker_id
JOIN public.skills s ON ws.skill_id = s.id
WHERE s.category = 'Electrical'
  AND w.is_available = TRUE
  AND ST_DWithin(
      w.location, 
      ST_SetSRID(ST_MakePoint(77.6300, 12.9500), 4326)::geography, 
      5000 -- 5000 meters = 5 km
  )
GROUP BY w.id, u.full_name, u.phone, w.hourly_rate, w.rating, w.total_reviews, w.address_text, w.location
ORDER BY distance_km ASC;
```

---

## 🔒 Row Level Security (RLS) Policies

1. **`users`**:
   - Profiles viewable by everyone.
   - Insert and update restricted to the authenticated user (`auth.uid() = id`).
2. **`workers`**:
   - Worker profiles publicly viewable.
   - Registration and updates restricted to the worker (`auth.uid() = user_id`).
3. **`skills` & `worker_skills`**:
   - Skills catalogue viewable by everyone.
   - Worker skill mappings manageable only by the owning worker.
4. **`service_requests`**:
   - Only the owning customer can view, create, or update their service requests (`auth.uid() = customer_id`).
5. **`bookings`**:
   - Only participants (customer or assigned worker) can view or update booking statuses.
6. **`reviews`**:
   - Publicly readable.
   - Insertable only by the customer for completed bookings (`status = 'completed'`).

---

## 🚀 Setup & Execution Guide

### Option A: Supabase Cloud Dashboard
1. Go to your **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Create a new query, paste the contents of [`schema.sql`](schema.sql), and click **Run**.
3. Create another query, paste [`seed.sql`](seed.sql), and click **Run**.

### Option B: Local PostgreSQL (with PostGIS)
```bash
# Connect using psql and execute
psql -U postgres -d project_unknown -f database/schema.sql
psql -U postgres -d project_unknown -f database/seed.sql
```
