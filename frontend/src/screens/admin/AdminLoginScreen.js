/**
 * AdminLoginScreen.js
 * Page 1: Municipal Staff Secure Portal Login & Ward Jurisdiction Selection
 *
 * Assigned Member: Savindu
 * Ticket: SPT-110
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import adminAuthService from '../../services/adminAuthService';
import {
  MUNICIPAL_WARDS,
  MUNICIPAL_ROLES,
  getWardById,
} from '../../utils/wardJurisdictions';

export const AdminLoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('CHIEF_ENGINEER');
  const [selectedWardId, setSelectedWardId] = useState('CMC-W01');
  const [showPassword, setShowPassword] = useState(false);
  const [isWardModalOpen, setIsWardModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeWard = getWardById(selectedWardId);
  const activeRole = MUNICIPAL_ROLES[selectedRole];

  // Quick-fill presets for examiners and demo verification (password gated behind __DEV__)
  const handleQuickFill = (roleKey, wardId, defaultEmail) => {
    setSelectedRole(roleKey);
    setSelectedWardId(wardId);
    setEmail(defaultEmail);
    // Gate password auto-fill behind __DEV__; leave blank in non-dev environments
    setPassword(typeof __DEV__ !== 'undefined' && __DEV__ ? 'CMC-Secure#2026' : '');
    setErrorMessage('');
  };

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your official municipal email or badge ID.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const staffUser = await adminAuthService.login({
        email: email.trim(),
        password,
        wardId: selectedWardId,
        role: selectedRole,
      });

      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(staffUser);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Municipal Emblem & Header */}
          <View style={styles.header}>
            <View style={styles.emblemBadge}>
              <Feather name="shield" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.govTitle}>COLOMBO MUNICIPAL COUNCIL</Text>
            <Text style={styles.portalTitle}>Municipal Admin Portal</Text>
            <Text style={styles.portalSubtitle}>
              Urban Accessibility Barrier Triage & Infrastructure Dispatch
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-triangle" size={16} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Card Form */}
          <View style={styles.formCard}>
            <View style={styles.formSectionHeaderRow}>
              <Feather name="lock" size={16} color="#0B3D2E" />
              <Text style={styles.formSectionHeader}>Official Staff Authentication</Text>
            </View>

            {/* Email / Badge ID Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MUNICIPAL EMAIL / BADGE ID</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={16} color="#94A3B8" style={styles.inputLeadingIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. k.perera@cmc.gov.lk or CMC-882"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SECURITY PIN / PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color="#94A3B8" style={styles.inputLeadingIcon} />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Enter authorized password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeToggle}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Feather
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={16}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Role Clearance Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>STAFF CLEARANCE ROLE</Text>
              <View style={styles.roleGrid}>
                {Object.keys(MUNICIPAL_ROLES).map((roleKey) => {
                  const role = MUNICIPAL_ROLES[roleKey];
                  const isSelected = selectedRole === roleKey;
                  const shortRoleLabel =
                    roleKey === 'CHIEF_ENGINEER'
                      ? 'Engineer'
                      : roleKey === 'WARD_INSPECTOR'
                      ? 'Inspector'
                      : 'Budget';
                  return (
                    <TouchableOpacity
                      key={roleKey}
                      style={[
                        styles.roleChip,
                        isSelected && { borderColor: role.badgeColor, backgroundColor: '#ECFDF5' },
                      ]}
                      onPress={() => setSelectedRole(roleKey)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.roleIndicatorDot,
                          { backgroundColor: isSelected ? role.badgeColor : '#CBD5E1' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.roleChipText,
                          isSelected && { color: role.badgeColor, fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {shortRoleLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Ward Jurisdiction Selection Menu */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WARD JURISDICTION MENU</Text>
              <TouchableOpacity
                style={styles.wardPickerButton}
                onPress={() => setIsWardModalOpen(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Select ward jurisdiction"
              >
                <View style={styles.wardPickerLeft}>
                  <View style={styles.wardPickerIconBox}>
                    <Feather name="map-pin" size={14} color="#047857" />
                  </View>
                  <View>
                    <Text style={styles.wardPickerName}>
                      Ward {activeWard.wardNumber}: {activeWard.name}
                    </Text>
                    <Text style={styles.wardPickerCaption}>
                      Colombo Municipal Council • {activeWard.priority} Priority Zone
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-down" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Login Action Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Authorize and enter portal"
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.loginButtonText}>Verifying Credentials...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Text style={styles.loginButtonText}>Authorize & Enter Portal</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick-Fill Evaluator / Demo Presets */}
          <View style={styles.demoBox}>
            <Text style={styles.demoHeader}>DEMO PRESETS — EVALUATOR SHORTCUTS</Text>
            <View style={styles.demoButtonsRow}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() =>
                  handleQuickFill('CHIEF_ENGINEER', 'CMC-W01', 'k.perera@cmc.gov.lk')
                }
                activeOpacity={0.7}
              >
                <Text style={styles.presetTitle} numberOfLines={1}>Chief Engineer</Text>
                <Text style={styles.presetDesc} numberOfLines={1}>Fort (W1)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetButton}
                onPress={() =>
                  handleQuickFill('WARD_INSPECTOR', 'CMC-W06', 'r.wickramasinghe@cmc.gov.lk')
                }
                activeOpacity={0.7}
              >
                <Text style={styles.presetTitle} numberOfLines={1}>Inspector</Text>
                <Text style={styles.presetDesc} numberOfLines={1}>Borella (W6)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetButton}
                onPress={() =>
                  handleQuickFill('BUDGET_OFFICER', 'CMC-W03', 't.jayawardena@cmc.gov.lk')
                }
                activeOpacity={0.7}
              >
                <Text style={styles.presetTitle} numberOfLines={1}>Budget Officer</Text>
                <Text style={styles.presetDesc} numberOfLines={1}>Kollupitiya (W3)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Ward Jurisdiction Selection Modal */}
      <Modal
        visible={isWardModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsWardModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assigned Ward Jurisdiction</Text>
              <TouchableOpacity
                onPress={() => setIsWardModalOpen(false)}
                style={styles.modalCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close ward selection"
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {MUNICIPAL_WARDS.map((ward) => {
                const isSelected = ward.id === selectedWardId;
                return (
                  <TouchableOpacity
                    key={ward.id}
                    style={[styles.modalWardCard, isSelected && styles.selectedModalWardCard]}
                    onPress={() => {
                      setSelectedWardId(ward.id);
                      setIsWardModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalWardTop}>
                      <Text style={[styles.modalWardNumber, isSelected && styles.selectedText]}>
                        Ward {ward.wardNumber}
                      </Text>
                      <View
                        style={[
                          styles.modalPriorityBadge,
                          ward.priority === 'CRITICAL' ? styles.criticalBadge : styles.highBadge,
                        ]}
                      >
                        <Text style={styles.modalPriorityText}>{ward.priority}</Text>
                      </View>
                    </View>
                    <Text style={[styles.modalWardName, isSelected && styles.selectedText]}>
                      {ward.name}
                    </Text>
                    <Text style={styles.modalWardDetails}>{ward.description}</Text>
                    <View style={styles.modalWardStats}>
                      <View style={styles.modalStatItem}>
                        <Feather name="map-pin" size={11} color="#64748B" />
                        <Text style={styles.modalStatText}> Ward {ward.wardNumber} Jurisdiction</Text>
                      </View>
                      <View style={styles.modalStatItem}>
                        <Feather name="dollar-sign" size={11} color="#64748B" />
                        <Text style={styles.modalStatText}> {(ward.allocatedBudgetLKR / 1000000).toFixed(1)}M LKR Municipal Allocation</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B3D2E',
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F4F0',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#0B3D2E',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
  },
  emblemBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  govTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 1.5,
  },
  portalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  portalSubtitle: {
    fontSize: 12,
    color: '#A7F3D0',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  formSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  formSectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    ...(Platform.OS === 'web'
      ? {
          outlineStyle: 'none',
          outlineWidth: 0,
          outline: 'none',
          boxShadow: 'none',
        }
      : {}),
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 10,
    ...(Platform.OS === 'web'
      ? {
          outlineStyle: 'none',
          outlineWidth: 0,
          outline: 'none',
          boxShadow: 'none',
        }
      : {}),
  },
  eyeToggle: {
    padding: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 48,
  },
  roleIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  roleChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  wardPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  wardPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  wardPickerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardPickerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  wardPickerCaption: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  loginButton: {
    backgroundColor: '#0B3D2E',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(11, 61, 46, 0.4)',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  demoHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B3D2E',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  presetTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B3D2E',
    textAlign: 'center',
  },
  presetDesc: {
    fontSize: 9,
    color: '#166534',
    marginTop: 2,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    padding: 16,
  },
  modalWardCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  selectedModalWardCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  modalWardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalWardNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B3D2E',
  },
  modalPriorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  criticalBadge: {
    backgroundColor: '#FEE2E2',
  },
  highBadge: {
    backgroundColor: '#FEF3C7',
  },
  modalPriorityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  modalWardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedText: {
    color: '#047857',
  },
  modalWardDetails: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  modalWardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalStatText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
});

export default AdminLoginScreen;
