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
  { id: 'wheelchair_route', title: 'Barrier Routing', component: WheelchairRoutingScreen },
  { id: 'osm_canvas', title: 'OSM Map Canvas', component: OSMCanvasScreen },
  { id: 'voice_nav', title: 'Voice Navigation', component: VoiceNavigationScreen },
  { id: 'tts_interface', title: 'TTS Interfaces', component: TTSInterfaceScreen },
  { id: 'volunteer_report', title: '3-Tap Report', component: ThreeTapReportScreen },
  { id: 'exif_capture', title: 'EXIF Capture', component: EXIFCaptureScreen },
];

export const AppNavigator = () => {
  const [activeStream, setActiveStream] = useState('osm_canvas');

  const ActiveComponent = STREAMS.find(s => s.id === activeStream)?.component || WheelchairRoutingScreen;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>UnityMap</Text>
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
  screenContainer: {
    flex: 1,
  },
});

export default AppNavigator;
