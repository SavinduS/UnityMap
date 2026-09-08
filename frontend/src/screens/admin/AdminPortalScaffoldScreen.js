/**
 * AdminPortalScaffoldScreen.js
 * Municipal Admin Mobile Dashboard & Operational Operations Hub
 * 
 * Features:
 * - Mobile-first design aligned with UnityMap emerald brand theme (#0B3D2E)
 * - Top-left Hamburger Menu triggering the Side Navigation Drawer
 * - Logical Operational Workflows (Triage, Inspection, Compliance)
 * - Prominent User Role Management Console
 * - Ward Jurisdiction selector and live infrastructure KPI summary
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import authService from '../../services/authService';
import adminAuthService from '../../services/adminAuthService';
import { MUNICIPAL_WARDS, getWardById } from '../../utils/wardJurisdictions';
import TriageQueueScreen from './TriageQueueScreen';
import ReportInspectionScreen from './ReportInspectionScreen';
import WardComplianceScreen from './WardComplianceScreen';
import UserManagementSection from '../../components/admin/UserManagementSection';
import AdminDrawer from '../../components/admin/AdminDrawer';

export const AdminPortalScaffoldScreen = () => {
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [selectedWardId, setSelectedWardId] = useState(
    currentUser?.assignedWardId || 'CMC-W01'
  );
  const [currentView, setCurrentView] = useState('hub'); // 'hub' | 'triage' | 'inspection' | 'compliance' | 'users'
  const [selectedReportForInspection, setSelectedReportForInspection] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
      if (user?.assignedWardId) setSelectedWardId(user.assignedWardId);
    });
    return unsubscribe;
  }, []);

  const activeWard = getWardById(selectedWardId);
  const isSuper = !!currentUser?.isSuperAdmin || currentUser?.email === 'admin@unitymap.com';

  const handleWardChange = (wardId) => {
    setSelectedWardId(wardId);
    adminAuthService.switchWard(wardId);
  };

  // If unauthenticated, RootNavigator handles redirect to LoginScreen
  if (!currentUser) {
    return null;
  }

  // 1. Evidence Inspection Screen
  if (currentView === 'inspection') {
    return (
      <ReportInspectionScreen
        reportId={selectedReportForInspection?._id || 'RPT-CMC-1001'}
        initialReport={selectedReportForInspection}
        onBack={() => setCurrentView('triage')}
        onDecisionComplete={() => {
          setSelectedReportForInspection(null);
          setCurrentView('triage');
        }}
      />
    );
  }

  // 2. Triage Queue Screen
  if (currentView === 'triage') {
    return (
      <TriageQueueScreen
        selectedWardId={selectedWardId}
        onWardChange={handleWardChange}
        onBack={() => setCurrentView('hub')}
        onSelectReport={(report) => {
          setSelectedReportForInspection(report);
          setCurrentView('inspection');
        }}
      />
    );
  }

  // 3. Ward Compliance Screen
  if (currentView === 'compliance') {
    return (
      <WardComplianceScreen
        initialWardId={selectedWardId}
        onBack={() => setCurrentView('hub')}
      />
    );
  }

  // 4. Standalone User Role Management View
  if (currentView === 'users') {
    return (
      <SafeAreaView style={styles.standaloneView}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />
        <UserManagementSection
          isStandalone={true}
          onBack={() => setCurrentView('hub')}
        />
      </SafeAreaView>
    );
  }

  // 5. Main Dashboard Overview (Hub)
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />

      {/* ── Top Mobile Emerald Header ── */}
      <View style={styles.topHeader}>
        <View style={styles.headerNavRow}>
          {/* Top-Left Drawer Trigger (Hamburger Menu) */}
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setIsDrawerOpen(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open navigation drawer"
          >
            <Feather name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Center Brand Title */}
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Feather name="shield" size={16} color="#A7F3D0" style={{ marginRight: 6 }} />
              <Text style={styles.headerAppTitle}>UnityMap Admin</Text>
            </View>
            <Text style={styles.headerSubtitle}>Municipal Council Operations</Text>
          </View>

          {/* Top-Right Quick Action (Logout) */}
          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={() => authService.logout()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Quick Log Out"
          >
            <Feather name="log-out" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Administrator Profile Card */}
        <View style={styles.adminProfileBanner}>
          <View style={styles.adminAvatarCircle}>
            <Text style={styles.adminAvatarEmoji}>{isSuper ? '🛡️' : '🏛️'}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.adminNameRow}>
              <Text style={styles.adminName}>{currentUser.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: isSuper ? '#F59E0B' : '#10B981' }]}>
                <Text style={styles.roleBadgeText}>
                  {isSuper ? 'SUPER ADMIN' : 'ADMIN'}
                </Text>
              </View>
            </View>
            <Text style={styles.adminWardJurisdiction}>
              📍 Ward Jurisdiction: {activeWard.name} ({activeWard.wardNumber})
            </Text>
          </View>
        </View>
      </View>

      {/* ── Main Scrollable Body ── */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Ward Jurisdiction Selection Strip */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📍 Select Active Ward</Text>
            <Text style={styles.sectionSubtitle}>Filtered infrastructure jurisdiction</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wardScroll}>
            {MUNICIPAL_WARDS.map((ward) => {
              const isSelected = ward.id === selectedWardId;
              return (
                <TouchableOpacity
                  key={ward.id}
                  style={[styles.wardChip, isSelected && styles.selectedWardChip]}
                  onPress={() => handleWardChange(ward.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Select Ward ${ward.wardNumber}`}
                >
                  <Text style={[styles.wardChipText, isSelected && styles.selectedWardChipText]}>
                    Ward {ward.wardNumber}: {ward.name.split(' ')[0]}
                  </Text>
                  {isSelected && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Ward Summary Card */}
          <View style={styles.wardOverviewBox}>
            <View style={styles.wardHeaderRow}>
              <Text style={styles.wardOverviewTitle}>{activeWard.name}</Text>
              <View
                style={[
                  styles.priorityTag,
                  activeWard.priority === 'CRITICAL' ? styles.criticalTag : styles.highTag,
                ]}
              >
                <Text style={styles.priorityText}>{activeWard.priority} PRIORITY</Text>
              </View>
            </View>
            <Text style={styles.wardOverviewDesc}>{activeWard.description}</Text>

            {/* KPI Cards Row */}
            <View style={styles.kpiRow}>
              <TouchableOpacity
                style={styles.kpiBox}
                onPress={() => setCurrentView('triage')}
                activeOpacity={0.7}
              >
                <Text style={[styles.kpiNumber, { color: '#047857' }]}>{activeWard.activeBarriers}</Text>
                <Text style={styles.kpiCaption}>Pending Triage →</Text>
              </TouchableOpacity>

              <View style={styles.kpiDivider} />

              <TouchableOpacity
                style={styles.kpiBox}
                onPress={() => setCurrentView('compliance')}
                activeOpacity={0.7}
              >
                <Text style={[styles.kpiNumber, { color: '#0B3D2E' }]}>{activeWard.complianceScore}%</Text>
                <Text style={styles.kpiCaption}>Compliance →</Text>
              </TouchableOpacity>

              <View style={styles.kpiDivider} />

              <View style={styles.kpiBox}>
                <Text style={[styles.kpiNumber, { color: '#1D4ED8' }]}>
                  {(activeWard.allocatedBudgetLKR / 1000000).toFixed(1)}M
                </Text>
                <Text style={styles.kpiCaption}>Budget (LKR)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Municipal Operational Workflows ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>⚡ Municipal Operational Workflows</Text>
            <Text style={styles.sectionSubtitle}>
              Core inspection, review, and infrastructure dispatch actions
            </Text>
          </View>

          {/* Module 1: Barrier Triage Queue */}
          <TouchableOpacity
            style={styles.actionModuleCard}
            onPress={() => setCurrentView('triage')}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBadge, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="zap" size={22} color="#047857" />
            </View>
            <View style={styles.moduleTextContent}>
              <Text style={styles.moduleHeading}>Barrier Triage & Urgency Queue</Text>
              <Text style={styles.moduleDescription}>
                Review severity-ranked citizen and volunteer reports. Prioritize immediate obstacles.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#047857" />
          </TouchableOpacity>

          {/* Module 2: Inspection Workspace */}
          <TouchableOpacity
            style={styles.actionModuleCard}
            onPress={() => {
              setSelectedReportForInspection(null);
              setCurrentView('inspection');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBadge, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="check-square" size={22} color="#1D4ED8" />
            </View>
            <View style={styles.moduleTextContent}>
              <Text style={styles.moduleHeading}>Photo Inspection & Decision Workspace</Text>
              <Text style={styles.moduleDescription}>
                Cross-check evidence against municipal records. Approve repair budgets or reject.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#1D4ED8" />
          </TouchableOpacity>

          {/* Module 3: Ward Compliance Analytics */}
          <TouchableOpacity
            style={styles.actionModuleCard}
            onPress={() => setCurrentView('compliance')}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBadge, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="bar-chart-2" size={22} color="#0B3D2E" />
            </View>
            <View style={styles.moduleTextContent}>
              <Text style={styles.moduleHeading}>Ward Infrastructure & Compliance Index</Text>
              <Text style={styles.moduleDescription}>
                Ward accessibility metrics, municipal repair fund allocations, and resolution trends.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#0B3D2E" />
          </TouchableOpacity>
        </View>

        {/* ── User Role Management Section ── */}
        <UserManagementSection />
      </ScrollView>

      {/* ── Slide-in Side Navigation Drawer ── */}
      <AdminDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        currentUser={currentUser}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  standaloneView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  topHeader: {
    backgroundColor: '#0B3D2E',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 32 : 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  headerNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAppTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 1,
  },
  headerLogoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 12,
    borderRadius: 14,
  },
  adminAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminAvatarEmoji: {
    fontSize: 20,
  },
  adminNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  adminWardJurisdiction: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  wardScroll: {
    marginBottom: 14,
  },
  wardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    minHeight: 36,
  },
  selectedWardChip: {
    backgroundColor: '#0B3D2E',
  },
  wardChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  selectedWardChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  wardOverviewBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  wardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wardOverviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  criticalTag: {
    backgroundColor: '#FEF2F2',
  },
  highTag: {
    backgroundColor: '#FEF3C7',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  wardOverviewDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  kpiCaption: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  actionModuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  moduleIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleTextContent: {
    flex: 1,
    marginRight: 8,
  },
  moduleHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  moduleDescription: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
});

export default AdminPortalScaffoldScreen;
