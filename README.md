# 🗺️ UnityMap

> **Inclusive Public Space Accessibility Mapper**  
> A mobile application designed to map and navigate public urban space accessibility obstacles in real-time, empowering wheelchair users, visually impaired individuals, and community volunteers.

---

## 📱 Mobile Architecture & Folder Hierarchy

Built using **React Native with Expo (Managed Workflow, JavaScript)**.

```text
UnityMap/
├── create-branch.sh        # Jira-aligned GitFlow branch automation script
└── mobile-app/             # Expo Managed Mobile Application
    ├── src/
    │   ├── assets/         # Icons, custom typography, map marker pins
    │   ├── components/     # Reusable UI elements (Button, Input, Card)
    │   ├── navigation/     # AppNavigator orchestrator
    │   ├── screens/        # Feature streams:
    │   │   ├── wheelchair/ # Barrier avoidance routing & OSM canvas
    │   │   ├── audio/      # Voice-guided navigation & TTS interfaces
    │   │   └── volunteer/  # 3-tap reporting & EXIF capture screens
    │   ├── services/       # Axios / Fetch API wrappers to Node.js backend
    │   ├── utils/          # EXIF parsing helpers, GeoJSON, and map math
    │   └── hooks/          # Custom React hooks (GPS location, Speech API)
    ├── App.js              # Root Application Component
    └── package.json        # Dependencies & Expo configuration
```

---

## Feature Streams

| Feature Stream | Core Modules & Screens |
| :--- | :--- |
| Wheelchair Stream | `WheelchairRoutingScreen.js`, `OSMCanvasScreen.js` |
| Audio Stream | `VoiceNavigationScreen.js`, `TTSInterfaceScreen.js` |
| Volunteer Stream | `ThreeTapReportScreen.js`, `EXIFCaptureScreen.js` |
| Architecture & DevOps | Core structure, design components, navigation, services, utils, hooks |

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
cd mobile-app
npm install
npx expo start
```
