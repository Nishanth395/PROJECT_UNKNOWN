# Database Module (PostgreSQL + PostGIS + Supabase)

Owned by: **Member 4 (Database & PostGIS Lead)**

## Purpose
This directory contains SQL schema migrations, spatial indexes (`GIST`), PostGIS configuration, and realistic seed data for development and testing.

## Planned Structure
```text
database/
├── migrations/        # SQL migration files executed sequentially
│   ├── 01_extensions.sql
│   ├── 02_tables.sql
│   └── 03_spatial_indexes.sql
├── seeds/             # Seed data with realistic worker locations
│   ├── 01_categories_seed.sql
│   └── 02_workers_seed.sql
└── README.md
```
