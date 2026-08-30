# Backend Module (FastAPI Modular Monolith)

Owned by: **Member 3 (FastAPI Backend Lead)** & **Member 1 (Integration & Architecture Lead)**

## Purpose
This directory contains the modular monolith FastAPI server handling business logic, Supabase JWT verification, request routing, and matching orchestration.

## Planned Structure
```text
backend/
├── app/
│   ├── main.py
│   ├── core/          # Config, security (Supabase JWT verifier), database session
│   ├── models/        # Pydantic schemas & SQLAlchemy ORM models
│   ├── api/v1/        # Routers: /auth, /workers, /requests, /bookings, /skills
│   └── services/      # matching_orchestrator, ranking_engine
├── tests/
├── requirements.txt
└── README.md
```
