# Mobile Module (Flutter Cross-Platform Client)

Flutter cross-platform mobile client for **Project Unknown** providing dual experiences:
1. **Customer Workflow**: Authentication, natural-language problem description, GPS & manual location detection, AI intent extraction, and deterministic PostGIS worker matching.
2. **Worker Workflow**: Worker onboarding wizard, canonical trade skills selection, dispatch radius configuration, location settings, real-time availability toggle, and worker dashboard metrics.

---

## 🗂️ Architecture & Folder Layout

```text
mobile/
├── android/
│   └── app/src/main/AndroidManifest.xml # ACCESS_FINE_LOCATION & ACCESS_COARSE_LOCATION
├── ios/
│   └── Runner/Info.plist                # NSLocationWhenInUseUsageDescription
├── lib/
│   ├── main.dart             # App entrypoint, Supabase init, MultiProvider, AuthGate
│   ├── core/
│   │   ├── config/
│   │   │   └── app_config.dart   # Configurable Supabase & FastAPI URLs
│   │   ├── constants/
│   │   │   ├── api_constants.dart # API route endpoints
│   │   │   └── app_colors.dart    # Theme & Urgency badge color palette
│   │   └── network/
│   │       ├── api_client.dart    # HTTP client with dynamic JWT Bearer injection
│   │       └── api_exceptions.dart # User-friendly typed error handling
│   ├── models/
│   │   ├── user_profile.dart     # Customer/Worker user profile model
│   │   ├── service_request.dart  # Service request data model
│   │   ├── service_extraction.dart # AI requirement classification model
│   │   ├── worker_match.dart     # Ranked worker item & matching response
│   │   ├── worker_profile.dart   # Worker profile, skills & completion percentage
│   │   └── location_data.dart    # LocationDataModel & coordinate validation
│   ├── services/
│   │   ├── auth_service.dart     # Supabase Auth operations & profile sync
│   │   ├── location_service.dart # Geolocator wrapper, GPS acquisition & settings
│   │   ├── service_request_api.dart # CRUD & AI extraction endpoints
│   │   ├── matching_api.dart     # Deterministic worker matching endpoint
│   │   └── worker_api.dart       # Worker profile & skills management API
│   ├── providers/
│   │   ├── auth_provider.dart    # Session & user auth state management
│   │   ├── location_provider.dart # GPS state, manual fallback & permissions
│   │   ├── request_provider.dart # Request creation & AI classification state
│   │   ├── matching_provider.dart # Worker matching results state
│   │   └── worker_provider.dart  # Worker profile & skills state management
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart   # Email/password authentication
│   │   │   └── signup_screen.dart  # Registration (Customer / Worker)
│   │   ├── home/
│   │   │   └── home_screen.dart    # Customer home screen & problem CTA
│   │   ├── requests/
│   │   │   ├── create_request_screen.dart # Description, Urgency, GPS & manual location
│   │   │   ├── request_detail_screen.dart # Status, GPS coordinates & AI intent
│   │   │   └── my_requests_screen.dart    # Customer's historical requests
│   │   ├── matches/
│   │   │   └── worker_matches_screen.dart # Ranked worker list & details
│   │   └── worker/
│   │       ├── worker_onboarding_screen.dart # Step-by-step onboarding wizard
│   │       ├── worker_dashboard_screen.dart  # Metrics, availability & profile completion
│   │       ├── worker_profile_screen.dart    # Profile editing (Bio, Radius, Coordinates)
│   │       └── worker_skills_screen.dart     # Canonical skills management
│   └── widgets/
│       ├── worker_match_card.dart  # Reusable worker card with score & skills
│       ├── loading_indicator.dart  # Clean animated spinner & message
│       └── custom_button.dart      # Standardized elevation & state button
├── test/
│   ├── models/
│   │   ├── service_request_test.dart
│   │   ├── service_extraction_test.dart
│   │   ├── worker_match_test.dart
│   │   ├── worker_profile_test.dart
│   │   └── location_data_test.dart
│   ├── services/
│   │   └── location_service_test.dart
│   ├── providers/
│   │   ├── location_provider_test.dart
│   │   └── worker_provider_test.dart
│   └── core/
│       └── api_exceptions_test.dart
├── pubspec.yaml
├── analysis_options.yaml
└── README.md
```

---

## 🛠️ Worker Experience (Phase 6A)

```text
Worker Login / Signup
       ↓
AuthGate detects public.users.role == 'worker'
       ↓
Worker Profile Setup (Onboarding Wizard)
   ├── Step 1: Professional Bio & Description
   ├── Step 2: Total Experience (Years)
   ├── Step 3: Canonical Skills Selection (Grouped by Category)
   ├── Step 4: Base Location GPS Coordinates
   ├── Step 5: Operating Service Radius (2-25 km)
   └── Step 6: Initial Availability Toggle
       ↓
Worker Dashboard
   ├── Availability Indicator (🟢 Available / ⚪ Offline)
   ├── Profile Completion Progress Bar (%)
   ├── Live Metrics: Rating, Reviews, Experience, Service Radius
   └── Manage Skills Screen
```

---

## 🧪 Testing

Run automated tests:

```bash
cd mobile
flutter test
```
