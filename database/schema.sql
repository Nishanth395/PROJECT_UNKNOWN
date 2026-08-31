-- ==============================================================================
-- PROJECT UNKNOWN - DATABASE SCHEMA (SUPABASE POSTGIS COMPATIBLE)
-- ==============================================================================
-- Database: PostgreSQL 15+ with PostGIS installed in 'extensions' schema
-- Identity Provider: Supabase Auth (auth.users)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;

-- ------------------------------------------------------------------------------
-- 2. CONTROLLED ENUMS / TYPE DEFINITIONS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'worker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('low', 'normal', 'high', 'emergency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('open', 'matched', 'booked', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. CORE TABLES DEFINITION
-- ------------------------------------------------------------------------------

-- 1. USERS TABLE (Linked 1-to-1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. WORKERS TABLE (1-to-1 extension of users; user_id is UNIQUE)
CREATE TABLE IF NOT EXISTS public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    description TEXT,
    experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0.0 CHECK (experience_years >= 0), -- Total professional experience
    hourly_rate NUMERIC(10, 2) CHECK (hourly_rate >= 0),
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0.00 AND rating <= 5.00), -- Derived/cached from reviews trigger
    total_reviews INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0), -- Derived/cached from reviews trigger
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    service_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 15.00 CHECK (service_radius_km > 0),
    location extensions.geography(Point, 4326) NOT NULL,
    address_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SKILLS TABLE (Master canonical skills catalogue)
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WORKER_SKILLS TABLE (Many-to-many relationship with skill-specific experience)
CREATE TABLE IF NOT EXISTS public.worker_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    experience_years NUMERIC(4, 1) CHECK (experience_years >= 0), -- Experience with this specific skill
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_worker_skill UNIQUE (worker_id, skill_id)
);

-- 5. SERVICE_REQUESTS TABLE (Customer problem descriptions + AI extracted tags)
-- Note: extracted_skills stores unstructured text[] tags from AI; canonical skills are in public.skills
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    raw_description TEXT NOT NULL,
    extracted_category TEXT,
    extracted_skills TEXT[] DEFAULT '{}',
    urgency urgency_level NOT NULL DEFAULT 'normal',
    location extensions.geography(Point, 4326) NOT NULL,
    address_text TEXT,
    status request_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BOOKINGS TABLE (Service engagements between customer and worker)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. REVIEWS TABLE (Ratings and comments; 1 review per booking)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. SPATIAL & STANDARD INDEXES
-- ------------------------------------------------------------------------------

-- GiST Spatial Indexes (High-performance PostGIS distance & bounding box queries)
CREATE INDEX IF NOT EXISTS idx_workers_location ON public.workers USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_service_requests_location ON public.service_requests USING GIST (location);

-- Standard B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON public.workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_is_available ON public.workers(is_available);
CREATE INDEX IF NOT EXISTS idx_workers_is_verified ON public.workers(is_verified);

CREATE INDEX IF NOT EXISTS idx_worker_skills_worker_id ON public.worker_skills(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_skills_skill_id ON public.worker_skills(skill_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON public.service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker_id ON public.bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

CREATE INDEX IF NOT EXISTS idx_reviews_worker_id ON public.reviews(worker_id);

-- ------------------------------------------------------------------------------
-- 5. TRIGGER FUNCTIONS (Timestamp Updates & Derived Rating Recalculation)
-- ------------------------------------------------------------------------------

-- Trigger function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_workers_updated_at ON public.workers;
CREATE TRIGGER trg_workers_updated_at
    BEFORE UPDATE ON public.workers
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER trg_service_requests_updated_at
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Trigger function: Automatically recalculate derived rating and total_reviews on workers table
CREATE OR REPLACE FUNCTION public.fn_recalculate_worker_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_worker_id UUID;
    avg_score NUMERIC(3, 2);
    review_count INTEGER;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_worker_id := OLD.worker_id;
    ELSE
        target_worker_id := NEW.worker_id;
    END IF;

    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00), COUNT(*)
    INTO avg_score, review_count
    FROM public.reviews
    WHERE worker_id = target_worker_id;

    UPDATE public.workers
    SET rating = avg_score,
        total_reviews = review_count,
        updated_at = NOW()
    WHERE id = target_worker_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_worker_rating ON public.reviews;
CREATE TRIGGER trg_recalc_worker_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_worker_rating();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 6.1 Users Policies
CREATE POLICY "Users profiles are viewable by everyone"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users can create their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 6.2 Workers Policies
CREATE POLICY "Worker profiles are viewable by everyone"
    ON public.workers FOR SELECT
    USING (true);

CREATE POLICY "Users can create their worker profile"
    ON public.workers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workers can update their worker profile"
    ON public.workers FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6.3 Skills & Worker Skills Policies
CREATE POLICY "Skills catalog is viewable by everyone"
    ON public.skills FOR SELECT
    USING (true);

CREATE POLICY "Worker skills are viewable by everyone"
    ON public.worker_skills FOR SELECT
    USING (true);

CREATE POLICY "Workers can manage their own skills"
    ON public.worker_skills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.id = worker_skills.worker_id
              AND workers.user_id = auth.uid()
        )
    );

-- 6.4 Service Requests Policies
CREATE POLICY "Customers can view their own requests"
    ON public.service_requests FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert their own requests"
    ON public.service_requests FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own requests"
    ON public.service_requests FOR UPDATE
    USING (auth.uid() = customer_id);

-- 6.5 Bookings Policies
CREATE POLICY "Participants can view their bookings"
    ON public.bookings FOR SELECT
    USING (
        auth.uid() = customer_id
        OR EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.id = bookings.worker_id
              AND workers.user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Participants can update booking status"
    ON public.bookings FOR UPDATE
    USING (
        auth.uid() = customer_id
        OR EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.id = bookings.worker_id
              AND workers.user_id = auth.uid()
        )
    );

-- 6.6 Reviews Policies
CREATE POLICY "Reviews are viewable by everyone"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Customers can add review for completed bookings"
    ON public.reviews FOR INSERT
    WITH CHECK (
        auth.uid() = customer_id
        AND EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = reviews.booking_id
              AND bookings.customer_id = auth.uid()
              AND bookings.status = 'completed'
        )
    );
