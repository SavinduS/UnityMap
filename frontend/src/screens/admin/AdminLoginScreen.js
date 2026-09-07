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

  // Quick-fill presets for examiners and demo verification
  const handleQuickFill = (roleKey, wardId, defaultEmail) => {
    setSelectedRole(roleKey);
    setSelectedWardId(wardId);
    setEmail(defaultEmail);
    setPassword('CMC-Secure#2026');
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
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
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
              <Text style={styles.emblemIcon}>🏛️</Text>
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
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Card Form */}
          <View style={styles.formCard}>
            <Text style={styles.formSectionHeader}>🔐 Official Staff Authentication</Text>

            {/* Email / Badge ID Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MUNICIPAL EMAIL / BADGE ID</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLeadingIcon}>👤</Text>
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
                <Text style={styles.inputLeadingIcon}>🔒</Text>
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
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
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
                  return (
                    <TouchableOpacity
                      key={roleKey}
                      style={[
                        styles.roleChip,
                        isSelected && { borderColor: role.badgeColor, backgroundColor: '#EFF6FF' },
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
                        {role.title.split(' ')[0]} {role.title.split(' ')[1]}
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
              >
                <View style={styles.wardPickerLeft}>
                  <Text style={styles.wardPickerIcon}>📍</Text>
                  <View>
                    <Text style={styles.wardPickerName}>
                      Ward {activeWard.wardNumber}: {activeWard.name}
                    </Text>
                    <Text style={styles.wardPickerCaption}>
                      {activeWard.activeBarriers} pending barriers • {activeWard.complianceScore}% compliance
                    </Text>
                  </View>
                </View>
                <Text style={styles.wardPickerArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Login Action Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.loginButtonText}>Verifying Credentials...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Authorize & Enter Portal →</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick-Fill Evaluator / Demo Presets */}
          <View style={styles.demoBox}>
            <Text style={styles.demoHeader}>⚡ ONE-TAP DEMO PRESETS (EVALUATOR SHORTCUTS)</Text>
            <View style={styles.demoButtonsRow}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() =>
                  handleQuickFill('CHIEF_ENGINEER', 'CMC-W01', 'k.perera@cmc.gov.lk')
                }
              >
                <Text style={styles.presetTitle}>Chief Engineer</Text>
                <Text style={styles.presetDesc}>Fort & Pettah (W1)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetButton}
                onPress={() =>
                  handleQuickFill('WARD_INSPECTOR', 'CMC-W06', 'r.wickramasinghe@cmc.gov.lk')
                }
              >
                <Text style={styles.presetTitle}>Ward Inspector</Text>
                <Text style={styles.presetDesc}>Borella Health (W6)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetButton}
                onPress={() =>
                  handleQuickFill('BUDGET_OFFICER', 'CMC-W03', 't.jayawardena@cmc.gov.lk')
                }
              >
                <Text style={styles.presetTitle}>Budget Officer</Text>
                <Text style={styles.presetDesc}>Kollupitiya (W3)</Text>
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
              >
                <Text style={styles.modalCloseText}>✕</Text>
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
                      <Text style={styles.modalStatText}>🚧 {ward.activeBarriers} Active Barriers</Text>
                      <Text style={styles.modalStatText}>📊 {ward.complianceScore}% Compliance</Text>
                      <Text style={styles.modalStatText}>
                        💰 {(ward.allocatedBudgetLKR / 1000000).toFixed(1)}M LKR Budget
                      </Text>
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
    backgroundColor: '#0F172A',
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emblemBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  emblemIcon: {
    fontSize: 30,
  },
  govTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
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
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  formSectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputLeadingIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 10,
  },
  eyeToggle: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  roleIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    padding: 12,
  },
  wardPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wardPickerIcon: {
    fontSize: 20,
    marginRight: 10,
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
  wardPickerArrow: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
  },
  loginButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonDisabled: {
    backgroundColor: '#93C5FD',
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
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
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
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  presetTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  presetDesc: {
    fontSize: 9,
    color: '#94A3B8',
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
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
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
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
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
    color: '#2563EB',
  },
  modalPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    color: '#1D4ED8',
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
  modalStatText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
});

export default AdminLoginScreen;
