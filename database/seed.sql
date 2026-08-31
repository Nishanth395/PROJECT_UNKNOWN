-- ==============================================================================
-- PROJECT UNKNOWN - CANONICAL REFERENCE SEED
-- ==============================================================================
-- Scope: Universal reference data with ZERO dependency on Supabase Auth.
-- Safe to execute in any environment (Local, Staging, Production).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CANONICAL SKILLS (14 Standard Skills across 6 Core Categories)
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
