#!/usr/bin/env bash
# ==============================================================================
# UnityMap Mobile Infrastructure Setup Script
# Description: Initializes Expo mobile app and constructs multi-developer 
#              folder architecture for UnityMap project.
# Team Streams:
#   - Wishwa: Wheelchair barrier avoidance routing & OSM canvas
#   - Wathsika: Audio voice-guided navigation & TTS interfaces
#   - Dulmi: Volunteer 3-tap reporting & EXIF capture screens
#   - Savindu: Core architecture, navigation, components, services, utils, hooks
# ==============================================================================

set -e

echo "🚀 Starting UnityMap Expo Mobile Infrastructure Setup..."

# 1. Initialize Expo App if directory doesn't exist
if [ ! -d "mobile-app" ]; then
  echo "📱 Initializing Expo Managed Workflow App in mobile-app/..."
  npx -y create-expo-app@latest mobile-app --template blank --yes
else
  echo "ℹ️  mobile-app directory already exists. Setting up folder architecture..."
fi

cd mobile-app

# 2. Create Core Directory Architecture
echo "📂 Creating directory architecture inside mobile-app/src/..."

mkdir -p src/assets
mkdir -p src/components
mkdir -p src/navigation
mkdir -p src/screens/wheelchair
mkdir -p src/screens/audio
mkdir -p src/screens/volunteer
mkdir -p src/services
mkdir -p src/utils
mkdir -p src/hooks

# 3. Create Asset README & Placeholders
cat << 'EOF' > src/assets/README.md
# UnityMap Assets Directory

This folder contains static assets for the UnityMap mobile application:
- Custom icons for accessibility barriers (steep ramps, broken pavement, elevator out of order)
- Custom typography & fonts
- Static map marker graphics & pins
EOF

# 4. Create Reusable UI Components (src/components/)
echo "🎨 Creating reusable UI components..."

cat << 'EOF' > src/components/Button.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * Primary action button component for UnityMap design system.
 */
export const Button = ({ title, onPress, variant = 'primary', style, textStyle }) => {
  const isSecondary = variant === 'secondary';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        isSecondary ? styles.secondaryButton : styles.primaryButton,
        style,
      ]}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, isSecondary ? styles.secondaryText : styles.primaryText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#1F2937',
  },
});

export default Button;
EOF

cat << 'EOF' > src/components/Input.js
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

/**
 * Standard text input field with accessibility support.
 */
export const Input = ({ label, value, onChangeText, placeholder, secureTextEntry, error }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        accessibilityLabel={label || placeholder}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;
EOF

cat << 'EOF' > src/components/Card.js
import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Card container component for structured UI items.
 */
export const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
});

export default Card;
EOF

# 5. Create Navigation (src/navigation/)
echo "🧭 Creating navigation infrastructure..."

cat << 'EOF' > src/navigation/AppNavigator.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

// Import Feature Screens
import WheelchairRoutingScreen from '../screens/wheelchair/WheelchairRoutingScreen';
import OSMCanvasScreen from '../screens/wheelchair/OSMCanvasScreen';
import VoiceNavigationScreen from '../screens/audio/VoiceNavigationScreen';
import TTSInterfaceScreen from '../screens/audio/TTSInterfaceScreen';
import ThreeTapReportScreen from '../screens/volunteer/ThreeTapReportScreen';
import EXIFCaptureScreen from '../screens/volunteer/EXIFCaptureScreen';

const STREAMS = [
  { id: 'wheelchair_route', title: 'Barrier Routing', author: 'Wishwa', component: WheelchairRoutingScreen },
  { id: 'osm_canvas', title: 'OSM Map Canvas', author: 'Wishwa', component: OSMCanvasScreen },
  { id: 'voice_nav', title: 'Voice Navigation', author: 'Wathsika', component: VoiceNavigationScreen },
  { id: 'tts_interface', title: 'TTS Interfaces', author: 'Wathsika', component: TTSInterfaceScreen },
  { id: 'volunteer_report', title: '3-Tap Report', author: 'Dulmi', component: ThreeTapReportScreen },
  { id: 'exif_capture', title: 'EXIF Capture', author: 'Dulmi', component: EXIFCaptureScreen },
];

export const AppNavigator = () => {
  const [activeStream, setActiveStream] = useState('wheelchair_route');

  const ActiveComponent = STREAMS.find(s => s.id === activeStream)?.component || WheelchairRoutingScreen;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>UnityMap Infrastructure</Text>
        <Text style={styles.headerSubtitle}>Multi-Stream Developer Preview</Text>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {STREAMS.map(stream => (
            <TouchableOpacity
              key={stream.id}
              style={[styles.tabButton, activeStream === stream.id && styles.activeTabButton]}
              onPress={() => setActiveStream(stream.id)}
            >
              <Text style={[styles.tabText, activeStream === stream.id && styles.activeTabText]}>
                {stream.title}
              </Text>
              <Text style={styles.authorBadge}>{stream.author}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.screenContainer}>
        <ActiveComponent />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabContainer: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
  },
  tabScroll: {
    paddingHorizontal: 12,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  authorBadge: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 2,
  },
  screenContainer: {
    flex: 1,
  },
});

