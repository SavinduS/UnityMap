# 🗺️ UnityMap

> **Inclusive Public Space Accessibility Mapper**  
> A mobile application designed to map and navigate public urban space accessibility obstacles in real-time, empowering wheelchair users, visually impaired individuals, and community volunteers.

---

## 🏗️ System Architecture & Folder Hierarchy

UnityMap is structured as a full-stack platform consisting of a **React Native Expo mobile frontend** and a **Node.js / Express / MongoDB Atlas backend**.

```text
UnityMap/
├── create-branch.sh        # Jira-aligned GitFlow branch automation script
├── frontend/               # React Native Expo Mobile Client (Managed Workflow)
│   ├── src/
│   │   ├── assets/         # Icons, custom typography, map marker pins
│   │   ├── components/     # Reusable UI elements (Buttons, Cards, Modals)
│   │   ├── navigation/     # AppNavigator orchestrator & tab stream router
│   │   ├── screens/        # Feature stream screen modules:
│   │   │   ├── admin/      # Component 4: Municipal Admin Portal screens
│   │   │   │   ├── AdminPortalScaffoldScreen.js # Municipal Control Hub
│   │   │   │   ├── AdminLoginScreen.js          # Page 1: Login & Ward Jurisdiction
│   │   │   │   ├── TriageQueueScreen.js         # Page 2: Automated Urgency Triage Queue
│   │   │   │   ├── ReportInspectionScreen.js    # Page 3: Evidence & Asset Cross-Check
│   │   │   │   └── WardComplianceScreen.js      # Page 4: Ward Compliance & Analytics
│   │   │   ├── wheelchair/ # Component 1: Wheelchair routing & OSM canvas
│   │   │   ├── audio/      # Component 2: Voice navigation & TTS interfaces
│   │   │   └── volunteer/  # Component 3: 3-tap barrier reporting & EXIF capture
│   │   ├── services/       # Centralized API callers & offline presentation engines:
│   │   │   ├── api.js                   # Centralized API base URL resolver
│   │   │   ├── adminAuthService.js      # JWT session & staff clearance service
│   │   │   ├── triageService.js         # Triage queue & decision dispatch client
│   │   │   └── wardComplianceService.js # Ward compliance & audit export client
│   │   ├── theme/          # High-contrast accessibility design system & typography
│   │   ├── utils/          # Colombo ward jurisdictions, EXIF parser, and map math
│   │   └── hooks/          # Custom hooks (location, speech, screen orientation)
│   ├── App.js              # Application entry point
│   └── package.json        # Frontend dependencies & Expo configuration
│
└── backend/                # Node.js / Express REST API & MongoDB Database
    ├── src/
    │   ├── config/         # MongoDB Atlas connection & database configuration
    │   ├── controllers/    # Route controllers & business logic:
    │   │   ├── adminAuthController.js      # Staff login & JWT authentication
    │   │   ├── triageController.js         # Urgency index triage & decision dispatch
    │   │   ├── wardComplianceController.js # Compliance analytics & audit generator
    │   │   └── ...                         # Routing, obstacle, and elevator controllers
    │   ├── models/         # Mongoose ODM schemas:
    │   │   ├── BarrierReport.js      # Citizen barrier reports & verification logs
    │   │   ├── MunicipalAsset.js     # City accessibility infrastructure registry
    │   │   ├── MunicipalStaff.js     # Official council inspector credentials
    │   │   ├── WardJurisdiction.js   # CMC Ward boundaries, budgets, and scores
    │   │   ├── TriageUrgencyScore.js # Dynamic urgency calculation & decision records
    │   │   └── index.js              # Centralized models export
    │   ├── routes/         # Express API route endpoints:
    │   │   ├── adminAuthRoutes.js    # /api/admin/auth
    │   │   ├── triageRoutes.js       # /api/admin/triage
    │   │   ├── wardComplianceRoutes.js# /api/admin/compliance
    │   │   └── index.js              # Master API router
    │   ├── services/       # Core calculation engines:
    │   │   └── triageEngine.js       # Mathematical Urgency Index formula & sorting
    │   ├── utils/          # Seed data generator & Colombo municipal mock registries
    │   └── server.js       # Express server initialization & middleware
    ├── .env.example        # Environment variable template (PORT, MONGO_URI, JWT_SECRET)
    └── package.json        # Backend dependencies (express, mongoose, jsonwebtoken, etc.)
```

---

## Feature Streams

