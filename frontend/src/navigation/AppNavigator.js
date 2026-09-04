import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

// Import Feature Screens
import WheelchairRoutingScreen from '../screens/wheelchair/WheelchairRoutingScreen';
import OSMCanvasScreen from '../screens/wheelchair/OSMCanvasScreen';
import VoiceNavigationScreen from '../screens/audio/VoiceNavigationScreen';
import TTSInterfaceScreen from '../screens/audio/TTSInterfaceScreen';
import ThreeTapReportScreen from '../screens/volunteer/ThreeTapReportScreen';
import EXIFCaptureScreen from '../screens/volunteer/EXIFCaptureScreen';
import AdminPortalScaffoldScreen from '../screens/admin/AdminPortalScaffoldScreen';

const STREAMS = [
  { id: 'admin_portal', title: 'Admin Portal', component: AdminPortalScaffoldScreen },
  { id: 'wheelchair_route', title: 'Barrier Routing', component: WheelchairRoutingScreen },
  { id: 'osm_canvas', title: 'OSM Map Canvas', component: OSMCanvasScreen },
  { id: 'voice_nav', title: 'Voice Navigation', component: VoiceNavigationScreen },
  { id: 'tts_interface', title: 'TTS Interfaces', component: TTSInterfaceScreen },
  { id: 'volunteer_report', title: '3-Tap Report', component: ThreeTapReportScreen },
  { id: 'exif_capture', title: 'EXIF Capture', component: EXIFCaptureScreen },
];

const TAB_ICONS = {
  admin_portal: '🏛️',
  wheelchair_route: '♿',
  osm_canvas: '⌖',
  voice_nav: '🎙',
  tts_interface: '🔊',
  volunteer_report: '✚',
  exif_capture: '◉',
};

export const AppNavigator = () => {
  const [activeStream, setActiveStream] = useState('osm_canvas');

  const ActiveComponent = STREAMS.find(s => s.id === activeStream)?.component || WheelchairRoutingScreen;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>UnityMap</Text>
      </View>

      <View style={styles.screenContainer}>
        <ActiveComponent />
      </View>

      <View style={styles.bottomTabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {STREAMS.map(stream => {
            const isActive = activeStream === stream.id;
            return (
              <TouchableOpacity
                key={stream.id}
                style={[styles.tabButton, isActive && styles.activeTabButton]}
                onPress={() => setActiveStream(stream.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>{TAB_ICONS[stream.id]}</Text>
                <Text style={[styles.tabText, isActive && styles.activeTabText]} numberOfLines={1}>
                  {stream.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  bottomTabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    paddingBottom: 8,
    minHeight: 62,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
  },
  tabScroll: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 4,
    minWidth: 64,
    minHeight: 48,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#ECFDF5',
  },
  tabIcon: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 2,
    lineHeight: 20,
  },
  activeTabIcon: {
    color: '#0F3D30',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#0F3D30',
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default AppNavigator;
