import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';
import adminAuthService from '../../services/adminAuthService';
import AdminPortalScaffoldScreen from '../admin/AdminPortalScaffoldScreen';

export const SettingsScreen = () => {
  const {
    isHighContrast,
    setHighContrast,
    isScreenReaderEnabled,
    setIsScreenReaderEnabled,
    isReduceMotionEnabled,
    setIsReduceMotionEnabled,
    screenReaderName,
    palette,
    borderWidth,
  } = useTheme();

  const [currentUser, setCurrentUser] = useState(adminAuthService.getCurrentUser());
  const [isPortalModalVisible, setIsPortalModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = adminAuthService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    const performLogout = () => {
      adminAuthService.logout();
      if (Platform.OS === 'web') {
        window.alert('You have logged out of your municipal staff session.');
      } else {
        Alert.alert(
          'Logged Out',
          'You have successfully logged out of your municipal staff session.',
          [{ text: 'OK' }]
        );
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out of your session?')) {
        performLogout();
      }
    } else {
      Alert.alert(
        'Confirm Log Out',
        currentUser
          ? `Are you sure you want to log out of ${currentUser.name || 'municipal account'}?`
          : 'Are you sure you want to log out and clear all cached credentials?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
      <Text {...textProps} style={[styles.title, getTextStyle('xl', { isHighContrast }), { color: palette.textPrimary }]}>
        Settings
      </Text>

      {/* ── Municipal Account & Session Card ── */}
      <Card style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Feather name="shield" size={20} color={palette.primary} style={{ marginRight: 8 }} />
          <Text {...textProps} style={[styles.sectionTitle, getTextStyle('lg', { isHighContrast }), { color: palette.textPrimary, marginBottom: 0 }]}>
            Municipal Staff Account
          </Text>
        </View>
        <Text {...textProps} style={[styles.sectionDesc, getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
          Manage your municipal staff authentication, active ward jurisdiction, and session status.
        </Text>

        {currentUser ? (
          <View
            style={[
              styles.userProfileBox,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderWidth,
              },
            ]}
          >
            <View style={styles.userHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: isHighContrast ? '#000000' : '#E0F2FE' }]}>
                <Feather name="user-check" size={22} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text {...textProps} style={[styles.userName, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
                    {currentUser.name || 'Municipal Officer'}
                  </Text>
                  <View style={styles.activeDot} />
                </View>
                <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                  {currentUser.email || 'cmc.admin@colombo.mc.gov.lk'}
                </Text>
              </View>
            </View>

            <View style={styles.userMetaRow}>
              <View style={[styles.badgePill, { backgroundColor: isHighContrast ? '#000000' : '#ECFDF5', borderColor: palette.border, borderWidth: isHighContrast ? 1 : 0 }]}>
                <Text style={[styles.badgePillText, { color: isHighContrast ? '#FFFFFF' : '#047857' }]}>
                  {currentUser.role ? currentUser.role.replace(/_/g, ' ') : 'CHIEF ENGINEER'}
                </Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: isHighContrast ? '#000000' : '#F3F4F6', borderColor: palette.border, borderWidth: isHighContrast ? 1 : 0 }]}>
                <Text style={[styles.badgePillText, { color: isHighContrast ? '#FFFFFF' : '#374151' }]}>
                  {currentUser.assignedWardId || 'CMC-W01'}
                </Text>
              </View>
              {currentUser.badgeNumber ? (
                <View style={[styles.badgePill, { backgroundColor: isHighContrast ? '#000000' : '#EFF6FF', borderColor: palette.border, borderWidth: isHighContrast ? 1 : 0 }]}>
                  <Text style={[styles.badgePillText, { color: isHighContrast ? '#FFFFFF' : '#1D4ED8' }]}>
                    Badge: {currentUser.badgeNumber}
                  </Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.portalButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  borderWidth,
                },
              ]}
              onPress={() => setIsPortalModalVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open Municipal Admin Portal"
            >
              <Feather name="external-link" size={16} color={palette.primary} style={{ marginRight: 8 }} />
              <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.primary, fontWeight: '700' }]}>
                Open Municipal Admin Portal
              </Text>
            </TouchableOpacity>

            {/* Prominent Log Out Button */}
            <TouchableOpacity
              style={[
                styles.logoutButton,
                {
                  borderColor: isHighContrast ? '#000000' : '#DC2626',
                  borderWidth: isHighContrast ? 2 : 1,
                  backgroundColor: '#DC2626',
                },
              ]}
              onPress={handleLogout}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Log out of municipal session"
              accessibilityHint="Ends active municipal staff session and returns to unauthenticated state"
            >
              <Feather name="log-out" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text {...textProps} style={[styles.logoutButtonText, getTextStyle('base', { isHighContrast })]}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.userProfileBox,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderWidth,
              },
            ]}
          >
            <View style={styles.userHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: isHighContrast ? '#000000' : '#F3F4F6' }]}>
                <Feather name="user-x" size={22} color={palette.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text {...textProps} style={[styles.userName, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
                  Public / Citizen Mode
                </Text>
                <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                  Not signed into municipal administration
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[
                  styles.portalButton,
                  {
                    flex: 1,
                    backgroundColor: palette.primary,
                    borderColor: isHighContrast ? '#000000' : palette.primary,
                    borderWidth: isHighContrast ? borderWidth : 0,
                  },
                ]}
                onPress={() => setIsPortalModalVisible(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Sign In as Municipal Staff"
              >
                <Feather name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: '#FFFFFF', fontWeight: 'bold' }]}>
                  Staff Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.logoutButton,
                  {
                    flex: 1,
                    marginTop: 0,
                    backgroundColor: isHighContrast ? '#000000' : '#FEE2E2',
                    borderColor: isHighContrast ? '#FFFFFF' : '#EF4444',
                    borderWidth: isHighContrast ? borderWidth : 1,
                  },
                ]}
                onPress={handleLogout}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Log Out and Reset Session"
              >
                <Feather name="log-out" size={16} color={isHighContrast ? '#FFFFFF' : '#DC2626'} style={{ marginRight: 6 }} />
                <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: isHighContrast ? '#FFFFFF' : '#DC2626', fontWeight: 'bold' }]}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>

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
      </Card>

      <Card>
        <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textSecondary }]}>
          This setting is stored in-app and persists across restarts. No OS high-contrast sync required. Visual themes and screen readers remain independent.
        </Text>
      </Card>

      {/* ── Municipal Portal Full-Screen Modal ── */}
      <Modal
        visible={isPortalModalVisible}
        animationType="slide"
        onRequestClose={() => setIsPortalModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: palette.surface,
              borderBottomWidth: borderWidth,
              borderBottomColor: palette.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="shield" size={18} color={palette.primary} style={{ marginRight: 8 }} />
              <Text {...textProps} style={[getTextStyle('base', { isHighContrast }), { color: palette.textPrimary, fontWeight: 'bold' }]}>
                Municipal Admin Portal
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsPortalModalVisible(false)}
              style={{
                minHeight: 40,
                minWidth: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                backgroundColor: isHighContrast ? '#000000' : '#F3F4F6',
                borderWidth: isHighContrast ? borderWidth : 0,
                borderColor: palette.border,
              }}
              accessibilityRole="button"
              accessibilityLabel="Close Municipal Admin Portal"
            >
              <Feather name="x" size={20} color={palette.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <AdminPortalScaffoldScreen />
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  title: { marginBottom: 12 },
  card: { marginBottom: 14 },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: { marginBottom: 6 },
  sectionDesc: { marginBottom: 14 },
  userProfileBox: {
    borderRadius: 12,
    padding: 14,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userName: {
    fontWeight: '700',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginLeft: 8,
  },
  userMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  portalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
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
  preview: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
});

export default SettingsScreen;