export default AppNavigator;
EOF

# 6. Create Screens for Wishwa Stream (src/screens/wheelchair/)
echo "♿ Creating screens for Wishwa Stream (wheelchair/)..."

cat << 'EOF' > src/screens/wheelchair/WheelchairRoutingScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Wishwa Stream: Barrier Avoidance Routing Screen
 */
export const WheelchairRoutingScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.badge}>Developer: Wishwa</Text>
        <Text style={styles.title}>♿ Barrier Avoidance Routing</Text>
        <Text style={styles.description}>
          Calculates accessible navigation paths for wheelchair users by actively avoiding steep inclines, stairs, high curbs, and sidewalk obstructions.
        </Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>• Route Profile: Power Wheelchair / Manual Wheelchair</Text>
          <Text style={styles.infoText}>• Avoidances: Staircases, Unpaved Trails, High Steps</Text>
          <Text style={styles.infoText}>• Max Incline Threshold: 8.3% (ADA Compliant)</Text>
        </View>
        <Button title="Calculate Accessible Route" onPress={() => {}} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  card: { borderColor: '#DBEAFE', borderWidth: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  infoBox: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginBottom: 16 },
  infoText: { fontSize: 13, color: '#1E40AF', marginBottom: 4 },
});

export default WheelchairRoutingScreen;
EOF

cat << 'EOF' > src/screens/wheelchair/OSMCanvasScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../components/Card';

/**
 * Wishwa Stream: OSM Map Canvas Screen
 */
export const OSMCanvasScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.badge}>Developer: Wishwa</Text>
        <Text style={styles.title}>🗺️ OpenStreetMap Canvas</Text>
        <Text style={styles.description}>
          Interactive vector map rendering layer visualizing sidewalk smoothness, curb ramps, tactile paving, and barrier overlays in real-time.
        </Text>
        <View style={styles.canvasPlaceholder}>
          <Text style={styles.canvasText}>[ OSM Canvas Layer Placeholder ]</Text>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  card: { borderColor: '#DBEAFE', borderWidth: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  canvasPlaceholder: { height: 220, backgroundColor: '#E2E8F0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed' },
  canvasText: { color: '#64748B', fontWeight: '600' },
});

export default OSMCanvasScreen;
EOF

# 7. Create Screens for Wathsika Stream (src/screens/audio/)
echo "🔊 Creating screens for Wathsika Stream (audio/)..."

cat << 'EOF' > src/screens/audio/VoiceNavigationScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Wathsika Stream: Voice-Guided Navigation Screen
 */
export const VoiceNavigationScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.badge}>Developer: Wathsika</Text>
        <Text style={styles.title}>🎙️ Voice-Guided Navigation</Text>
        <Text style={styles.description}>
          Hands-free turn-by-turn navigation tailored for visually impaired users with step counts, landmark cues, and spatial audio feedback.
        </Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>• Voice Command State: Listening...</Text>
          <Text style={styles.infoText}>• Speech Rate: 1.0x (Adjustable)</Text>
          <Text style={styles.infoText}>• Haptic Vibrations: Enabled on Turns</Text>
        </View>
        <Button title="Start Voice Navigation" onPress={() => {}} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  card: { borderColor: '#FBCFE8', borderWidth: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: '#DB2777', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  infoBox: { backgroundColor: '#FDF2F8', padding: 12, borderRadius: 8, marginBottom: 16 },
  infoText: { fontSize: 13, color: '#BE185D', marginBottom: 4 },
});

export default VoiceNavigationScreen;
EOF

cat << 'EOF' > src/screens/audio/TTSInterfaceScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Wathsika Stream: Text-to-Speech Interface Screen
 */
export const TTSInterfaceScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.badge}>Developer: Wathsika</Text>
        <Text style={styles.title}>🔊 TTS & Audio Feedback</Text>
        <Text style={styles.description}>
          Customizable text-to-speech settings, audio ducking, pitch adjustment, and screen-reader accessibility shortcuts.
        </Text>
        <Button title="Test Voice Output" variant="secondary" onPress={() => {}} />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  card: { borderColor: '#FBCFE8', borderWidth: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: '#DB2777', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
});

export default TTSInterfaceScreen;
EOF

# 8. Create Screens for Dulmi Stream (src/screens/volunteer/)
echo "📸 Creating screens for Dulmi Stream (volunteer/)..."

cat << 'EOF' > src/screens/volunteer/ThreeTapReportScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Dulmi Stream: 3-Tap Rapid Barrier Reporting Screen
 */
