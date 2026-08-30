-- ==============================================================================
-- PROJECT UNKNOWN - SEED DATA (DEVELOPMENT & DEMO)
-- ==============================================================================
-- 10 Workers, 14 Skills, Realistic Worker-Skill Mappings, Bengaluru PostGIS Points
-- Fictional development data only (No real personal information).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEED SKILLS (14 Canonical Skills across 6 Categories)
-- ------------------------------------------------------------------------------
INSERT INTO public.skills (id, name, category, description)
VALUES
    -- Plumbing (4 skills)
    ('11111111-0000-0000-0000-000000000001', 'Pipe Repair', 'Plumbing', 'Fixing burst, leaking, or damaged PVC, CPVC, and metal pipes'),
    ('11111111-0000-0000-0000-000000000002', 'Leak Fixing', 'Plumbing', 'Sealing under-sink dripping, bathroom ceiling leakage, and joint seepage'),
    ('11111111-0000-0000-0000-000000000003', 'Drain Cleaning', 'Plumbing', 'Unblocking kitchen sinks, bathroom drains, and sewer lines'),
    ('11111111-0000-0000-0000-000000000004', 'Faucet & Tap Installation', 'Plumbing', 'Installing and repairing mixer taps, diverters, and bib taps'),

    -- Electrical (3 skills)
    ('22222222-0000-0000-0000-000000000001', 'House Wiring', 'Electrical', 'Complete residential wiring, rewiring, and circuit safety checks'),
    ('22222222-0000-0000-0000-000000000002', 'Short Circuit Diagnosis', 'Electrical', 'Tracing tripping MCBs, neutral faults, and short circuits'),
    ('22222222-0000-0000-0000-000000000003', 'Switchboard Repair', 'Electrical', 'Repairing sockets, modular switches, and regulator boards'),

    -- Carpentry (2 skills)
    ('33333333-0000-0000-0000-000000000001', 'Furniture Assembly', 'Carpentry', 'Assembling beds, modular wardrobes, bookshelves, and tables'),
    ('33333333-0000-0000-0000-000000000002', 'Door Lock & Latch Fixing', 'Carpentry', 'Fixing cylindrical locks, deadbolts, handles, and door hinges'),

    -- Appliance Repair (2 skills)
    ('44444444-0000-0000-0000-000000000001', 'AC Repair & Gas Refill', 'Appliance Repair', 'Split/Window AC servicing, gas leak fix, and compressor checks'),
    ('44444444-0000-0000-0000-000000000002', 'Washing Machine Diagnosis', 'Appliance Repair', 'Drum vibration, motor repair, and drainage pump replacement'),

    -- Mechanic & Automotive (2 skills)
    ('55555555-0000-0000-0000-000000000001', 'Two-Wheeler Servicing', 'Mechanic', 'General scooter and motorcycle maintenance and oil change'),
    ('55555555-0000-0000-0000-000000000002', 'Car Battery Jumpstart', 'Mechanic', 'Emergency on-site jumpstarting and battery replacement'),

    -- Tutoring (1 skill)
    ('66666666-0000-0000-0000-000000000001', 'Mathematics Tutoring', 'Tutoring', 'Home coaching for high school algebra, geometry, and calculus')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. SEED USERS (10 Fictional Worker Accounts)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES
            ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'ramesh.kumar@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Ramesh Kumar"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'suresh.patil@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Suresh Patil"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'priya.sharma@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Priya Sharma"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'amit.verma@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Amit Verma"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'rajesh.nair@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Rajesh Nair"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'sunita.rao@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Sunita Rao"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'manoj.joshi@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Manoj Joshi"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'deepa.patel@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Deepa Patel"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'vikram.singh@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Vikram Singh"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'ananya.mukherjee@example.com', '', NOW(), '{"provider":"email"}', '{"full_name":"Ananya Mukherjee"}', NOW(), NOW(), 'authenticated', 'authenticated')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

