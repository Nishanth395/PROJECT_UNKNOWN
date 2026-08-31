# Database Module (PostgreSQL + PostGIS + Supabase)

This directory contains the database schema, spatial indexing setup, canonical reference seeds, and development worker datasets for **Project Unknown**.

---

## 🗂️ Directory Layout

```text
database/
├── schema.sql         # DDL table definitions, enums, triggers, PostGIS indexes, and RLS policies
├── seed.sql           # Canonical skills reference seed (100% Auth-independent)
├── demo-workers.sql   # Demo worker profiles & skill mappings (Requires Supabase Auth users)
└── README.md          # Setup sequence, verification queries, and schema documentation
```

---

## ⚙️ Complete Setup Sequence

To maintain **100% foreign key integrity** with Supabase Auth (`public.users.id → auth.users.id`) without bypassing or manipulating internal auth tables:

### Step A: Run `schema.sql`
In the **Supabase Dashboard → SQL Editor** (or via `psql`), execute [`schema.sql`](schema.sql) to create all tables, PostGIS extensions, triggers, indexes, and Row-Level Security policies.

### Step B: Create Development Users via Supabase Auth
Create development/demo accounts through Supabase Auth (via **Supabase Dashboard → Authentication → Users → Add user**, or through the Flutter app / Supabase client SDK).

Example demo emails:
* `ramesh.kumar@example.com`
* `suresh.patil@example.com`
* `priya.sharma@example.com`
* `amit.verma@example.com`
* `rajesh.nair@example.com`
* `sunita.rao@example.com`
* `manoj.joshi@example.com`
* `deepa.patel@example.com`
* `vikram.singh@example.com`
* `ananya.mukherjee@example.com`

### Step C: Create Corresponding `public.users` Profiles
Insert matching application profile rows into `public.users` using the generated `auth.users.id`:
```sql
INSERT INTO public.users (id, full_name, phone, email, role)
SELECT id, raw_user_meta_data->>'full_name', phone, email, 'worker'::user_role
FROM auth.users
WHERE email IN (
    'ramesh.kumar@example.com',
    'suresh.patil@example.com',
    'priya.sharma@example.com',
    'amit.verma@example.com',
    'rajesh.nair@example.com',
    'sunita.rao@example.com',
    'manoj.joshi@example.com',
    'deepa.patel@example.com',
    'vikram.singh@example.com',
    'ananya.mukherjee@example.com'
)
ON CONFLICT (id) DO NOTHING;
```

### Step D: Run `seed.sql`
Run [`seed.sql`](seed.sql) to populate the 14 canonical skills across Plumbing, Electrical, Carpentry, Appliance Repair, Mechanic, and Tutoring.

### Step E: Run `demo-workers.sql`
Run [`demo-workers.sql`](demo-workers.sql) to link the 10 worker profiles and their skill experience mappings to the users created in Step B & C.

### Step F: Run Verification Queries
Run the verification queries below to ensure data integrity.

---

## 🔍 Database Integrity Verification SQL

Run this script in the Supabase SQL Editor to verify that all constraints and relationships are satisfied:

```sql
-- 1. Check Canonical Skills Count
SELECT COUNT(*) AS total_skills, 
       COUNT(DISTINCT category) AS total_categories 
FROM public.skills;

-- 2. Check Workers Count
SELECT COUNT(*) AS total_workers,
       COUNT(*) FILTER (WHERE is_available = TRUE) AS available_workers,
       COUNT(*) FILTER (WHERE is_verified = TRUE) AS verified_workers
FROM public.workers;

-- 3. Check Worker Skills Mappings
SELECT COUNT(*) AS total_worker_skills,
       COUNT(DISTINCT worker_id) AS workers_with_skills
FROM public.worker_skills;

-- 4. Verify Every Worker references a valid public.users row (Orphan Check)
SELECT w.id AS orphan_worker_id, w.user_id
FROM public.workers w
LEFT JOIN public.users u ON w.user_id = u.id
WHERE u.id IS NULL;
-- Expected result: 0 rows

-- 5. Verify Every public.users worker references an existing auth.users row
SELECT u.id AS orphan_user_id, u.email
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;
-- Expected result: 0 rows

-- 6. Inspect Sample Worker with Skills and Location
SELECT 
    w.id AS worker_id,
    u.full_name,
    u.email,
    w.hourly_rate,
    w.rating,
    w.total_reviews,
    w.address_text,
    ARRAY_AGG(s.name) AS skills_list
FROM public.workers w
JOIN public.users u ON w.user_id = u.id
LEFT JOIN public.worker_skills ws ON w.id = ws.worker_id
LEFT JOIN public.skills s ON ws.skill_id = s.id
GROUP BY w.id, u.full_name, u.email, w.hourly_rate, w.rating, w.total_reviews, w.address_text;
```

---

## 🏛️ Schema Summary & Relationships

* **`users`**: Extends `auth.users(id)` 1-to-1 (`id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`).
* **`workers`**: Extends `users(id)` 1-to-1 (`user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE`).
* **`skills`**: Canonical skill repository (`name UNIQUE`, `category`).
* **`worker_skills`**: Many-to-many (`UNIQUE(worker_id, skill_id)`), stores skill-specific `experience_years`.
* **`service_requests`**: Stores customer problem descriptions with PostGIS points (`Point, 4326`) and `extracted_skills TEXT[]`.
* **`bookings`**: Transactional records (`customer_id`, `worker_id`, `scheduled_time`, `status`).
* **`reviews`**: One review per booking (`booking_id UNIQUE`), automatically recalculates `workers.rating` and `workers.total_reviews` via trigger.
