# Project Unknown - API Contracts & Specifications

This document defines the planned REST API structure for Project Unknown.

**Base URL**: `http://<host>:8000/api/v1`  
**Authentication**: All protected endpoints require `Authorization: Bearer <supabase_jwt_token>` header.  
**Content-Type**: `application/json`

---

## Summary of Planned Endpoints

| Category | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `POST` | `/auth/sync` | Sync Supabase authenticated user to PostgreSQL `profiles` | Yes (Bearer JWT) |
| | `POST` | `/auth/role` | Update user role (`customer` / `worker`) | Yes (Bearer JWT) |
| **Workers** | `GET` | `/workers` | Query and filter worker profiles by category or radius | No |
| | `GET` | `/workers/{worker_id}` | Retrieve detailed worker profile, rating & reviews | No |
| | `POST` | `/workers` | Register/upgrade current profile as a service worker | Yes (Bearer JWT) |
| **Problem / Search** | `POST` | `/requests` | Create and save a new user service request | Yes (Bearer JWT) |
| | `POST` | `/search/matches` | Core matching: extract skills, query PostGIS, rank workers | Yes (Bearer JWT) |
| **Bookings** | `POST` | `/bookings` | Create a new booking request for a worker | Yes (Bearer JWT) |
| | `GET` | `/bookings` | List bookings for current authenticated user | Yes (Bearer JWT) |
| | `GET` | `/bookings/{booking_id}` | Get single booking details and status | Yes (Bearer JWT) |
| **Skills** | `GET` | `/skills` | List standard categories and associated skill tags | No |

---

## 1. Authentication Endpoints

### `POST /auth/sync`
Syncs the user profile metadata from Supabase Auth to the application's `profiles` database table.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
```json
{
  "full_name": "John Doe",
  "phone_number": "+919876543210",
  "avatar_url": "https://supabase-storage.url/avatars/user.jpg"
}
```
* **Response (200 OK)**:
```json
{
  "id": "e4b5c6d7-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone_number": "+919876543210",
  "role": "customer",
  "avatar_url": "https://supabase-storage.url/avatars/user.jpg",
  "created_at": "2026-08-30T10:00:00Z"
}
```

---

## 2. Workers Endpoints

### `GET /workers`
List workers with optional query parameters.

* **Query Parameters**:
  * `category_id` (UUID, optional)
  * `latitude` (float, optional)
  * `longitude` (float, optional)
  * `radius_km` (float, default: `10.0`)
  * `limit` (int, default: `20`)
* **Response (200 OK)**:
```json
{
  "total": 1,
  "workers": [
    {
      "worker_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
      "full_name": "Ramesh Kumar",
      "category_name": "Plumbing",
      "skills": ["pipe repair", "leak fixing"],
      "hourly_rate": 350.0,
      "average_rating": 4.8,
      "total_reviews": 42,
      "is_available": true,
      "distance_km": 2.35
    }
  ]
}
```

### `GET /workers/{worker_id}`
Retrieve full public profile and reviews for a specific worker.

* **Response (200 OK)**:
```json
{
  "worker_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "full_name": "Ramesh Kumar",
  "avatar_url": "https://supabase-storage.url/avatars/ramesh.jpg",
  "bio": "Certified master plumber with 8+ years experience in domestic pipe fittings.",
  "category_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "category_name": "Plumbing",
  "skills": ["pipe repair", "leak fixing", "sanitary fittings"],
  "experience_years": 8.5,
  "hourly_rate": 350.0,
  "average_rating": 4.8,
  "total_reviews": 42,
  "is_available": true,
  "is_verified": true,
  "address_text": "Indiranagar, Bengaluru"
}
```

### `POST /workers`
Register or update worker profile details for the authenticated user.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
```json
{
  "category_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "skills": ["pipe repair", "leak fixing", "drain unclogging"],
  "experience_years": 5.0,
  "hourly_rate": 400.0,
  "bio": "Expert in home plumbing and drain cleaning.",
  "latitude": 12.971598,
  "longitude": 77.594562,
  "address_text": "MG Road, Bengaluru"
}
```
* **Response (201 Created)**:
```json
{
  "worker_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "status": "profile_created",
  "is_verified": false
}
```

---

## 3. Problem & Search Endpoints

### `POST /requests`
Create and persist a service request.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
```json
{
  "raw_description": "My kitchen sink pipe is burst and water is flooding the floor",
  "latitude": 12.971598,
  "longitude": 77.594562,
  "address_text": "Indiranagar 100ft Road, Bengaluru"
}
```
* **Response (201 Created)**:
```json
{
  "request_id": "8fa1c4d2-3b2e-4b6e-a25e-5c4d2e8b1a9f",
  "status": "open",
  "created_at": "2026-08-30T10:05:00Z"
}
```

