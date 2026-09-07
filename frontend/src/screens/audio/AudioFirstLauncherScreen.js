import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';
import { useSpeech } from '../../hooks/useSpeech';

const LAUNCHER_PHRASE = 'Tap anywhere and speak your destination';

/**
 * Audio-First Launcher Screen (SPT-104 — Page 1)
 * Full-screen touch launcher with TalkBack auto-detection, landmark tags.
 * Used as initial modal over UnityMapScreen when screen reader is active.
 */
export const AudioFirstLauncherScreen = ({ onNavigate }) => {
  const { palette, borderWidth, isHighContrast, isScreenReaderEnabled, isReduceMotionEnabled, screenReaderName, announce } = useTheme();
  const { speak } = useSpeech();
  const hasAnnouncedRef = useRef(false);

  // Auto-detect TalkBack/VoiceOver on launch and auto-prompt exact phrase
  useEffect(() => {
    if (!isScreenReaderEnabled) {
      hasAnnouncedRef.current = false;
      return;
    }
    if (hasAnnouncedRef.current) return;
    // Delay to let TalkBack/VoiceOver queue settle (common 800ms)
    const timer = setTimeout(() => {
      hasAnnouncedRef.current = true;
      try {
        // useSpeech bridges to announceForAccessibility when screen reader active
        speak(LAUNCHER_PHRASE);
      } catch (_) {
        try {
          announce(LAUNCHER_PHRASE);
        } catch (_) {}
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isScreenReaderEnabled, speak, announce]);

  // Also respect reduceMotion — if needed disable any pulse animation (handled via palette)
  const reduceMotionStyle = isReduceMotionEnabled ? { shadowOpacity: 0, elevation: 0 } : null;

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

      {/* Full-screen touch target — 48dp+ */}
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={LAUNCHER_PHRASE}
        accessibilityHint={Platform.select({ android: 'Double tap to speak destination', ios: 'Double tap to speak destination', default: 'Activate to speak' })}
        accessibilityState={{ disabled: false }}
        accessibilityLiveRegion="polite"
        accessibilityViewIsModal
        importantForAccessibility="yes"
        onPress={() => {
          try {
            speak(LAUNCHER_PHRASE);
          } catch (_) {}
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
          reduceMotionStyle,
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