INSERT INTO public.users (id, full_name, phone, email, avatar_url, role)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Ramesh Kumar', '+919876543201', 'ramesh.kumar@example.com', 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a', 'worker'),
    ('a0000000-0000-0000-0000-000000000002', 'Suresh Patil', '+919876543202', 'suresh.patil@example.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 'worker'),
    ('a0000000-0000-0000-0000-000000000003', 'Priya Sharma', '+919876543203', 'priya.sharma@example.com', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2', 'worker'),
    ('a0000000-0000-0000-0000-000000000004', 'Amit Verma', '+919876543204', 'amit.verma@example.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', 'worker'),
    ('a0000000-0000-0000-0000-000000000005', 'Rajesh Nair', '+919876543205', 'rajesh.nair@example.com', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e', 'worker'),
    ('a0000000-0000-0000-0000-000000000006', 'Sunita Rao', '+919876543206', 'sunita.rao@example.com', 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd', 'worker'),
    ('a0000000-0000-0000-0000-000000000007', 'Manoj Joshi', '+919876543207', 'manoj.joshi@example.com', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7', 'worker'),
    ('a0000000-0000-0000-0000-000000000008', 'Deepa Patel', '+919876543208', 'deepa.patel@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', 'worker'),
    ('a0000000-0000-0000-0000-000000000009', 'Vikram Singh', '+919876543209', 'vikram.singh@example.com', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', 'worker'),
    ('a0000000-0000-0000-0000-000000000010', 'Ananya Mukherjee', '+919876543210', 'ananya.mukherjee@example.com', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', 'worker')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. SEED 10 WORKERS WITH GEOGRAPHIC LOCATIONS (Bengaluru Reference Coordinates)
-- ------------------------------------------------------------------------------
INSERT INTO public.workers (
    id, user_id, description, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
VALUES
    -- 1. Ramesh: Master Plumber (Indiranagar)
    (
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'Senior plumber with 9+ years experience in pipe bursts, bathroom water leakage, and sanitary fittings.',
        9.0, 350.00, 4.85, 48, TRUE, TRUE, 12.00,
        ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326)::geography,
        '100ft Road, Indiranagar, Bengaluru'
    ),
    -- 2. Suresh: Master Electrician (Koramangala)
    (
        'b0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000002',
        'Licensed electrician specializing in emergency short circuit repair, home rewiring, and switchboards.',
        7.5, 400.00, 4.90, 62, TRUE, TRUE, 15.00,
        ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326)::geography,
        '5th Block, Koramangala, Bengaluru'
    ),
    -- 3. Priya: Appliance Specialist (HSR Layout)
    (
        'b0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000003',
        'Certified appliance technician for split/inverter AC gas charging, coil cleaning, and washing machine repair.',
        6.0, 500.00, 4.75, 34, TRUE, TRUE, 10.00,
        ST_SetSRID(ST_MakePoint(77.6446, 12.9121), 4326)::geography,
        'Sector 3, HSR Layout, Bengaluru'
    ),
    -- 4. Amit: Carpenter (Jayanagar)
    (
        'b0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000004',
        'Expert carpenter in flat-pack furniture assembly, door lock fixing, and modular cabinet repairs.',
        11.0, 450.00, 4.80, 51, TRUE, TRUE, 15.00,
        ST_SetSRID(ST_MakePoint(77.5938, 12.9250), 4326)::geography,
        '4th Block, Jayanagar, Bengaluru'
    ),
    -- 5. Rajesh: Emergency Mobile Mechanic (Whitefield)
    (
        'b0000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000005',
        'Rapid response mechanic for two-wheeler breakdown, car jumpstart service, and emergency assistance.',
        5.0, 300.00, 4.65, 29, TRUE, TRUE, 15.00,
        ST_SetSRID(ST_MakePoint(77.7500, 12.9698), 4326)::geography,
        'ITPL Main Road, Whitefield, Bengaluru'
    ),
    -- 6. Sunita: Mathematics Educator (Malleshwaram)
    (
        'b0000000-0000-0000-0000-000000000006',
        'a0000000-0000-0000-0000-000000000006',
        'Experienced mathematics tutor offering personal coaching in high school algebra, geometry, and calculus.',
        8.0, 600.00, 4.95, 41, TRUE, TRUE, 8.00,
        ST_SetSRID(ST_MakePoint(77.5643, 13.0031), 4326)::geography,
        '8th Cross, Malleshwaram, Bengaluru'
    ),
    -- 7. Manoj: Electrician (BTM Layout)
    (
        'b0000000-0000-0000-0000-000000000007',
        'a0000000-0000-0000-0000-000000000007',
        'Prompt technician for switchboard maintenance, fan fittings, and home electrical problem diagnosis.',
        4.5, 300.00, 4.60, 22, TRUE, TRUE, 10.00,
        ST_SetSRID(ST_MakePoint(77.6101, 12.9166), 4326)::geography,
        'BTM 2nd Stage, Bengaluru'
    ),
    -- 8. Deepa: Plumber (MG Road / Central)
    (
        'b0000000-0000-0000-0000-000000000008',
        'a0000000-0000-0000-0000-000000000008',
        'Specialist in bathroom fixtures, drain unblocking, and tap/faucet replacement.',
        6.5, 350.00, 4.70, 38, TRUE, TRUE, 12.00,
        ST_SetSRID(ST_MakePoint(77.6066, 12.9756), 4326)::geography,
        'Brigade Road / MG Road Area, Bengaluru'
    ),
    -- 9. Vikram: Appliance Engineer (Marathahalli)
    (
        'b0000000-0000-0000-0000-000000000009',
        'a0000000-0000-0000-0000-000000000009',
        'Experienced technician for washing machine motors, drum repair, and home appliance maintenance.',
        5.5, 450.00, 4.60, 26, TRUE, TRUE, 12.00,
        ST_SetSRID(ST_MakePoint(77.6974, 12.9591), 4326)::geography,
        'Outer Ring Road, Marathahalli, Bengaluru'
    ),
    -- 10. Ananya: Math Coach (Rajajinagar)
    (
        'b0000000-0000-0000-0000-000000000010',
        'a0000000-0000-0000-0000-000000000010',
        'Passionate math educator specializing in foundational concepts and exam preparation for middle and high school.',
        4.0, 500.00, 4.80, 19, TRUE, TRUE, 8.00,
        ST_SetSRID(ST_MakePoint(77.5562, 12.9982), 4326)::geography,
        '1st Block, Rajajinagar, Bengaluru'
    )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. SEED WORKER-SKILL RELATIONSHIPS (With Skill-Specific Experience)
-- ------------------------------------------------------------------------------
INSERT INTO public.worker_skills (id, worker_id, skill_id, experience_years)
VALUES
    -- Ramesh (Plumbing: 9 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 9.0), -- Pipe Repair
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 9.0), -- Leak Fixing
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 7.0), -- Drain Cleaning
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 8.0), -- Faucet Installation

    -- Suresh (Electrical: 7.5 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 7.5), -- House Wiring
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 7.5), -- Short Circuit Diagnosis
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 7.5), -- Switchboard Repair

    -- Priya (Appliance Repair: 6 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 6.0), -- AC Repair & Gas Refill
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002', 5.0), -- Washing Machine Diagnosis

    -- Amit (Carpentry: 11 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 11.0), -- Furniture Assembly
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000002', 10.0), -- Door Lock Fixing

    -- Rajesh (Mechanic: 5 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000005', '55555555-0000-0000-0000-000000000001', 5.0), -- Two-Wheeler Servicing
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000005', '55555555-0000-0000-0000-000000000002', 4.0), -- Jumpstart

    -- Sunita (Tutoring: 8 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000006', '66666666-0000-0000-0000-000000000001', 8.0), -- Math Tutoring

    -- Manoj (Electrical: 4.5 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000002', 4.0), -- Short Circuit
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000003', 4.5), -- Switchboard

    -- Deepa (Plumbing: 6.5 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000002', 6.5), -- Leak Fixing
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000003', 6.0), -- Drain Cleaning
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004', 5.0), -- Faucet Installation

    -- Vikram (Appliance Repair: 5.5 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000009', '44444444-0000-0000-0000-000000000002', 5.5), -- Washing Machine Diagnosis

    -- Ananya (Tutoring: 4 yrs total)
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000010', '66666666-0000-0000-0000-000000000001', 4.0)  -- Math Tutoring
ON CONFLICT (worker_id, skill_id) DO NOTHING;