export const ThreeTapReportScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.badge}>Developer: Dulmi</Text>
        <Text style={styles.title}>⚡ 3-Tap Rapid Reporting</Text>
        <Text style={styles.description}>
          Streamlined 3-click barrier reporting interface enabling crowd-sourced volunteers to tag urban accessibility obstacles in under 5 seconds.
        </Text>
        <View style={styles.grid}>
          <Button style={styles.gridBtn} title="1. Select Barrier" onPress={() => {}} />
          <Button style={styles.gridBtn} title="2. Snap Photo" onPress={() => {}} />
          <Button style={styles.gridBtn} title="3. Submit Report" onPress={() => {}} />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  card: { borderColor: '#BBF7D0', borderWidth: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  grid: { marginTop: 8 },
  gridBtn: { marginVertical: 4, backgroundColor: '#16A34A' },
});

export default ThreeTapReportScreen;
EOF

cat << 'EOF' > src/screens/volunteer/EXIFCaptureScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Dulmi Stream: EXIF Capture & Geotagging Screen
 */
export const EXIFCaptureScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.badge}>Developer: Dulmi</Text>
        <Text style={styles.title}>📷 EXIF Metadata Capture</Text>
        <Text style={styles.description}>
          Extracts embedded GPS coordinates, camera orientation, and timestamp from photo EXIF metadata for verification.
        </Text>
        <Button title="Capture Geotagged Image" onPress={() => {}} />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  card: { borderColor: '#BBF7D0', borderWidth: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
});

export default EXIFCaptureScreen;
EOF

# 9. Create Services (src/services/)
echo "🌐 Creating services..."

cat << 'EOF' > src/services/api.js
/**
 * UnityMap Centralized API Service
 * Handles Axios/Fetch wrappers for connecting mobile app to Node.js backend.
 */

const BASE_URL = 'https://api.unitymap.org/v1'; // Update with Node.js backend URL

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    });

    if (!response.ok) {
      throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
};

export default apiRequest;
EOF

cat << 'EOF' > src/services/accessibilityService.js
import { apiRequest } from './api';

/**
 * Backend API service wrappers for accessibility barrier data & routing.
 */
export const accessibilityService = {
  getAccessibleRoute: async (origin, destination, profile = 'wheelchair') => {
    return apiRequest('/routing/accessible', {
      method: 'POST',
      body: JSON.stringify({ origin, destination, profile }),
    });
  },

  submitBarrierReport: async (reportData) => {
    return apiRequest('/barriers/report', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },

  getNearbyBarriers: async (latitude, longitude, radiusMeters = 500) => {
    return apiRequest(`/barriers/nearby?lat=${latitude}&lng=${longitude}&radius=${radiusMeters}`);
  },
};

export default accessibilityService;
EOF

# 10. Create Utilities (src/utils/)
echo "🛠️ Creating utilities..."

cat << 'EOF' > src/utils/exifHelper.js
/**
 * Utility functions for parsing image EXIF data and extracting GPS metadata.
 */

export const parseExifData = (imageUri) => {
  // Placeholder parser for geotagged photo EXIF data
  return {
    latitude: 6.9271,
    longitude: 79.8612,
    timestamp: new Date().toISOString(),
    altitude: 12.5,
  };
};

export default { parseExifData };
EOF

cat << 'EOF' > src/utils/geoJsonUtils.js
/**
 * Utilities for formatting and converting accessibility features into GeoJSON.
 */

export const createBarrierFeature = (id, type, latitude, longitude, properties = {}) => {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    properties: {
      barrierType: type,
      reportedAt: new Date().toISOString(),
      ...properties,
    },
  };
};

export default { createBarrierFeature };
EOF

cat << 'EOF' > src/utils/mapMath.js
/**
 * Geographic mathematical utilities (Haversine formula, distance calculations).
 */

export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Distance in meters
};

export default { calculateHaversineDistance };
EOF

# 11. Create Hooks (src/hooks/)
echo "⚓ Creating custom React hooks..."

cat << 'EOF' > src/hooks/useLocation.js
import { useState, useEffect } from 'react';

/**
 * Custom hook for managing GPS location and coordinates.
 */
export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated location provider
    const timer = setTimeout(() => {
      setLocation({
        latitude: 6.9271,
        longitude: 79.8612,
        accuracy: 5.0,
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return { location, errorMsg, loading };
};

export default useLocation;
EOF

cat << 'EOF' > src/hooks/useSpeech.js
import { useState } from 'react';

/**
 * Custom hook for TTS and Speech API interactions.
 */
export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text) => {
    setIsSpeaking(true);
    console.log(`[TTS Speaking]: ${text}`);
    // Future integration with Expo Speech API
    setTimeout(() => setIsSpeaking(false), 2000);
  };

  const stop = () => {
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
};

export default useSpeech;
EOF

# 12. Replace App.js with AppNavigator import
echo "⚡ Updating mobile-app/App.js..."

cat << 'EOF' > App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
EOF

# 13. Create mobile-app README.md
echo "📝 Creating mobile-app/README.md documentation..."

cat << 'EOF' > README.md
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
EOF

cd ..

echo "✅ UnityMap Mobile Infrastructure setup successfully completed!"
