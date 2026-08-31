-- ==============================================================================
-- PROJECT UNKNOWN - DEMO WORKERS & SKILLS MAPPINGS
-- ==============================================================================
-- PREREQUISITES:
-- 1. Run database/schema.sql
-- 2. Run database/seed.sql (canonical skills)
-- 3. The corresponding development users MUST already exist in Supabase Auth
--    (auth.users) and in public.users.
--
-- Example development emails:
--   - ramesh.kumar@example.com
--   - suresh.patil@example.com
--   - priya.sharma@example.com
--   - amit.verma@example.com
--   - rajesh.nair@example.com
--   - sunita.rao@example.com
--   - manoj.joshi@example.com
--   - deepa.patel@example.com
--   - vikram.singh@example.com
--   - ananya.mukherjee@example.com
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. INSERT DEMO WORKER PROFILES (Linked to existing public.users by email)
-- ------------------------------------------------------------------------------

-- 1. Ramesh: Master Plumber (Indiranagar)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000001'::uuid,
    u.id,
    'Senior plumber with 9+ years experience in pipe bursts, bathroom water leakage, and sanitary fittings.',
    9.0, 350.00, 4.85, 48, TRUE, TRUE, 12.00,
    ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326)::geography,
    '100ft Road, Indiranagar, Bengaluru'
FROM public.users u
WHERE u.email = 'ramesh.kumar@example.com'
ON CONFLICT (id) DO NOTHING;

-- 2. Suresh: Master Electrician (Koramangala)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000002'::uuid,
    u.id,
    'Licensed electrician specializing in emergency short circuit repair, home rewiring, and switchboards.',
    7.5, 400.00, 4.90, 62, TRUE, TRUE, 15.00,
    ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326)::geography,
    '5th Block, Koramangala, Bengaluru'
FROM public.users u
WHERE u.email = 'suresh.patil@example.com'
ON CONFLICT (id) DO NOTHING;

-- 3. Priya: Appliance Specialist (HSR Layout)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000003'::uuid,
    u.id,
    'Certified appliance technician for split/inverter AC gas charging, coil cleaning, and washing machine repair.',
    6.0, 500.00, 4.75, 34, TRUE, TRUE, 10.00,
    ST_SetSRID(ST_MakePoint(77.6446, 12.9121), 4326)::geography,
    'Sector 3, HSR Layout, Bengaluru'
FROM public.users u
WHERE u.email = 'priya.sharma@example.com'
ON CONFLICT (id) DO NOTHING;

-- 4. Amit: Carpenter (Jayanagar)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000004'::uuid,
    u.id,
    'Expert carpenter in flat-pack furniture assembly, door lock fixing, and modular cabinet repairs.',
    11.0, 450.00, 4.80, 51, TRUE, TRUE, 15.00,
    ST_SetSRID(ST_MakePoint(77.5938, 12.9250), 4326)::geography,
    '4th Block, Jayanagar, Bengaluru'
FROM public.users u
WHERE u.email = 'amit.verma@example.com'
ON CONFLICT (id) DO NOTHING;

-- 5. Rajesh: Emergency Mobile Mechanic (Whitefield)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000005'::uuid,
    u.id,
    'Rapid response mechanic for two-wheeler breakdown, car jumpstart service, and emergency assistance.',
    5.0, 300.00, 4.65, 29, TRUE, TRUE, 15.00,
    ST_SetSRID(ST_MakePoint(77.7500, 12.9698), 4326)::geography,
    'ITPL Main Road, Whitefield, Bengaluru'
FROM public.users u
WHERE u.email = 'rajesh.nair@example.com'
ON CONFLICT (id) DO NOTHING;

-- 6. Sunita: Mathematics Educator (Malleshwaram)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000006'::uuid,
    u.id,
    'Experienced mathematics tutor offering personal coaching in high school algebra, geometry, and calculus.',
    8.0, 600.00, 4.95, 41, TRUE, TRUE, 8.00,
    ST_SetSRID(ST_MakePoint(77.5643, 13.0031), 4326)::geography,
    '8th Cross, Malleshwaram, Bengaluru'
FROM public.users u
WHERE u.email = 'sunita.rao@example.com'
ON CONFLICT (id) DO NOTHING;

-- 7. Manoj: Electrician (BTM Layout)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000007'::uuid,
    u.id,
    'Prompt technician for switchboard maintenance, fan fittings, and home electrical problem diagnosis.',
    4.5, 300.00, 4.60, 22, TRUE, TRUE, 10.00,
    ST_SetSRID(ST_MakePoint(77.6101, 12.9166), 4326)::geography,
    'BTM 2nd Stage, Bengaluru'
FROM public.users u
WHERE u.email = 'manoj.joshi@example.com'
ON CONFLICT (id) DO NOTHING;

-- 8. Deepa: Plumber (MG Road / Central)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000008'::uuid,
    u.id,
    'Specialist in bathroom fixtures, drain unblocking, and tap/faucet replacement.',
    6.5, 350.00, 4.70, 38, TRUE, TRUE, 12.00,
    ST_SetSRID(ST_MakePoint(77.6066, 12.9756), 4326)::geography,
    'Brigade Road / MG Road Area, Bengaluru'
