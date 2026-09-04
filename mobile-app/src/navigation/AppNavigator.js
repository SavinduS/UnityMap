import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { HIT_SLOP_48 } from '../theme/a11y';

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
  const { colors, isHighContrast, toggleMode, mode } = useTheme();

  const ActiveComponent = STREAMS.find(s => s.id === activeStream)?.component || WheelchairRoutingScreen;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: isHighContrast ? '#000000' : colors.secondaryBg, borderBottomWidth: isHighContrast ? 2 : 0, borderBottomColor: colors.borderDefault }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={[styles.headerTitle, { color: isHighContrast ? '#FFFF00' : '#FFFFFF' }]}>UnityMap Infrastructure</Text>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={[styles.headerSubtitle, { color: isHighContrast ? '#FFFFFF' : '#94A3B8' }]}>Multi-Stream Developer Preview</Text>
          </View>
          <TouchableOpacity
            onPress={toggleMode}
            hitSlop={HIT_SLOP_48}
            accessibilityRole="button"
            accessibilityLabel={`Toggle high contrast, currently ${mode}`}
            accessibilityHint="Switches between light and high contrast theme"
            style={[styles.contrastToggle, { backgroundColor: isHighContrast ? '#FFFF00' : colors.primaryBg, borderColor: colors.borderDefault, borderWidth: isHighContrast ? 2 : 0, minHeight: 48, minWidth: 48 }]}
          >
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={[styles.contrastToggleText, { color: isHighContrast ? '#000000' : '#FFFFFF' }]}>{isHighContrast ? 'HC ON' : 'HC OFF'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: isHighContrast ? '#000000' : '#0F172A', borderBottomWidth: isHighContrast ? 2 : 0, borderBottomColor: '#FFFFFF' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {STREAMS.map(stream => (
            <TouchableOpacity
              key={stream.id}
              accessible
              accessibilityRole="tab"
              accessibilityState={{ selected: activeStream === stream.id }}
              accessibilityLabel={`${stream.title} by ${stream.author}`}
              accessibilityHint={activeStream === stream.id ? 'Currently selected' : 'Double tap to switch stream'}
              hitSlop={HIT_SLOP_48}
              style={[
                styles.tabButton,
                {
                  minHeight: 48,
                  minWidth: 48,
                  borderWidth: isHighContrast ? 2 : 0,
                  borderColor: activeStream === stream.id ? (isHighContrast ? '#FFFF00' : colors.primaryBg) : (isHighContrast ? '#FFFFFF' : 'transparent'),
                  backgroundColor: activeStream === stream.id ? (isHighContrast ? '#FFFF00' : colors.primaryBg) : (isHighContrast ? '#000000' : '#1E293B'),
                },
              ]}
              onPress={() => setActiveStream(stream.id)}
            >
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={[styles.tabText, { color: activeStream === stream.id ? (isHighContrast ? '#000000' : '#FFFFFF') : (isHighContrast ? '#FFFFFF' : '#94A3B8') }]}>
                {stream.title}
              </Text>
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={[styles.authorBadge, { color: activeStream === stream.id ? (isHighContrast ? '#000000' : '#DBEAFE') : (isHighContrast ? '#FFFF00' : '#CBD5E1') }]}>{stream.author}</Text>
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  contrastToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contrastToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabContainer: {
    paddingVertical: 8,
  },
  tabScroll: {
    paddingHorizontal: 12,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  authorBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  screenContainer: {
    flex: 1,
  },
});

export default AppNavigator;
