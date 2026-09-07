import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';

const LAUNCHER_PHRASE = 'Tap anywhere and speak your destination';

/**
 * Audio-First Launcher Screen (SPT-104 — Page 1)
 * Full-screen touch launcher with TalkBack auto-detection, landmark tags.
 * Used as initial modal over UnityMapScreen when screen reader is active.
 */
export const AudioFirstLauncherScreen = ({ onNavigate }) => {
  const { palette, borderWidth, isHighContrast, isScreenReaderEnabled, screenReaderName } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: palette.background }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Landmark Header */}
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel="Audio launcher"
        style={[styles.landmarkHeader, { borderBottomColor: palette.cardBorder, borderBottomWidth: borderWidth }]}
      >
        <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
          {isScreenReaderEnabled ? `${screenReaderName} detected` : 'Audio-first launcher'}
        </Text>
      </View>

      {/* Status live region */}
      <View accessible accessibilityLiveRegion="polite" style={styles.liveRegion}>
        <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
          {isScreenReaderEnabled ? `${screenReaderName} enabled — auto prompt active` : 'Tap to speak destination'}
        </Text>
      </View>

      {/* Full-screen touch target */}
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={LAUNCHER_PHRASE}
        accessibilityHint={Platform.select({ android: 'Double tap to speak destination', ios: 'Double tap to speak destination', default: 'Activate to speak' })}
        accessibilityState={{ disabled: false }}
        onPress={() => {
          if (onNavigate) onNavigate();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.touchTarget,
          {
            backgroundColor: palette.surface,
            borderColor: palette.cardBorder,
            borderWidth,
          },
          pressed && { opacity: 0.85 },
          isHighContrast && { shadowOpacity: 0, elevation: 0 },
        ]}
      >
        <View
          style={[
            styles.innerCard,
            { backgroundColor: palette.primary, borderColor: palette.cardBorder, borderWidth: isHighContrast ? borderWidth : 0 },
          ]}
          importantForAccessibility="no-hide-descendants"
        >
          <Text {...textProps} style={[styles.phrase, getTextStyle('xl', { isHighContrast }), { color: palette.primaryText }]}>
            {LAUNCHER_PHRASE}
          </Text>
          <Text {...textProps} style={[styles.hint, getTextStyle('sm', { isHighContrast }), { color: palette.primaryText, opacity: 0.9 }]}>
            {Platform.select({ android: 'TalkBack', ios: 'VoiceOver', default: 'Screen reader' })} ready
          </Text>
        </View>

        <Text {...textProps} style={[styles.subHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
          Full-screen — minimum 48dp touch target
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  landmarkHeader: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  liveRegion: {
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 20,
  },
  touchTarget: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 48,
    minWidth: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  innerCard: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 160,
  },
  phrase: {
    textAlign: 'center',
    fontWeight: '700',
  },
  hint: {
    textAlign: 'center',
    marginTop: 8,
  },
  subHint: {
    textAlign: 'center',
    marginTop: 16,
  },
});

export default AudioFirstLauncherScreen;