FROM public.users u
WHERE u.email = 'deepa.patel@example.com'
ON CONFLICT (id) DO NOTHING;

-- 9. Vikram: Appliance Engineer (Marathahalli)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000009'::uuid,
    u.id,
    'Experienced technician for washing machine motors, drum repair, and home appliance maintenance.',
    5.5, 450.00, 4.60, 26, TRUE, TRUE, 12.00,
    ST_SetSRID(ST_MakePoint(77.6974, 12.9591), 4326)::geography,
    'Outer Ring Road, Marathahalli, Bengaluru'
FROM public.users u
WHERE u.email = 'vikram.singh@example.com'
ON CONFLICT (id) DO NOTHING;

-- 10. Ananya: Math Coach (Rajajinagar)
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
SELECT 
    'b0000000-0000-0000-0000-000000000010'::uuid,
    u.id,
    'Passionate math educator specializing in foundational concepts and exam preparation for middle and high school.',
    4.0, 500.00, 4.80, 19, TRUE, TRUE, 8.00,
    ST_SetSRID(ST_MakePoint(77.5562, 12.9982), 4326)::geography,
    '1st Block, Rajajinagar, Bengaluru'
FROM public.users u
WHERE u.email = 'ananya.mukherjee@example.com'
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. SEED WORKER-SKILL RELATIONSHIPS (Only for inserted workers)
-- ------------------------------------------------------------------------------
INSERT INTO public.worker_skills (id, worker_id, skill_id, experience_years)
SELECT gen_random_uuid(), w.id, s.id, mapping.exp_years
FROM (
    VALUES
        -- Ramesh (Plumber)
        ('b0000000-0000-0000-0000-000000000001'::uuid, '11111111-0000-0000-0000-000000000001'::uuid, 9.0),
        ('b0000000-0000-0000-0000-000000000001'::uuid, '11111111-0000-0000-0000-000000000002'::uuid, 9.0),
        ('b0000000-0000-0000-0000-000000000001'::uuid, '11111111-0000-0000-0000-000000000003'::uuid, 7.0),
        ('b0000000-0000-0000-0000-000000000001'::uuid, '11111111-0000-0000-0000-000000000004'::uuid, 8.0),

        -- Suresh (Electrician)
        ('b0000000-0000-0000-0000-000000000002'::uuid, '22222222-0000-0000-0000-000000000001'::uuid, 7.5),
        ('b0000000-0000-0000-0000-000000000002'::uuid, '22222222-0000-0000-0000-000000000002'::uuid, 7.5),
        ('b0000000-0000-0000-0000-000000000002'::uuid, '22222222-0000-0000-0000-000000000003'::uuid, 7.5),

        -- Priya (Appliance Tech)
        ('b0000000-0000-0000-0000-000000000003'::uuid, '44444444-0000-0000-0000-000000000001'::uuid, 6.0),
        ('b0000000-0000-0000-0000-000000000003'::uuid, '44444444-0000-0000-0000-000000000002'::uuid, 5.0),

        -- Amit (Carpenter)
        ('b0000000-0000-0000-0000-000000000004'::uuid, '33333333-0000-0000-0000-000000000001'::uuid, 11.0),
        ('b0000000-0000-0000-0000-000000000004'::uuid, '33333333-0000-0000-0000-000000000002'::uuid, 10.0),

        -- Rajesh (Mechanic)
        ('b0000000-0000-0000-0000-000000000005'::uuid, '55555555-0000-0000-0000-000000000001'::uuid, 5.0),
        ('b0000000-0000-0000-0000-000000000005'::uuid, '55555555-0000-0000-0000-000000000002'::uuid, 4.0),

        -- Sunita (Tutor)
        ('b0000000-0000-0000-0000-000000000006'::uuid, '66666666-0000-0000-0000-000000000001'::uuid, 8.0),

        -- Manoj (Electrician)
        ('b0000000-0000-0000-0000-000000000007'::uuid, '22222222-0000-0000-0000-000000000002'::uuid, 4.0),
        ('b0000000-0000-0000-0000-000000000007'::uuid, '22222222-0000-0000-0000-000000000003'::uuid, 4.5),

        -- Deepa (Plumber)
        ('b0000000-0000-0000-0000-000000000008'::uuid, '11111111-0000-0000-0000-000000000002'::uuid, 6.5),
        ('b0000000-0000-0000-0000-000000000008'::uuid, '11111111-0000-0000-0000-000000000003'::uuid, 6.0),
        ('b0000000-0000-0000-0000-000000000008'::uuid, '11111111-0000-0000-0000-000000000004'::uuid, 5.0),

        -- Vikram (Appliance Repair)
        ('b0000000-0000-0000-0000-000000000009'::uuid, '44444444-0000-0000-0000-000000000002'::uuid, 5.5),

        -- Ananya (Tutor)
        ('b0000000-0000-0000-0000-000000000010'::uuid, '66666666-0000-0000-0000-000000000001'::uuid, 4.0)
) AS mapping(worker_id, skill_id, exp_years)
JOIN public.workers w ON w.id = mapping.worker_id
JOIN public.skills s ON s.id = mapping.skill_id
ON CONFLICT (worker_id, skill_id) DO NOTHING;
