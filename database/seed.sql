-- ==============================================================================
-- PROJECT UNKNOWN - SEED DATA (DEVELOPMENT & DEMO)
-- ==============================================================================
-- Note: Uses fictional names and realistic reference coordinates in Bengaluru, India.
-- Safe for local development and Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEED SKILLS
-- ------------------------------------------------------------------------------
INSERT INTO public.skills (id, name, category, description)
VALUES
    -- Plumbing Skills
    ('11111111-0000-0000-0000-000000000001', 'Pipe Repair', 'Plumbing', 'Fixing burst, leaking, or damaged PVC, CPVC, and copper pipes'),
    ('11111111-0000-0000-0000-000000000002', 'Leak Fixing', 'Plumbing', 'Sealing pipe joints, bathroom leakage, and under-sink dripping'),
    ('11111111-0000-0000-0000-000000000003', 'Drain Cleaning', 'Plumbing', 'Clearing clogged sinks, bathroom drains, and main sewer blockage'),
    ('11111111-0000-0000-0000-000000000004', 'Faucet & Tap Installation', 'Plumbing', 'Installing and repairing bathroom and kitchen faucets, mixer taps'),
    ('11111111-0000-0000-0000-000000000005', 'Water Heater / Geyser Setup', 'Plumbing', 'Plumbing connections and valve fitting for geysers'),

    -- Electrical Skills
    ('22222222-0000-0000-0000-000000000001', 'House Wiring', 'Electrical', 'Complete residential wiring, rewiring, and conduit fitting'),
    ('22222222-0000-0000-0000-000000000002', 'Short Circuit Diagnosis', 'Electrical', 'Identifying tripping MCBs, short circuits, and ground faults'),
    ('22222222-0000-0000-0000-000000000003', 'Switchboard Repair', 'Electrical', 'Replacing burnt switches, sockets, regulators, and distribution boards'),
    ('22222222-0000-0000-0000-000000000004', 'Ceiling Fan Installation', 'Electrical', 'Assembling, mounting, and regulator wiring for ceiling and exhaust fans'),
    ('22222222-0000-0000-0000-000000000005', 'Inverter & UPS Setup', 'Electrical', 'Battery connections, inverter installation, and backup circuit wiring'),

    -- Carpentry Skills
    ('33333333-0000-0000-0000-000000000001', 'Furniture Assembly', 'Carpentry', 'Assembling flat-pack furniture, beds, wardrobes, and study desks'),
    ('33333333-0000-0000-0000-000000000002', 'Door Lock & Latch Fixing', 'Carpentry', 'Installing cylindrical locks, deadbolts, and door handles'),
    ('33333333-0000-0000-0000-000000000003', 'Modular Kitchen Repair', 'Carpentry', 'Hinges adjustment, drawer sliding channel repair, and woodwork'),

    -- Appliance Repair Skills
    ('44444444-0000-0000-0000-000000000001', 'AC Repair & Gas Refill', 'Appliance Repair', 'Split/Window AC cooling diagnosis, gas charging, and coil cleaning'),
    ('44444444-0000-0000-0000-000000000002', 'Washing Machine Diagnosis', 'Appliance Repair', 'Drum spinning issues, water drainage fault, and PCB repairs'),
    ('44444444-0000-0000-0000-000000000003', 'Refrigerator Repair', 'Appliance Repair', 'Compressor fault, defrosting issue, and cooling thermostat fix'),

    -- Mechanic & Automotive Skills
    ('55555555-0000-0000-0000-000000000001', 'Two-Wheeler Servicing', 'Mechanic', 'Motorcycle/scooter general service, oil change, and spark plug repair'),
    ('55555555-0000-0000-0000-000000000002', 'Car Battery Jumpstart', 'Mechanic', 'On-site battery jumpstarting, terminal cleaning, and testing'),
    ('55555555-0000-0000-0000-000000000003', 'Puncture & Tyre Service', 'Mechanic', 'Tubeless tyre puncture repair and emergency wheel change'),

    -- Tutoring Skills
    ('66666666-0000-0000-0000-000000000001', 'High School Mathematics', 'Tutoring', 'Algebra, Geometry, Trigonometry, and Calculus for grades 8-12'),
    ('66666666-0000-0000-0000-000000000002', 'Physics Tutoring', 'Tutoring', 'Mechanics, Electromagnetism, and Optics tutoring'),
    ('66666666-0000-0000-0000-000000000003', 'English & Communication', 'Tutoring', 'Spoken English, grammar, and interview preparation')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. SEED USERS (Simulating Auth & Profile records)