| Feature Stream | Component / Flow | Core Modules & Screens |
| :--- | :--- | :--- |
| **Municipal Admin Stream** | **Component 4 (Flow 4)** | `AdminPortalScaffoldScreen.js`, `AdminLoginScreen.js`, `TriageQueueScreen.js`, `ReportInspectionScreen.js`, `WardComplianceScreen.js` |
| Wheelchair Stream | Component 1 (Flow 1) | `WheelchairRoutingScreen.js`, `OSMCanvasScreen.js` |
| Audio Stream | Component 2 (Flow 2) | `VoiceNavigationScreen.js`, `TTSInterfaceScreen.js` |
| Volunteer Stream | Component 3 (Flow 3) | `ThreeTapReportScreen.js`, `EXIFCaptureScreen.js` |
| Architecture & DevOps | Infrastructure Foundation | Core navigation orchestrator, theme system, centralized API service |

---

## 🏛️ Component 4: Municipal Admin Portal (Flow 4)

The **Municipal Admin Portal** provides municipal councils (e.g. Colombo Municipal Council — CMC) with a decision-making and infrastructure oversight portal across Sprints 0, 1, and 2.

### 4 Core Admin Portal Screens

1. **Page 1: Secure Portal Login & Ward Jurisdiction (`AdminLoginScreen.js`) [SPT-110]**
   - Municipal staff authentication (JWT issuance).
   - Multi-role clearance (`Chief Municipal Engineer`, `Ward Accessibility Field Inspector`, `Municipal Budget Officer`).
   - Ward jurisdiction selection (Colombo Wards 1 to 6) with quick-fill demo presets.

2. **Page 2: Severity-Sorted Triage Queue Dashboard (`TriageQueueScreen.js`) [SPT-111, SPT-112]**
   - **Automated Urgency Index**: Dynamic calculation combining Severity Weight (40%), Corroboration Tally (35%), and Time-Decay Aging (25%).
   - Vital corridor multiplier boosts (National Hospital Belt $1.25\times$, Fort Railway Hub $1.20\times$).
   - Category filtering chips (`Lift`, `Ramp`, `Tactile Paving`, `Restroom`) and auto-triage sort selector.
   - On-demand urgency recalculation engine.

3. **Page 3: Report Inspection Workspace & Decision Dispatch (`ReportInspectionScreen.js`) [SPT-207, SPT-208]**
   - Full-resolution photo viewer with tap-to-fullscreen modal inspection.
   - EXIF Metadata Audit Inspector (camera device, ISO, shutter, timestamp, GPS accuracy).
   - Side-by-side municipal asset variance analysis comparing reported defect against CMC regulatory standards.
   - Nearest municipal infrastructure asset matching (e.g. `CMC-AST-2081` Pettah Overpass Lift).
   - **Administrative Decision Dispatch Engine**:
     - `Approve & Budget`: Allocates repair funds (LKR) and dispatches prioritized work orders.
     - `Reject Report`: Enforces CMC rejection reason codes (`DUPLICATE_REPORT`, `OUTSIDE_MUNICIPAL_BOUNDARY`, etc.).
     - `Request Info`: Dispatches citizen clarification requests.

4. **Page 4: Ward Compliance & Resolution Analytics Dashboard (`WardComplianceScreen.js`) [SPT-209]**
   - Real-time accessibility compliance percentage and status indicator.
   - Capital budget utilization progress (Allocated vs. Committed LKR).
   - Category-wise compliance progress bars.
   - Active work orders queue table with contractor assignments.
   - Monthly resolution trend charts (May–September).
   - Official municipal compliance audit export (`CMC-AUDIT-CMC-W01-XXXXXX`).

### Backend API Endpoints (Component 4)

```text
POST   /api/admin/auth/login        # Staff authentication & JWT issuance
GET    /api/admin/auth/me           # Current staff profile & role clearance
GET    /api/admin/triage/queue      # Query severity-sorted pending barrier reports
GET    /api/admin/triage/metrics    # Ward triage statistics and urgency distribution
GET    /api/admin/triage/report/:id # Single report inspection with asset cross-reference
POST   /api/admin/triage/recalculate# Trigger queue urgency re-evaluation
POST   /api/admin/triage/dispatch   # Administrative decision dispatch (Approve, Reject, Request Info)
GET    /api/admin/compliance/ward/:id# Ward compliance KPIs and active work orders
GET    /api/admin/compliance/audit/:id# Official municipal audit summary report
```

---

## 🌿 GitFlow Branching Strategy

The repository follows a 4-branch GitFlow workflow:
- **`main`**: Production release branch.
- **`develop`**: Primary integration branch for team feature merging.
- **`feature/SPT-<ID>-<description>`**: Feature development branches created off `develop`.
- **`bugfix/SPT-<ID>-<description>`**: Bug fix branches created off `develop`.

### Auto-Branch Generator (`create-branch.sh`)

To create and checkout a standardized branch:
```bash
./create-branch.sh feature <ticket_number> <short-description>
# Example: ./create-branch.sh feature 001 mobile-app-infrastructure
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo Go app on iOS/Android (or iOS Simulator / Android Emulator)

### Run Mobile App Locally
```bash
cd frontend
npm install
npx expo start
```
