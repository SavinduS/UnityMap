# 📱 UnityMap Mobile Application (`mobile-app`)

Inclusive Public Space Accessibility Mapper mobile application built using **React Native with Expo (Managed Workflow)**.

---

## 📁 Architecture & Folder Hierarchy

```text
mobile-app/
├── src/
│   ├── assets/        # Icons, custom typography, map marker pins
│   ├── components/    # Reusable UI elements (Button, Input, Card)
│   ├── navigation/    # AppNavigator orchestrator
│   ├── screens/       # Divided by developer feature streams:
│   │   ├── wheelchair/# Wishwa: Barrier avoidance routing & OSM canvas
│   │   ├── audio/     # Wathsika: Voice-guided navigation & TTS interfaces
│   │   └── volunteer/ # Dulmi: 3-tap reporting & EXIF capture screens
│   ├── services/      # Axios / Fetch API wrappers to Node.js backend
│   ├── utils/         # EXIF parsing helpers, GeoJSON, and map math
│   └── hooks/         # Custom React hooks (GPS location, Speech API)
├── App.js             # Root Application Component
└── package.json       # Project dependencies & Expo config
```

---

## 👥 Multi-Developer Team Assignments

| Developer | Stream | Core Modules & Screens |
| :--- | :--- | :--- |
| **Wishwa** | Wheelchair Stream | `WheelchairRoutingScreen.js`, `OSMCanvasScreen.js` |
| **Wathsika** | Audio Stream | `VoiceNavigationScreen.js`, `TTSInterfaceScreen.js` |
| **Dulmi** | Volunteer Stream | `ThreeTapReportScreen.js`, `EXIFCaptureScreen.js` |
| **Savindu** | Architecture & DevOps | Core structure, navigation, services, utils, hooks |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo Go app installed on mobile device (or iOS Simulator / Android Emulator)

### Run Locally
```bash
npm install
npx expo start
```
