/**
 * AdminPortalScaffoldScreen.js
 * Municipal Admin Portal Hub & Foundation Scaffold
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-010
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
} from 'react-native';
import adminAuthService from '../../services/adminAuthService';
import {
  MUNICIPAL_WARDS,
  MUNICIPAL_ROLES,
  getWardById,
} from '../../utils/wardJurisdictions';

export const AdminPortalScaffoldScreen = () => {
  const [currentUser, setCurrentUser] = useState(adminAuthService.getCurrentUser());
  const [selectedWardId, setSelectedWardId] = useState(
    currentUser?.assignedWardId || 'CMC-W01'
  );

  useEffect(() => {
    const unsubscribe = adminAuthService.subscribe((user) => {
      setCurrentUser(user);
      if (user?.assignedWardId) setSelectedWardId(user.assignedWardId);
    });
    return unsubscribe;
  }, []);

  const activeWard = getWardById(selectedWardId);
  const activeRole = currentUser ? MUNICIPAL_ROLES[currentUser.role] : null;

  const handleWardChange = (wardId) => {
    setSelectedWardId(wardId);
    adminAuthService.switchWard(wardId);
  };

  const handleRoleChange = (roleKey) => {
    adminAuthService.switchRole(roleKey);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Municipal Authority Header */}
        <View style={styles.headerCard}>
          <View style={styles.govBadgeContainer}>
            <Text style={styles.govEmblem}>🏛️</Text>
            <View>
              <Text style={styles.govTitle}>COLOMBO MUNICIPAL COUNCIL</Text>
              <Text style={styles.govSubtitle}>Municipal Accessibility & Infrastructure Division</Text>
            </View>
          </View>

          {currentUser ? (
            <View style={styles.staffProfileBox}>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{currentUser.name}</Text>
                <Text style={styles.badgeNumber}>ID: {currentUser.badgeNumber}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: activeRole?.badgeColor || '#2563EB' },
                ]}
              >
                <Text style={styles.roleBadgeText}>{activeRole?.title}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.loggedOutBox}>
              <Text style={styles.loggedOutText}>Staff Authentication Required</Text>
            </View>
          )}
        </View>

        {/* Jurisdiction Selector Bar */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📍 Ward Jurisdiction</Text>
            <Text style={styles.sectionCaption}>Select council ward</Text>
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
                >
                  <Text style={[styles.wardChipText, isSelected && styles.selectedWardChipText]}>
                    Ward {ward.wardNumber}: {ward.name.split(' ')[0]}
                  </Text>
                  {isSelected && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Ward KPI Overview */}
          <View style={styles.wardSummaryCard}>
            <View style={styles.wardHeader}>
              <Text style={styles.wardTitle}>{activeWard.name}</Text>
              <View style={[styles.priorityTag, activeWard.priority === 'CRITICAL' ? styles.criticalTag : styles.highTag]}>
                <Text style={styles.priorityText}>{activeWard.priority} PRIORITY</Text>
              </View>
            </View>
            <Text style={styles.wardDesc}>{activeWard.description}</Text>

            <View style={styles.kpiRow}>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiValue}>{activeWard.activeBarriers}</Text>
                <Text style={styles.kpiLabel}>Pending Triage</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Text style={styles.kpiValue}>{activeWard.complianceScore}%</Text>
                <Text style={styles.kpiLabel}>Compliance Index</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Text style={styles.kpiValue}>
                  {(activeWard.allocatedBudgetLKR / 1000000).toFixed(1)}M LKR
                </Text>
                <Text style={styles.kpiLabel}>Repair Budget</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Flow 4 Module Directory (Sprint 0 - 2 Roadmap) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>⚖️ Component 4 Modules (Flow 4)</Text>
          <Text style={styles.sectionSubtitle}>
            Municipal barrier review, cross-checking & dispatch workflows
          </Text>

          {/* Module 1: Secure Login */}
          <View style={styles.moduleCard}>
            <View style={styles.moduleIconBox}>
              <Text style={styles.moduleIcon}>🔐</Text>
            </View>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleTagRow}>
                <Text style={styles.moduleTicket}>SPT-110 (Page 1)</Text>
                <View style={styles.readyTag}>
                  <Text style={styles.readyTagText}>AUTH READY</Text>
                </View>
              </View>
              <Text style={styles.moduleName}>Secure Portal Login & Jurisdiction</Text>
              <Text style={styles.moduleDesc}>
                Municipal credential verification, JWT session handling, and assigned ward filtering.
              </Text>
            </View>
          </View>

          {/* Module 2: Triage Queue */}
          <View style={styles.moduleCard}>
            <View style={[styles.moduleIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.moduleIcon}>⚡</Text>
            </View>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleTagRow}>
                <Text style={styles.moduleTicket}>SPT-111 / SPT-112 (Page 2)</Text>
                <View style={styles.sprintTag}>
                  <Text style={styles.sprintTagText}>SPRINT 1</Text>
                </View>
              </View>
              <Text style={styles.moduleName}>Automated Severity Triage Queue</Text>
              <Text style={styles.moduleDesc}>
                Auto-prioritizes volunteer barrier submissions using dynamic urgency index & corroboration tallies.
              </Text>
            </View>
          </View>

          {/* Module 3: Inspection Workspace */}
          <View style={styles.moduleCard}>
            <View style={[styles.moduleIconBox, { backgroundColor: '#EDE9FE' }]}>
              <Text style={styles.moduleIcon}>🔎</Text>
            </View>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleTagRow}>
                <Text style={styles.moduleTicket}>SPT-207 / SPT-208 (Page 3)</Text>
                <View style={styles.sprintTag}>
                  <Text style={styles.sprintTagText}>SPRINT 2</Text>
                </View>
              </View>
              <Text style={styles.moduleName}>Evidence Inspection & Asset Check</Text>
              <Text style={styles.moduleDesc}>
                Side-by-side photo comparison against CMC asset records with Approve & Budget, Reject, or Request Info.
              </Text>
            </View>
          </View>

          {/* Module 4: Ward Compliance */}
          <View style={styles.moduleCard}>
            <View style={[styles.moduleIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.moduleIcon}>📊</Text>
            </View>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleTagRow}>
                <Text style={styles.moduleTicket}>SPT-209 (Page 4)</Text>
                <View style={styles.sprintTag}>
                  <Text style={styles.sprintTagText}>SPRINT 2</Text>
                </View>
              </View>
              <Text style={styles.moduleName}>Ward Compliance & Budget Analytics</Text>
              <Text style={styles.moduleDesc}>
                Accessibility scores, active repair budget queue status, and monthly resolution statistics.
              </Text>
            </View>
          </View>
        </View>

        {/* Staff Role Switcher for Testing/Demo */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>👤 Test Role Simulation</Text>
          <Text style={styles.sectionCaption}>Switch municipal persona to verify permissions</Text>

          <View style={styles.roleToggleGroup}>
            {Object.keys(MUNICIPAL_ROLES).map((roleKey) => {
              const role = MUNICIPAL_ROLES[roleKey];
              const isCurrent = currentUser?.role === roleKey;
              return (
                <TouchableOpacity
                  key={roleKey}
                  style={[
                    styles.roleOptionButton,
                    isCurrent && { borderColor: role.badgeColor, backgroundColor: '#1E293B' },
                  ]}
                  onPress={() => handleRoleChange(roleKey)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      isCurrent && { color: role.badgeColor, fontWeight: '700' },
                    ]}
                  >
                    {role.title}
                  </Text>
                  {isCurrent && <Text style={styles.roleActiveIndicator}>✓ Active</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  govBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  govEmblem: {
    fontSize: 32,
    marginRight: 12,
  },
  govTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  govSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  staffProfileBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  badgeNumber: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  loggedOutBox: {
    padding: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
  },
  loggedOutText: {
    color: '#F1F5F9',
    fontSize: 12,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  sectionCaption: {
    fontSize: 12,
    color: '#64748B',
  },
  wardScroll: {
    marginBottom: 12,
  },
  wardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  selectedWardChip: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
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
    backgroundColor: '#38BDF8',
    marginLeft: 6,
  },
  wardSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  wardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  wardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  criticalTag: {
    backgroundColor: '#FEE2E2',
  },
  highTag: {
    backgroundColor: '#FEF3C7',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  wardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  moduleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  moduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleIcon: {
    fontSize: 20,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  moduleTicket: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  readyTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  readyTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
  },
  sprintTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sprintTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  roleToggleGroup: {
    gap: 8,
    marginTop: 6,
  },
  roleOptionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  roleOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  roleActiveIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
});

export default AdminPortalScaffoldScreen;
