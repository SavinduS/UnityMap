import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Platform, TouchableOpacity } from 'react-native';
import Card from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';
import { getAvailableLocales } from '../../utils/locale';

export const SettingsScreen = () => {
  const {
    isHighContrast,
    setHighContrast,
    isScreenReaderEnabled,
    setIsScreenReaderEnabled,
    isReduceMotionEnabled,
    setIsReduceMotionEnabled,
    isAudioLauncherEnabled,
    setAudioLauncherEnabled,
    preferredSTTLocale,
    setPreferredSTTLocale,
    screenReaderName,
    palette,
    borderWidth,
  } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
      <Text {...textProps} style={[styles.title, getTextStyle('xl', { isHighContrast }), { color: palette.textPrimary }]}>
        Settings
      </Text>

      <Card style={styles.card}>
        <Text {...textProps} style={[styles.sectionTitle, getTextStyle('lg', { isHighContrast }), { color: palette.textPrimary }]}>
          Accessibility
        </Text>
        <Text {...textProps} style={[styles.sectionDesc, getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
          High-contrast mode increases contrast and border weight for low-vision users.
        </Text>

        <View
          style={[
            styles.row,
            {
              borderColor: palette.border,
              borderWidth,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <View style={styles.rowText}>
            <Text {...textProps} style={[styles.rowLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              High Contrast Mode
            </Text>
            <Text {...textProps} style={[styles.rowHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
              {isHighContrast ? 'On — 7:1 contrast, 2px borders' : 'Off — standard theme'}
            </Text>
          </View>
          <Switch
            value={isHighContrast}
            onValueChange={setHighContrast}
            trackColor={{ false: '#E5E7EB', true: palette.primary }}
            thumbColor="#FFFFFF"
            accessibilityRole="switch"
            accessibilityLabel="High Contrast Mode"
            accessibilityState={{ checked: isHighContrast }}
            style={styles.switch}
          />
        </View>

        <View
          style={[
            styles.preview,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
              borderWidth,
            },
          ]}
        >
          <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
            Preview: buttons and inputs now use {isHighContrast ? 'high-contrast' : 'standard'} colors and 48dp targets.
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text {...textProps} style={[styles.sectionTitle, getTextStyle('lg', { isHighContrast }), { color: palette.textPrimary }]}>
          Screen Reader
        </Text>
        <Text {...textProps} style={[styles.sectionDesc, getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
          Detected via AccessibilityInfo on launch. Uses Platform.select for TalkBack / VoiceOver.
        </Text>

        <View
          style={[
            styles.row,
            { borderColor: palette.border, borderWidth, backgroundColor: palette.surface },
          ]}
        >
          <View style={styles.rowText}>
            <Text {...textProps} style={[styles.rowLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              {screenReaderName}
            </Text>
            <Text {...textProps} style={[styles.rowHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
              {isScreenReaderEnabled ? 'Enabled — announceForAccessibility active' : 'Off — standard speech'}
            </Text>
            <Text {...textProps} style={[styles.rowHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted, fontStyle: 'italic', marginTop: 2 }]}>
              {Platform.OS === 'android' ? 'TalkBack (Android)' : Platform.OS === 'ios' ? 'VoiceOver (iOS)' : 'Screen reader'} via AccessibilityInfo + Platform.select
            </Text>
          </View>
          <Switch
            value={isScreenReaderEnabled}
            onValueChange={setIsScreenReaderEnabled}
            trackColor={{ false: '#E5E7EB', true: palette.primary }}
            thumbColor="#FFFFFF"
            accessibilityRole="switch"
            accessibilityLabel={`${screenReaderName} toggle`}
            accessibilityState={{ checked: isScreenReaderEnabled }}
            style={styles.switch}
          />
        </View>

        <View
          style={[
            styles.row,
            { borderColor: palette.border, borderWidth, backgroundColor: palette.surface, marginTop: 12 },
          ]}
        >
          <View style={styles.rowText}>
            <Text {...textProps} style={[styles.rowLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              Reduce Motion
            </Text>
            <Text {...textProps} style={[styles.rowHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
              {isReduceMotionEnabled ? 'On — animations disabled in BaseMap' : 'Off — animations enabled'}
            </Text>
          </View>
          <Switch
            value={isReduceMotionEnabled}
            onValueChange={setIsReduceMotionEnabled}
            trackColor={{ false: '#E5E7EB', true: palette.primary }}
            thumbColor="#FFFFFF"
            accessibilityRole="switch"
            accessibilityLabel="Reduce Motion"
            accessibilityState={{ checked: isReduceMotionEnabled }}
            style={styles.switch}
          />
        </View>

        <View
          style={[
            styles.row,
            { borderColor: palette.border, borderWidth, backgroundColor: palette.surface, marginTop: 12 },
          ]}
        >
          <View style={styles.rowText}>
            <Text {...textProps} style={[styles.rowLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              Audio-First Launcher
            </Text>
            <Text {...textProps} style={[styles.rowHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
              {isAudioLauncherEnabled ? 'On — shows as initial modal over map' : 'Off — map shows directly'}
            </Text>
          </View>
          <Switch
            value={isAudioLauncherEnabled}
            onValueChange={setAudioLauncherEnabled}
            trackColor={{ false: '#E5E7EB', true: palette.primary }}
            thumbColor="#FFFFFF"
            accessibilityRole="switch"
            accessibilityLabel="Audio-First Launcher"
            accessibilityState={{ checked: isAudioLauncherEnabled }}
            style={styles.switch}
          />
        </View>

        <View
          style={[
            styles.localeRow,
            { borderColor: palette.border, borderWidth, backgroundColor: palette.surface, marginTop: 12 },
          ]}
        >
          <View style={styles.rowText}>
            <Text {...textProps} style={[styles.rowLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              Speech Language
            </Text>
            <Text {...textProps} style={[styles.rowHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
              High accuracy — confidence ≥0.6, 3 alternatives
            </Text>
          </View>
          <View style={styles.localeChips}>
            {getAvailableLocales().map((loc) => {
              const isActive = preferredSTTLocale === loc.code;
              return (
                <TouchableOpacity
                  key={loc.code}
                  onPress={() => setPreferredSTTLocale(loc.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Set language ${loc.label}`}
                  style={[
                    styles.localeChip,
                    {
                      backgroundColor: isActive ? palette.primary : palette.surfaceAlt,
                      borderColor: palette.border,
                      borderWidth: isActive ? 0 : 1,
                    },
                  ]}
                >
                  <Text
                    {...textProps}
                    style={[getTextStyle('xs', { isHighContrast }), { color: isActive ? palette.primaryText : palette.textPrimary, fontWeight: isActive ? '700' : '500' }]}
                  >
                    {loc.label}
                  </Text>
                  <Text style={[getTextStyle('xs', { isHighContrast }), { color: isActive ? palette.primaryText : palette.textMuted, fontSize: 10 }]}>
                    {loc.bcp47}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Card>

      <Card>
        <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textSecondary }]}>
          This setting is stored in-app and persists across restarts. No OS high-contrast sync required. Visual themes and screen readers remain independent.
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  title: { marginBottom: 12 },
  card: {},
  sectionTitle: { marginBottom: 6 },
  sectionDesc: { marginBottom: 16 },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: {},
  rowHint: { marginTop: 2 },
  switch: { transform: [{ scaleX: 1.05 }, { scaleY: 1.05 }] },
  localeRow: {
    minHeight: 48,
    flexDirection: 'column',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  localeChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  localeChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  preview: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
});

export default SettingsScreen;
