-- ==============================================================================
-- PROJECT UNKNOWN - DATABASE SCHEMA DEFINITION
-- ==============================================================================
-- Database: PostgreSQL 15+ with PostGIS
-- Identity & Auth: Supabase Auth (auth.users)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ------------------------------------------------------------------------------
-- 2. CUSTOM TYPES / ENUMS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'worker', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'emergency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('open', 'matched', 'booked', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABLES DEFINITION
-- ------------------------------------------------------------------------------

-- Table: users (Application Profile linked 1-to-1 with Supabase Auth)
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

-- Table: workers (Worker profile extension with geospatial location)
CREATE TABLE IF NOT EXISTS public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    bio TEXT,
    experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0.0 CHECK (experience_years >= 0),
    hourly_rate NUMERIC(10, 2) CHECK (hourly_rate >= 0),
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    total_reviews INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    service_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 15.00 CHECK (service_radius_km > 0),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    address_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: skills (Master skill catalog organized by category)
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: worker_skills (Many-to-many relationship between workers and skills)
CREATE TABLE IF NOT EXISTS public.worker_skills (
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    experience_years NUMERIC(4, 1) CHECK (experience_years >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (worker_id, skill_id)
);

-- Table: service_requests (Customer problem descriptions with AI intent & coordinates)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    raw_description TEXT NOT NULL,
    extracted_category TEXT,
    extracted_skills TEXT[] DEFAULT '{}',
    urgency urgency_level NOT NULL DEFAULT 'medium',
    location GEOGRAPHY(Point, 4326) NOT NULL,
    address_text TEXT,
    status request_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: bookings (Service engagements between customer and worker)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    total_amount NUMERIC(10, 2) CHECK (total_amount >= 0),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: reviews (Ratings and feedback for completed bookings)
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
-- 4. INDEXES (B-Tree, GIN, and PostGIS GiST)
-- ------------------------------------------------------------------------------

-- Spatial GiST Indexes for high-performance radius & proximity queries
CREATE INDEX IF NOT EXISTS idx_workers_location ON public.workers USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_service_requests_location ON public.service_requests USING GIST (location);

-- Users & Workers B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON public.workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_is_available ON public.workers(is_available);
CREATE INDEX IF NOT EXISTS idx_workers_rating ON public.workers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_workers_is_verified ON public.workers(is_verified);

-- Skills & Worker-Skills Indexes
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills(name);
CREATE INDEX IF NOT EXISTS idx_worker_skills_skill_id ON public.worker_skills(skill_id);

-- Service Requests Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON public.service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_extracted_skills ON public.service_requests USING GIN (extracted_skills);

-- Bookings Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker_id ON public.bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_time ON public.bookings(scheduled_time);

-- Reviews Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_worker_id ON public.reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);

-- ------------------------------------------------------------------------------
-- 5. TRIGGER FUNCTIONS (Timestamp Updates & Rating Aggregation)
-- ------------------------------------------------------------------------------

-- Automatic updated_at timestamp refresher
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

-- Automatic Worker Rating & Review Count recalculation trigger
CREATE OR REPLACE FUNCTION public.fn_update_worker_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_worker_id UUID;
    new_avg NUMERIC(3, 2);
    new_count INTEGER;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_worker_id := OLD.worker_id;
    ELSE
        target_worker_id := NEW.worker_id;
    END IF;

    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00), COUNT(*)
    INTO new_avg, new_count
    FROM public.reviews
    WHERE worker_id = target_worker_id;

    UPDATE public.workers
    SET rating = new_avg,
        total_reviews = new_count,
        updated_at = NOW()
    WHERE id = target_worker_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_recalc_worker ON public.reviews;
CREATE TRIGGER trg_review_recalc_worker
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_worker_rating();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 6.1 Users RLS
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 6.2 Workers RLS
CREATE POLICY "Worker profiles are viewable by everyone"
    ON public.workers FOR SELECT
    USING (true);

CREATE POLICY "Workers can update their own profile"
    ON public.workers FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workers can register their profile"
    ON public.workers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 6.3 Skills & Worker Skills RLS
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

-- 6.4 Service Requests RLS
CREATE POLICY "Customers can view their own service requests"
    ON public.service_requests FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create their own service requests"
    ON public.service_requests FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own service requests"
    ON public.service_requests FOR UPDATE
    USING (auth.uid() = customer_id);

-- 6.5 Bookings RLS
CREATE POLICY "Users can view bookings they are involved in"
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

-- 6.6 Reviews RLS
CREATE POLICY "Reviews are viewable by everyone"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Customers can create reviews for their completed bookings"
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
