# Mobile Module (Flutter Cross-Platform Client)

Flutter cross-platform mobile client for **Project Unknown** providing the end-to-end Customer workflow: authentication, problem description, real GPS & manual location detection, AI requirement extraction, and deterministic PostGIS worker matching.

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
│   │   ├── user_profile.dart     # Customer profile model
│   │   ├── service_request.dart  # Service request data model
│   │   ├── service_extraction.dart # AI requirement classification model
│   │   ├── worker_match.dart     # Ranked worker item & matching response
│   │   └── location_data.dart    # LocationDataModel & coordinate validation
│   ├── services/
│   │   ├── auth_service.dart     # Supabase Auth operations & profile sync
│   │   ├── location_service.dart # Geolocator wrapper, GPS acquisition & settings
│   │   ├── service_request_api.dart # CRUD & AI extraction endpoints
│   │   └── matching_api.dart     # Deterministic worker matching endpoint
│   ├── providers/
│   │   ├── auth_provider.dart    # Session & user auth state management
│   │   ├── location_provider.dart # GPS state, manual fallback & permissions
│   │   ├── request_provider.dart # Request creation & AI classification state
│   │   └── matching_provider.dart # Worker matching results state
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart   # Email/password authentication
│   │   │   └── signup_screen.dart  # New customer registration
│   │   ├── home/
│   │   │   └── home_screen.dart    # Welcome banner & primary problem CTA
│   │   ├── requests/
│   │   │   ├── create_request_screen.dart # Description, Urgency, GPS & manual location
│   │   │   ├── request_detail_screen.dart # Status, GPS coordinates & AI intent
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
│   │   ├── worker_match_test.dart
│   │   └── location_data_test.dart
│   ├── services/
│   │   └── location_service_test.dart
│   ├── providers/
│   │   └── location_provider_test.dart
│   └── core/
│       └── api_exceptions_test.dart
├── pubspec.yaml
├── analysis_options.yaml
└── README.md
```

---

## 📍 Real Location Support (Phase 5B)

### 1. Location Modes Supported
* **Option A: "Use my current location" (GPS Auto)**
  * Checks device location services (GPS enabled).
  * Requests foreground location permission (`ACCESS_FINE_LOCATION`).
  * Fetches high-accuracy GPS coordinates with a 12-second timeout and fallback.
  * Handles permission states: `granted`, `denied`, `deniedForever` (with direct "Open App Settings" action), and `serviceDisabled`.
* **Option B: "Manual Coordinates / Select location manually"**
  * Allows typing exact `Latitude` ($-90 \le \text{lat} \le 90$) and `Longitude` ($-180 \le \text{lon} \le 180$) with strict client-side validation.
  * Includes a 1-tap **"Bengaluru Demo"** preset (`12.9716, 77.5946`) for instant emulator and development testing.

---

## 📱 Complete Customer User Flow

```text
1. Authentication (Login / Sign Up)
   - Uses Supabase Auth to authenticate customer.
   - Automatically attaches JWT Bearer token to all FastAPI backend calls.
       ↓
2. Home Screen
   - Primary CTA: "Describe your problem"
   - Secondary: "My Requests"
       ↓
3. Create Service Request & Real Location
   - Problem description (e.g. "Kitchen PVC pipe is leaking heavily")
   - Urgency selector (Low / Normal / High / Emergency)
   - GPS Auto detection OR Manual Latitude/Longitude validation
       ↓ (POST /api/v1/service-requests)
4. Request Detail & AI Intent Classification
   - Displays submitted request with exact GPS Coordinates (lat, lon).
   - Triggers AI extraction (POST /api/v1/service-requests/{id}/extract)
   - Renders detected domain (e.g. "Plumbing"), canonical skills ("Pipe Repair", "Leak Fixing"), and confidence score.
       ↓
5. Deterministic PostGIS Worker Matching
   - Calls GET /api/v1/service-requests/{id}/matches
   - Displays ranked worker cards with proximity (in km), rating, verified badge, and match score out of 100%.
```

---

## ⚙️ Configuration & Environment

### Android Emulator Setup
1. In Android Studio Emulator Extended Controls ($\dots$), open the **Location** tab.
2. Enter coordinates for Bengaluru:
   * **Latitude**: `12.9500`
   * **Longitude**: `77.6300`
3. Click **"Save Point"** and **"Set Location"**.
4. Tap **"Use My Location"** in the app to acquire this position.

### Physical Device Setup
```bash
# Run on physical device connected to your local WiFi network
flutter run --dart-define=API_BASE_URL=http://<YOUR_LOCAL_IP>:8000
```

---

## 🧪 Testing

Run automated tests:

```bash
cd mobile
flutter test
```