-- ------------------------------------------------------------------------------
-- In Supabase, users exist in auth.users. To ensure demo seeds work in both Supabase
-- and standalone PostgreSQL, we safely ensure auth.users rows exist first if applicable.

DO $$
BEGIN
    -- Check if auth schema exists (Supabase environment)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES
            ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'ramesh.plumber@example.com', '', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ramesh Kumar"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'suresh.electrician@example.com', '', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Suresh Patil"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'priya.ac@example.com', '', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Sharma"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'amit.carpenter@example.com', '', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amit Verma"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'rajesh.mechanic@example.com', '', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rajesh Nair"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'sunita.tutor@example.com', '', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sunita Rao"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'manoj.electrician@example.com', '', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Manoj Joshi"}', NOW(), NOW(), 'authenticated', 'authenticated'),
            ('a0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'deepa.plumber@example.com', '', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Deepa Patel"}', NOW(), NOW(), 'authenticated', 'authenticated')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

INSERT INTO public.users (id, full_name, phone, email, avatar_url, role)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Ramesh Kumar', '+919876543201', 'ramesh.plumber@example.com', 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a', 'worker'),
    ('a0000000-0000-0000-0000-000000000002', 'Suresh Patil', '+919876543202', 'suresh.electrician@example.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 'worker'),
    ('a0000000-0000-0000-0000-000000000003', 'Priya Sharma', '+919876543203', 'priya.ac@example.com', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2', 'worker'),
    ('a0000000-0000-0000-0000-000000000004', 'Amit Verma', '+919876543204', 'amit.carpenter@example.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', 'worker'),
    ('a0000000-0000-0000-0000-000000000005', 'Rajesh Nair', '+919876543205', 'rajesh.mechanic@example.com', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e', 'worker'),
    ('a0000000-0000-0000-0000-000000000006', 'Sunita Rao', '+919876543206', 'sunita.tutor@example.com', 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd', 'worker'),
    ('a0000000-0000-0000-0000-000000000007', 'Manoj Joshi', '+919876543207', 'manoj.electrician@example.com', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7', 'worker'),
    ('a0000000-0000-0000-0000-000000000008', 'Deepa Patel', '+919876543208', 'deepa.plumber@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', 'worker')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. SEED WORKERS WITH GEOGRAPHIC LOCATIONS (Bengaluru Hubs)
-- ------------------------------------------------------------------------------
INSERT INTO public.workers (
    id, user_id, bio, experience_years, hourly_rate, rating, total_reviews,
    is_available, is_verified, service_radius_km, location, address_text
)
VALUES
    -- Ramesh: Plumber based in Indiranagar (Lng: 77.6408, Lat: 12.9784)
    (
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'Master plumber with 9+ years experience handling pipe bursts, bathroom leakage, and high-rise sanitary fittings.',
        9.0, 350.00, 4.85, 48, TRUE, TRUE, 12.00,
        ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326)::geography,
        '100ft Road, Indiranagar, Bengaluru'
    ),
    -- Suresh: Electrician based in Koramangala (Lng: 77.6245, Lat: 12.9352)
    (
        'b0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000002',
        'Licensed electrician specializing in emergency short circuit repair, home rewiring, and appliance electrical diagnostics.',
        7.5, 400.00, 4.90, 62, TRUE, TRUE, 15.00,
        ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326)::geography,
        '5th Block, Koramangala, Bengaluru'
    ),
    -- Priya: AC & Appliance Tech based in HSR Layout (Lng: 77.6446, Lat: 12.9121)
    (
        'b0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000003',
        'Certified appliance engineer for split/inverter AC servicing, gas charging, and washing machine drum repairs.',
        6.0, 500.00, 4.75, 34, TRUE, TRUE, 10.00,
        ST_SetSRID(ST_MakePoint(77.6446, 12.9121), 4326)::geography,
        'Sector 3, HSR Layout, Bengaluru'
    ),
    -- Amit: Carpenter based in Jayanagar (Lng: 77.5938, Lat: 12.9250)
    (
        'b0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000004',
        'Expert carpenter in customized modular furniture, door lock installation, and kitchen cabinet repair.',
        11.0, 450.00, 4.80, 51, TRUE, TRUE, 15.00,
        ST_SetSRID(ST_MakePoint(77.5938, 12.9250), 4326)::geography,
        '4th Block, Jayanagar, Bengaluru'
    ),
    -- Rajesh: Mechanic based in Whitefield (Lng: 77.7500, Lat: 12.9698)
    (
        'b0000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000005',
        'Fast response mobile mechanic for two-wheeler breakdown, jumpstart service, and puncture assistance.',
        5.0, 300.00, 4.65, 29, TRUE, TRUE, 15.00,
        ST_SetSRID(ST_MakePoint(77.7500, 12.9698), 4326)::geography,
        'ITPL Main Road, Whitefield, Bengaluru'
    ),
    -- Sunita: Math & Physics Tutor based in Malleshwaram (Lng: 77.5643, Lat: 13.0031)
    (
        'b0000000-0000-0000-0000-000000000006',
        'a0000000-0000-0000-0000-000000000006',
        'M.Sc Physics educator offering home & online coaching in Mathematics and Physics for CBSE/ICSE students.',
        8.0, 600.00, 4.95, 41, TRUE, TRUE, 8.00,
        ST_SetSRID(ST_MakePoint(77.5643, 13.0031), 4326)::geography,
        '8th Cross, Malleshwaram, Bengaluru'
    ),
    -- Manoj: Electrician based in BTM Layout (Lng: 77.6101, Lat: 12.9166)
    (
        'b0000000-0000-0000-0000-000000000007',
        'a0000000-0000-0000-0000-000000000007',
        'Experienced technician for fan fittings, switchboard maintenance, and home UPS installation.',
        4.5, 300.00, 4.60, 22, TRUE, TRUE, 10.00,
        ST_SetSRID(ST_MakePoint(77.6101, 12.9166), 4326)::geography,
        'BTM 2nd Stage, Bengaluru'
    ),
    -- Deepa: Plumber based near MG Road (Lng: 77.6066, Lat: 12.9756)
    (
        'b0000000-0000-0000-0000-000000000008',
        'a0000000-0000-0000-0000-000000000008',
        'Specialist in bathroom renovation plumbing, clogged drain clearing, and tap replacement.',
        6.5, 350.00, 4.70, 38, TRUE, TRUE, 12.00,
        ST_SetSRID(ST_MakePoint(77.6066, 12.9756), 4326)::geography,
        'Brigade Road / MG Road Area, Bengaluru'
    )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. SEED WORKER SKILLS (Many-to-Many Mappings)
-- ------------------------------------------------------------------------------
INSERT INTO public.worker_skills (worker_id, skill_id, experience_years)
VALUES
    -- Ramesh (Plumber)
    ('b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 9.0), -- Pipe Repair
    ('b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 9.0), -- Leak Fixing
    ('b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 7.0), -- Drain Cleaning
    ('b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 8.0), -- Faucet Installation

    -- Suresh (Electrician)
    ('b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 7.5), -- House Wiring
    ('b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 7.5), -- Short Circuit Diagnosis
    ('b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 7.5), -- Switchboard Repair
    ('b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000005', 5.0), -- Inverter & UPS Setup

    -- Priya (Appliance Tech)
    ('b0000000-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 6.0), -- AC Repair & Gas Refill
    ('b0000000-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002', 5.0), -- Washing Machine Diagnosis
    ('b0000000-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000003', 4.0), -- Refrigerator Repair

    -- Amit (Carpenter)
    ('b0000000-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 11.0), -- Furniture Assembly
    ('b0000000-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000002', 10.0), -- Door Lock & Latch
    ('b0000000-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000003', 8.0), -- Modular Kitchen

    -- Rajesh (Mechanic)
    ('b0000000-0000-0000-0000-000000000005', '55555555-0000-0000-0000-000000000001', 5.0), -- Two-Wheeler Servicing
    ('b0000000-0000-0000-0000-000000000005', '55555555-0000-0000-0000-000000000002', 4.5), -- Jumpstart
    ('b0000000-0000-0000-0000-000000000005', '55555555-0000-0000-0000-000000000003', 5.0), -- Puncture

    -- Sunita (Tutor)
    ('b0000000-0000-0000-0000-000000000006', '66666666-0000-0000-0000-000000000001', 8.0), -- Mathematics
    ('b0000000-0000-0000-0000-000000000006', '66666666-0000-0000-0000-000000000002', 7.0), -- Physics

    -- Manoj (Electrician)
    ('b0000000-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000003', 4.5), -- Switchboard
    ('b0000000-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000004', 4.5), -- Ceiling Fan
    ('b0000000-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000005', 3.0), -- Inverter Setup

    -- Deepa (Plumber)
    ('b0000000-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000002', 6.5), -- Leak Fixing
    ('b0000000-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000003', 6.0), -- Drain Cleaning
    ('b0000000-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004', 5.0)  -- Faucet Installation
ON CONFLICT (worker_id, skill_id) DO NOTHING;
