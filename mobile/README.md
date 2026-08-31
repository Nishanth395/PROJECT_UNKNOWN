# Mobile Module (Flutter Cross-Platform Client)

Flutter cross-platform mobile client for **Project Unknown** providing the end-to-end Customer workflow: authentication, problem description, AI requirement extraction, and deterministic PostGIS worker matching.

---

## 🗂️ Architecture & Folder Layout

```text
mobile/
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
│   │   ├── user_profile.dart     # Customer profile model
│   │   ├── service_request.dart  # Service request data model
│   │   ├── service_extraction.dart # AI requirement classification model
│   │   └── worker_match.dart     # Ranked worker item & matching response
│   ├── services/
│   │   ├── auth_service.dart     # Supabase Auth operations & profile sync
│   │   ├── service_request_api.dart # CRUD & AI extraction endpoints
│   │   └── matching_api.dart     # Deterministic worker matching endpoint
│   ├── providers/
│   │   ├── auth_provider.dart    # Session & user auth state management
│   │   ├── request_provider.dart # Request creation & AI classification state
│   │   └── matching_provider.dart # Worker matching results state
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart   # Email/password authentication
│   │   │   └── signup_screen.dart  # New customer registration
│   │   ├── home/
│   │   │   └── home_screen.dart    # Welcome banner & primary problem CTA
│   │   ├── requests/
│   │   │   ├── create_request_screen.dart # Description, Urgency & GPS inputs
│   │   │   ├── request_detail_screen.dart # Status, AI classification & intent
│   │   │   └── my_requests_screen.dart    # Historical requests list
│   │   └── matches/
│   │       └── worker_matches_screen.dart # Ranked worker list & details
│   └── widgets/
│       ├── worker_match_card.dart  # Reusable worker card with score & skills
│       ├── loading_indicator.dart  # Clean animated spinner & message
│       └── custom_button.dart      # Standardized elevation & state button
├── test/
│   ├── models/
│   │   ├── service_request_test.dart
│   │   ├── service_extraction_test.dart
│   │   └── worker_match_test.dart
│   └── core/
│       └── api_exceptions_test.dart
├── pubspec.yaml
├── analysis_options.yaml
└── README.md
```

---

## 📱 Complete Customer User Flow (Phase 5A)

```text
1. Authentication (Login / Sign Up)
   - Uses Supabase Auth to authenticate customer.
   - Automatically attaches JWT Bearer token to all FastAPI backend calls.
       ↓
2. Home Screen
   - Primary CTA: "Describe your problem"
   - Secondary: "My Requests"
       ↓
3. Create Service Request
   - Problem description (e.g. "Kitchen PVC pipe is leaking heavily")
   - Urgency selector (Low / Normal / High / Emergency)
   - GPS coordinates & address
       ↓ (POST /api/v1/service-requests)
4. Request Detail & AI Intent Classification
   - Displays submitted request overview.
   - Triggers AI extraction (POST /api/v1/service-requests/{id}/extract)
   - Renders detected domain (e.g. "Plumbing"), canonical skills ("Pipe Repair", "Leak Fixing"), and confidence score.
       ↓
5. Deterministic Worker Matching
   - Calls GET /api/v1/service-requests/{id}/matches
   - Displays ranked worker cards with proximity, rating, verified badge, and match score out of 100.
```

---

## ⚙️ Configuration & Environment

The app uses `AppConfig` with smart platform defaults and supports compile-time environment flags:

```bash
# Run on Android Emulator (default points to http://10.0.2.2:8000)
flutter run

# Run on Physical Device or custom Backend IP
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:8000
```

---

## 🧪 Testing

Run automated model and API exception tests:

```bash
cd mobile
flutter test
```
