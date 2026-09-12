/**
 * AdminDrawer.js
 * Side Navigation Drawer for UnityMap Municipal Admin Portal
 * 
 * Features:
 * - Slide-in navigation drawer with smooth backdrop
 * - Administrator identity header with Super Admin / Admin badge
 * - Well-structured, logical operational categories:
 *   • Operations & Barrier Triage (Dashboard, Triage Queue, Inspection)
 *   • Governance & System (User Management, Ward Compliance)
 *   • Citizen Map Preview
 * - Footer with prominent Log Out button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import authService from '../../services/authService';

export const AdminDrawer = ({
  isOpen,
  onClose,
  currentView,
  onSelectView,
  currentUser,
}) => {
  const isSuper = !!currentUser?.isSuperAdmin || currentUser?.email === 'admin@unitymap.com';

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const menuSections = [
    {
      category: 'OPERATIONS & DISPATCH',
      items: [
        { id: 'hub', label: 'Dashboard Hub', icon: 'grid', desc: 'Jurisdiction overview & quick metrics' },
        { id: 'triage', label: 'Barrier Triage Queue', icon: 'zap', desc: 'Prioritize citizen reports' },
        { id: 'inspection', label: 'Inspection Workspace', icon: 'search', desc: 'Evidence review & dispatch' },
      ],
    },
    {
      category: 'GOVERNANCE & SYSTEM',
      items: [
        { id: 'users', label: 'User Role Management', icon: 'users', desc: 'Promote/demote accounts' },
        { id: 'compliance', label: 'Ward Compliance Analytics', icon: 'bar-chart-2', desc: 'Scores & repair budget' },
      ],
    },
  ];

  const handleSelect = (viewId) => {
    onSelectView(viewId);
    onClose();
  };

  const handleLogout = () => {
    onClose();
    authService.logout();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap Target */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close navigation drawer"
        />

        {/* Drawer Content Panel */}
        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.drawerInner}>
            {/* Header / Brand */}
            <View style={styles.brandHeader}>
              <View style={styles.brandRow}>
                <View style={styles.brandEmblem}>
                  <Feather name="map-pin" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.brandTitle}>UnityMap</Text>
                  <Text style={styles.brandSubtitle}>Municipal Admin Portal</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close menu"
                >
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Admin Profile Card */}
              {currentUser ? (
                <View style={styles.profileCard}>
                  <View style={[styles.profileAvatar, { backgroundColor: isSuper ? '#F59E0B' : '#10B981' }]}>
                    <Text style={styles.avatarInitials}>{getInitials(currentUser.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {currentUser.name || 'Admin Officer'}
                    </Text>
                    <Text style={styles.profileEmail} numberOfLines={1}>
                      {currentUser.email}
                    </Text>
                    <View style={styles.roleBadgeRow}>
                      <View style={[styles.roleBadge, { backgroundColor: isSuper ? '#F59E0B' : '#10B981' }]}>
                        <Text style={styles.roleBadgeText}>
                          {isSuper ? 'SUPER ADMIN' : 'ADMINISTRATOR'}
                        </Text>
                      </View>
                      <Text style={styles.wardBadgeText}>
                        {currentUser.assignedWardId || 'CMC-W01'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Menu Links ScrollView */}
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {menuSections.map((section) => (
                <View key={section.category} style={styles.sectionBlock}>
                  <Text style={styles.categoryTitle}>{section.category}</Text>
                  {section.items.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.menuItem, isActive && styles.menuItemActive]}
                        onPress={() => handleSelect(item.id)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                      >
                        <View style={[styles.menuIconBox, isActive && styles.menuIconBoxActive]}>
                          <Feather
                            name={item.icon}
                            size={17}
                            color={isActive ? '#FFFFFF' : '#0B3D2E'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                            {item.label}
                          </Text>
                          <Text style={styles.menuDesc}>{item.desc}</Text>
                        </View>
                        <Feather
                          name="chevron-right"
                          size={15}
                          color={isActive ? '#10B981' : '#CBD5E1'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* Quick Info Box */}
              <View style={styles.infoCard}>
                <Feather name="info" size={15} color="#0B3D2E" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Colombo Municipal Council</Text>
                  <Text style={styles.infoText}>
                    Accessibility & Infrastructure Management Division. Jurisdiction encompasses 47 active municipal wards.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer with Prominent Log Out */}
            <View style={styles.footerContainer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Log out of Admin Portal"
              >
                <Feather name="log-out" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.logoutButtonText}>Log Out of Session</Text>
              </TouchableOpacity>

              <Text style={styles.versionText}>
                UnityMap Mobile Admin • v1.2.0
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerContainer: {
    width: '84%',
    maxWidth: 340,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 16,
  },
  drawerInner: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  brandHeader: {
    backgroundColor: '#0B3D2E',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandEmblem: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#A7F3D0',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 10,
    borderRadius: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 1,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  wardBadgeText: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
    minHeight: 52,
  },
  menuItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconBoxActive: {
    backgroundColor: '#0B3D2E',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuLabelActive: {
    color: '#0B3D2E',
  },
  menuDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    marginTop: 6,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B3D2E',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
  footerContainer: {
    padding: 14,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 46,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  versionText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default AdminDrawer;