### `POST /search/matches`
Core AI matching endpoint: extracts skills via AI engine, queries nearby workers via PostGIS, scores candidates deterministically, and returns ranked workers.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
```json
{
  "raw_description": "My kitchen sink pipe burst and water is leaking rapidly under the cabinet",
  "latitude": 12.971598,
  "longitude": 77.594562,
  "address_text": "MG Road, Bengaluru, Karnataka",
  "max_radius_km": 15.0,
  "limit": 10
}
```
* **Response (200 OK)**:
```json
{
  "request_id": "8fa1c4d2-3b2e-4b6e-a25e-5c4d2e8b1a9f",
  "ai_analysis": {
    "detected_category": "Plumbing",
    "category_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "extracted_skills": ["pipe repair", "leak repair", "emergency plumbing"],
    "urgency": "emergency",
    "problem_summary": "Burst pipe causing active water leakage in kitchen cabinet."
  },
  "total_candidates_found": 6,
  "ranked_workers": [
    {
      "worker_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
      "full_name": "Ramesh Kumar",
      "avatar_url": "https://supabase-storage.url/avatars/ramesh.jpg",
      "phone_number": "+919876543210",
      "hourly_rate": 350.0,
      "average_rating": 4.8,
      "total_reviews": 42,
      "distance_km": 2.35,
      "match_score": 93.4,
      "match_reason": "Matches required pipe and leak repair skills; 2.4 km away with a 4.8-star rating.",
      "skills": ["pipe repair", "leak repair", "sanitary fittings"]
    }
  ]
}
```

---

## 4. Bookings Endpoints

### `POST /bookings`
Create a booking for a selected worker.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
```json
{
  "worker_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "request_id": "8fa1c4d2-3b2e-4b6e-a25e-5c4d2e8b1a9f",
  "scheduled_time": "2026-08-30T14:00:00Z"
}
```
* **Response (201 Created)**:
```json
{
  "booking_id": "3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b",
  "status": "pending",
  "worker_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "customer_id": "e4b5c6d7-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "scheduled_time": "2026-08-30T14:00:00Z",
  "created_at": "2026-08-30T10:10:00Z"
}
```

### `GET /bookings`
List bookings associated with the authenticated user (either as customer or worker).

* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `status` (string, optional: `pending` | `accepted` | `in_progress` | `completed` | `cancelled`)
* **Response (200 OK)**:
```json
{
  "total": 1,
  "bookings": [
    {
      "booking_id": "3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b",
      "worker_name": "Ramesh Kumar",
      "category": "Plumbing",
      "status": "pending",
      "scheduled_time": "2026-08-30T14:00:00Z",
      "total_amount": 350.0
    }
  ]
}
```

### `GET /bookings/{booking_id}`
Retrieve full details of a single booking.

* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
```json
{
  "booking_id": "3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b",
  "status": "accepted",
  "customer_id": "e4b5c6d7-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "worker_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "worker_name": "Ramesh Kumar",
  "worker_phone": "+919876543210",
  "scheduled_time": "2026-08-30T14:00:00Z",
  "problem_description": "Kitchen pipe leaking under sink",
  "address_text": "MG Road, Bengaluru",
  "created_at": "2026-08-30T10:10:00Z"
}
```

---

## 5. Skills & Categories Endpoints

### `GET /skills`
List all supported service categories and their standard skill taxonomy.

* **Response (200 OK)**:
```json
{
  "categories": [
    {
      "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "name": "Plumbing",
      "slug": "plumbing",
      "icon_url": "https://supabase-storage.url/icons/plumbing.png",
      "skills": ["pipe repair", "leak fixing", "drain unclogging", "faucet installation", "toilet repair"]
    },
    {
      "id": "d2e3f4a5-b6c7-8a9b-0c1d-2e3f4a5b6c7d",
      "name": "Electrical",
      "slug": "electrical",
      "icon_url": "https://supabase-storage.url/icons/electrical.png",
      "skills": ["wiring", "short circuit", "fan installation", "switchboard repair", "fuse replacement"]
    }
  ]
}
```

---

## 6. Standard Error Response Format

All error responses from FastAPI return a standard format:

```json
{
  "detail": {
    "error_code": "RESOURCE_NOT_FOUND",
    "message": "Worker with ID 7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e not found"
  }
}
```
