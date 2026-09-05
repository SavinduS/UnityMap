import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import Card from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';

export const SettingsScreen = () => {
  const { isHighContrast, setHighContrast, isScreenReaderEnabled, isReduceMotionEnabled, screenReaderName, palette, borderWidth } = useTheme();

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
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${screenReaderName} ${isScreenReaderEnabled ? 'enabled' : 'off'}`}
        >
          <View style={styles.rowText}>
            <Text {...textProps} style={[styles.rowLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              {screenReaderName}
            </Text>
            <Text {...textProps} style={[styles.rowHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
              {isScreenReaderEnabled ? 'Enabled — announceForAccessibility active' : 'Off — standard speech'}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: isScreenReaderEnabled ? palette.primary : palette.surfaceAlt, borderColor: palette.border, borderWidth: isScreenReaderEnabled ? borderWidth : 1 },
            ]}
          >
            <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: isScreenReaderEnabled ? palette.primaryText : palette.textMuted, fontWeight: '700' }]}>
              {isScreenReaderEnabled ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.row,
            { borderColor: palette.border, borderWidth, backgroundColor: palette.surface, marginTop: 12 },
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Reduce Motion ${isReduceMotionEnabled ? 'enabled' : 'off'}`}
        >
          <View style={styles.rowText}>
            <Text {...textProps} style={[styles.rowLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              Reduce Motion
            </Text>
            <Text {...textProps} style={[styles.rowHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
              {isReduceMotionEnabled ? 'On — animations disabled in BaseMap' : 'Off — animations enabled'}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: isReduceMotionEnabled ? palette.primary : palette.surfaceAlt, borderColor: palette.border, borderWidth: isReduceMotionEnabled ? borderWidth : 1 },
            ]}
          >
            <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: isReduceMotionEnabled ? palette.primaryText : palette.textMuted, fontWeight: '700' }]}>
              {isReduceMotionEnabled ? 'ON' : 'OFF'}
            </Text>
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
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 48,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
