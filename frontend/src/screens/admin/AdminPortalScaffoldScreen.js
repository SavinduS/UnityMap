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
import { fetchTriageMetrics } from '../../services/triageService';
import { fetchWardCompliance } from '../../services/wardComplianceService';
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
  const [wardMetrics, setWardMetrics] = useState({
    activeBarriers: 0,
    complianceScore: 100,
    allocatedBudgetLKR: 1850000,
    isLoading: true,
  });

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
      if (user?.assignedWardId) setSelectedWardId(user.assignedWardId);
    });
    return unsubscribe;
  }, []);

  // Fetch real-time ward metrics from backend
  useEffect(() => {
    let isMounted = true;
    const loadLiveMetrics = async () => {
      try {
        const [triageData, complianceData] = await Promise.all([
          fetchTriageMetrics(selectedWardId),
          fetchWardCompliance(selectedWardId),
        ]);
        if (!isMounted) return;
        setWardMetrics({
          activeBarriers: triageData?.totalPendingReports ?? complianceData?.activeBarrierCount ?? 0,
          complianceScore: complianceData?.complianceScorePercent ?? 100,
          allocatedBudgetLKR: complianceData?.allocatedBudgetLKR ?? 1850000,
          isLoading: false,
        });
      } catch (err) {
        console.warn('[AdminPortalScaffold] Failed to load live metrics:', err.message);
      }
    };
    loadLiveMetrics();
    return () => {
      isMounted = false;
    };
  }, [selectedWardId]);

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
        reportId={selectedReportForInspection?._id || null}
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

  // Initials helper for avatar
  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // 5. Main Dashboard Overview (Hub)
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />

      {/* Top Mobile Emerald Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerNavRow}>
          {/* Top-Left Drawer Trigger */}
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setIsDrawerOpen(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open navigation drawer"
          >
            <Feather name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Center Brand Title */}
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Feather name="shield" size={14} color="#A7F3D0" style={{ marginRight: 5 }} />
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
            <Feather name="log-out" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Administrator Profile Card */}
        <View style={styles.adminProfileBanner}>
          <View style={styles.adminAvatarCircle}>
            <Text style={styles.adminAvatarInitials}>{getInitials(currentUser.name)}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.adminNameRow}>
              <Text style={styles.adminName} numberOfLines={1}>{currentUser.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: isSuper ? '#F59E0B' : '#10B981' }]}>
                <Text style={styles.roleBadgeText}>
                  {isSuper ? 'SUPER ADMIN' : 'ADMIN'}
                </Text>
              </View>
            </View>
            <View style={styles.wardJurisdictionRow}>
              <Feather name="map-pin" size={11} color="#A7F3D0" style={{ marginRight: 4 }} />
              <Text style={styles.adminWardJurisdiction} numberOfLines={1}>
                {activeWard.name} (Ward {activeWard.wardNumber})
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Scrollable Body */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Ward Jurisdiction Selection Strip */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBox}>
                <Feather name="map-pin" size={13} color="#047857" />
              </View>
              <Text style={styles.sectionTitle}>Active Ward</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Infrastructure jurisdiction</Text>
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
                    W{ward.wardNumber} — {ward.name.split(' ')[0]}
                  </Text>
                  {isSelected && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Ward Summary Card */}
          <View style={styles.wardOverviewBox}>
            <View style={styles.wardHeaderRow}>
              <Text style={styles.wardOverviewTitle} numberOfLines={1}>{activeWard.name}</Text>
              <View
                style={[
                  styles.priorityTag,
                  activeWard.priority === 'CRITICAL' ? styles.criticalTag : styles.highTag,
                ]}
              >
                <Text style={[
                  styles.priorityText,
                  { color: activeWard.priority === 'CRITICAL' ? '#DC2626' : '#D97706' }
                ]}>
                  {activeWard.priority}
                </Text>
              </View>
            </View>
            <Text style={styles.wardOverviewDesc} numberOfLines={2}>{activeWard.description}</Text>

            {/* KPI Cards Row (Real Data) */}
            <View style={styles.kpiRow}>
              <TouchableOpacity
                style={styles.kpiBox}
                onPress={() => setCurrentView('triage')}
                activeOpacity={0.7}
              >
                <View style={[styles.kpiAccentBar, { backgroundColor: '#DC2626' }]} />
                <Text style={[styles.kpiNumber, { color: '#DC2626' }]}>
                  {wardMetrics.isLoading ? '—' : wardMetrics.activeBarriers}
                </Text>
                <Text style={styles.kpiCaption} numberOfLines={1}>Pending Triage</Text>
                <Feather name="chevron-right" size={10} color="#94A3B8" style={{ marginTop: 2 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.kpiBox}
                onPress={() => setCurrentView('compliance')}
                activeOpacity={0.7}
              >
                <View style={[styles.kpiAccentBar, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.kpiNumber, { color: '#0B3D2E' }]}>
                  {wardMetrics.isLoading ? '—' : `${wardMetrics.complianceScore}%`}
                </Text>
                <Text style={styles.kpiCaption} numberOfLines={1}>Compliance</Text>
                <Feather name="chevron-right" size={10} color="#94A3B8" style={{ marginTop: 2 }} />
              </TouchableOpacity>

              <View style={styles.kpiBox}>
                <View style={[styles.kpiAccentBar, { backgroundColor: '#0B3D2E' }]} />
                <Text style={[styles.kpiNumber, { color: '#0B3D2E' }]}>
                  {((wardMetrics.allocatedBudgetLKR || 1850000) / 1000000).toFixed(1)}M
                </Text>
                <Text style={styles.kpiCaption} numberOfLines={1}>Budget (LKR)</Text>
                <View style={{ height: 12 }} />
              </View>
            </View>
          </View>
        </View>

        {/* Municipal Operational Workflows */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBox}>
                <Feather name="activity" size={13} color="#047857" />
              </View>
              <Text style={styles.sectionTitle}>Operational Workflows</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Inspection, review & dispatch</Text>
          </View>

          {/* Module 1: Barrier Triage Queue */}
          <TouchableOpacity
            style={styles.actionModuleCard}
            onPress={() => setCurrentView('triage')}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBadge, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="zap" size={20} color="#047857" />
            </View>
            <View style={styles.moduleTextContent}>
              <Text style={styles.moduleHeading}>Barrier Triage & Urgency Queue</Text>
              <Text style={styles.moduleDescription}>
                Review severity-ranked citizen and volunteer reports. Prioritize immediate obstacles.
              </Text>
            </View>
            <View style={styles.moduleChevron}>
              <Feather name="chevron-right" size={18} color="#047857" />
            </View>
          </TouchableOpacity>

          {/* Module 2: Inspection Workspace */}
          <TouchableOpacity
            style={styles.actionModuleCard}
            onPress={() => {
              if (selectedReportForInspection) {
                setCurrentView('inspection');
              } else {
                setCurrentView('triage');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBadge, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="check-square" size={20} color="#047857" />
            </View>
            <View style={styles.moduleTextContent}>
              <Text style={styles.moduleHeading}>Photo Inspection & Decision Workspace</Text>
              <Text style={styles.moduleDescription}>
                Cross-check evidence against municipal records. Approve repair budgets or reject.
              </Text>
            </View>
            <View style={styles.moduleChevron}>
              <Feather name="chevron-right" size={18} color="#047857" />
            </View>
          </TouchableOpacity>

          {/* Module 3: Ward Compliance Analytics */}
          <TouchableOpacity
            style={styles.actionModuleCard}
            onPress={() => setCurrentView('compliance')}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBadge, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="bar-chart-2" size={20} color="#0B3D2E" />
            </View>
            <View style={styles.moduleTextContent}>
              <Text style={styles.moduleHeading}>Ward Infrastructure & Compliance Index</Text>
              <Text style={styles.moduleDescription}>
                Ward accessibility metrics, municipal repair fund allocations, and resolution trends.
              </Text>
            </View>
            <View style={styles.moduleChevron}>
              <Feather name="chevron-right" size={18} color="#0B3D2E" />
            </View>
          </TouchableOpacity>
        </View>

        {/* User Role Management Section */}
        <UserManagementSection />
      </ScrollView>

      {/* Slide-in Side Navigation Drawer */}
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
    backgroundColor: '#F0F4F0',
  },
  standaloneView: {
    flex: 1,
    backgroundColor: '#F0F4F0',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 0,
  },
  topHeader: {
    backgroundColor: '#0B3D2E',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 32 : 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2,
  },
  headerLogoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  adminAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  adminNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  adminName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
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
  wardJurisdictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  adminWardJurisdiction: {
    fontSize: 11,
    color: '#A7F3D0',
    flexShrink: 1,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 36,
  },
  wardScroll: {
    marginBottom: 12,
  },
  wardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    marginRight: 8,
    minHeight: 38,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedWardChip: {
    backgroundColor: '#0B3D2E',
    borderColor: '#0B3D2E',
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
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  wardOverviewBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
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
    flex: 1,
    marginRight: 8,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    letterSpacing: 0.5,
  },
  wardOverviewDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  kpiAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  kpiCaption: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  actionModuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    minHeight: 72,
  },
  moduleIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  moduleTextContent: {
    flex: 1,
    marginRight: 8,
  },
  moduleHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  moduleDescription: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 15,
  },
  moduleChevron: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default AdminPortalScaffoldScreen;
