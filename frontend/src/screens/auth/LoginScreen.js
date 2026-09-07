/**
 * LoginScreen.js
 * Unified Authentication Screen (Sign In & Sign Up)
 * 
 * Features:
 * - Clean, professional mobile design matching UnityMap emerald aesthetic
 * - Segmented tabs: [ Sign In ] & [ Create Account ]
 * - Sign Up captures: First Name, Last Name, Email, Phone, and Password
 * - 1-Tap Quick-Fill Demo Chips for Super Admin and Regular User testing
 * - Show / hide password visibility toggle
 * - Full WCAG 2.1 touch-target & contrast compliance
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
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import authService, { DEMO_CREDENTIALS } from '../../services/authService';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';

export const LoginScreen = () => {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const { palette, borderWidth, isHighContrast } = useTheme();

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeChip, setActiveChip] = useState(null);

  // Quick fill handler for examiners & quick testing
  const handleQuickFill = (type) => {
    setActiveChip(type);
    setErrorMessage('');
    if (type === 'admin') {
      setLoginEmail(DEMO_CREDENTIALS.SUPER_ADMIN.email);
      setLoginPassword(DEMO_CREDENTIALS.SUPER_ADMIN.password);
    } else {
      setLoginEmail(DEMO_CREDENTIALS.REGULAR_USER.email);
      setLoginPassword(DEMO_CREDENTIALS.REGULAR_USER.password);
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');

    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      // Navigation will automatically update via authService listener
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');

    if (!firstName.trim()) {
      setErrorMessage('Please enter your first name.');
      return;
    }
    if (!registerEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!registerPassword || registerPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: registerEmail.trim(),
        phone: phone.trim(),
        password: registerPassword,
      });
      // Auto-logged in upon successful registration!
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View style={[styles.headerBanner, { backgroundColor: '#0B3D2E' }]}>
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Feather name="map-pin" size={26} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandTitle}>UnityMap</Text>
                <Text style={styles.brandSubtitle}>Accessible Navigation & City Reporting</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.pillBadge}>
                <FontAwesome5 name="wheelchair" size={11} color="#E2E8F0" style={{ marginRight: 5 }} />
                <Text style={styles.pillBadgeText}>Wheelchair Friendly</Text>
              </View>
              <View style={styles.pillBadge}>
                <Feather name="shield" size={11} color="#E2E8F0" style={{ marginRight: 5 }} />
                <Text style={styles.pillBadgeText}>Admin Verified</Text>
              </View>
            </View>
          </View>

          {/* Form Container Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
                borderWidth,
              },
            ]}
          >
            {/* Segmented Auth Mode Switcher */}
            <View
              style={[
                styles.segmentedContainer,
                { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth: isHighContrast ? borderWidth : 0 },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  authMode === 'login' && [styles.segmentActive, { backgroundColor: palette.primary }],
                ]}
                onPress={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                }}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: authMode === 'login' }}
                accessibilityLabel="Switch to Sign In"
              >
                <Feather
                  name="log-in"
                  size={16}
                  color={authMode === 'login' ? '#FFFFFF' : palette.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  {...textProps}
                  style={[
                    styles.segmentText,
                    getTextStyle('sm', { isHighContrast }),
                    { color: authMode === 'login' ? '#FFFFFF' : palette.textMuted, fontWeight: '700' },
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  authMode === 'register' && [styles.segmentActive, { backgroundColor: palette.primary }],
                ]}
                onPress={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                }}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: authMode === 'register' }}
                accessibilityLabel="Switch to Create Account"
              >
                <Feather
                  name="user-plus"
                  size={16}
                  color={authMode === 'register' ? '#FFFFFF' : palette.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  {...textProps}
                  style={[
                    styles.segmentText,
                    getTextStyle('sm', { isHighContrast }),
                    { color: authMode === 'register' ? '#FFFFFF' : palette.textMuted, fontWeight: '700' },
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Banner */}
            {errorMessage ? (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: isHighContrast ? '#000000' : palette.errorBg, borderColor: palette.error },
                ]}
              >
                <Feather name="alert-circle" size={18} color={isHighContrast ? '#FFFFFF' : '#DC2626'} style={{ marginRight: 8 }} />
                <Text
                  {...textProps}
                  style={[
                    styles.errorText,
                    getTextStyle('sm', { isHighContrast }),
                    { color: isHighContrast ? '#FFFFFF' : '#DC2626' },
                  ]}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* ══════════════ SIGN IN TAB ══════════════ */}
            {authMode === 'login' ? (
              <View>
                {/* 1-Tap Quick Demo Shortcuts */}
                <View style={styles.demoSection}>
                  <Text
                    {...textProps}
                    style={[
                      styles.demoSectionTitle,
                      getTextStyle('xs', { isHighContrast }),
                      { color: palette.textMuted },
                    ]}
                  >
                    ⚡ 1-TAP DEMO ACCOUNTS (PASSWORD: 123456)
                  </Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[
                        styles.demoChip,
                        {
                          backgroundColor: activeChip === 'admin' ? '#0B3D2E' : palette.surfaceAlt,
                          borderColor: activeChip === 'admin' ? palette.primary : palette.border,
                          borderWidth,
                        },
                      ]}
                      onPress={() => handleQuickFill('admin')}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Quick fill Super Admin credentials"
                    >
                      <Text style={styles.chipIcon}>🛡️</Text>
                      <View>
                        <Text
                          style={[
                            styles.chipTitle,
                            { color: activeChip === 'admin' ? '#FFFFFF' : palette.textPrimary },
                          ]}
                        >
                          Super Admin
                        </Text>
                        <Text
                          style={[
                            styles.chipSubtitle,
                            { color: activeChip === 'admin' ? '#A7F3D0' : palette.textMuted },
                          ]}
                        >
                          admin@unitymap.com
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.demoChip,
                        {
                          backgroundColor: activeChip === 'user' ? '#0B3D2E' : palette.surfaceAlt,
                          borderColor: activeChip === 'user' ? palette.primary : palette.border,
                          borderWidth,
                        },
                      ]}
                      onPress={() => handleQuickFill('user')}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Quick fill Regular User credentials"
                    >
                      <Text style={styles.chipIcon}>👤</Text>
                      <View>
                        <Text
                          style={[
                            styles.chipTitle,
                            { color: activeChip === 'user' ? '#FFFFFF' : palette.textPrimary },
                          ]}
                        >
                          Regular User
                        </Text>
                        <Text
                          style={[
                            styles.chipSubtitle,
                            { color: activeChip === 'user' ? '#A7F3D0' : palette.textMuted },
                          ]}
                        >
                          user@unitymap.com
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <Text
                    {...textProps}
                    style={[styles.inputLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textSecondary }]}
                  >
                    EMAIL ADDRESS
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth },
                    ]}
                  >
                    <Feather name="mail" size={18} color={palette.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: palette.textPrimary }]}
                      placeholder="Enter your email"
                      placeholderTextColor={palette.placeholder}
                      value={loginEmail}
                      onChangeText={(val) => {
                        setLoginEmail(val);
                        setActiveChip(null);
                        if (errorMessage) setErrorMessage('');
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      accessibilityLabel="Email address input"
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text
                    {...textProps}
                    style={[styles.inputLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textSecondary }]}
                  >
                    PASSWORD
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth },
                    ]}
                  >
                    <Feather name="lock" size={18} color={palette.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: palette.textPrimary, flex: 1 }]}
                      placeholder="Enter your password"
                      placeholderTextColor={palette.placeholder}
                      value={loginPassword}
                      onChangeText={(val) => {
                        setLoginPassword(val);
                        if (errorMessage) setErrorMessage('');
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Password input"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.eyeButton}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={palette.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign In Action Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: palette.primary,
                      borderColor: isHighContrast ? '#000000' : palette.primary,
                      borderWidth: isHighContrast ? borderWidth : 0,
                    },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in button"
                >
                  {isLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.buttonText}>Signing In...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContentRow}>
                      <Text style={styles.buttonText}>Sign In</Text>
                      <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Bottom Switch Link */}
                <View style={styles.switchModeRow}>
                  <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => setAuthMode('register')}>
                    <Text
                      {...textProps}
                      style={[getTextStyle('sm', { isHighContrast }), { color: palette.primary, fontWeight: '700' }]}
                    >
                      Create an account
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ══════════════ CREATE ACCOUNT (SIGN UP) TAB ══════════════ */
              <View>
                <Text
                  {...textProps}
                  style={[
                    getTextStyle('sm', { isHighContrast }),
                    { color: palette.textMuted, marginBottom: 16, lineHeight: 20 },
                  ]}
                >
                  Sign up for UnityMap to report urban accessibility obstacles and receive tailored step-free routes.
                </Text>

                {/* First Name & Last Name */}
                <View style={styles.nameRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text
                      {...textProps}
                      style={[styles.inputLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textSecondary }]}
                    >
                      FIRST NAME *
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth },
                      ]}
                    >
                      <TextInput
                        style={[styles.textInput, { color: palette.textPrimary }]}
                        placeholder="e.g. Kasun"
                        placeholderTextColor={palette.placeholder}
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                        accessibilityLabel="First name input"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text
                      {...textProps}
                      style={[styles.inputLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textSecondary }]}
                    >
                      LAST NAME
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth },
                      ]}
                    >
                      <TextInput
                        style={[styles.textInput, { color: palette.textPrimary }]}
                        placeholder="e.g. Silva"
                        placeholderTextColor={palette.placeholder}
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                        accessibilityLabel="Last name input"
                      />
                    </View>
                  </View>
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text
                    {...textProps}
                    style={[styles.inputLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textSecondary }]}
                  >
                    EMAIL ADDRESS *
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth },
                    ]}
                  >
                    <Feather name="mail" size={18} color={palette.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: palette.textPrimary }]}
                      placeholder="e.g. kasun@example.com"
                      placeholderTextColor={palette.placeholder}
                      value={registerEmail}
                      onChangeText={setRegisterEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      accessibilityLabel="Email input for registration"
                    />
                  </View>
                </View>

                {/* Phone Number */}
                <View style={styles.inputGroup}>
                  <Text
                    {...textProps}
                    style={[styles.inputLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textSecondary }]}
                  >
                    PHONE NUMBER
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth },
                    ]}
                  >
                    <Feather name="phone" size={18} color={palette.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: palette.textPrimary }]}
                      placeholder="e.g. 077 123 4567"
                      placeholderTextColor={palette.placeholder}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      accessibilityLabel="Phone number input"
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text
                    {...textProps}
                    style={[styles.inputLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textSecondary }]}
                  >
                    CREATE PASSWORD (MIN 6 CHARACTERS) *
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth },
                    ]}
                  >
                    <Feather name="lock" size={18} color={palette.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: palette.textPrimary, flex: 1 }]}
                      placeholder="Enter secure password"
                      placeholderTextColor={palette.placeholder}
                      value={registerPassword}
                      onChangeText={setRegisterPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Password creation input"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.eyeButton}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={palette.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Register Action Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: palette.primary,
                      borderColor: isHighContrast ? '#000000' : palette.primary,
                      borderWidth: isHighContrast ? borderWidth : 0,
                    },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Create account button"
                >
                  {isLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.buttonText}>Creating Account...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContentRow}>
                      <Text style={styles.buttonText}>Create Account & Enter Map</Text>
                      <Feather name="check" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Bottom Switch Link */}
                <View style={styles.switchModeRow}>
                  <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => setAuthMode('login')}>
                    <Text
                      {...textProps}
                      style={[getTextStyle('sm', { isHighContrast }), { color: palette.primary, fontWeight: '700' }]}
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerBanner: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#A7F3D0',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillBadgeText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  formCard: {
    marginHorizontal: 18,
    marginTop: -12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  demoSection: {
    marginBottom: 18,
  },
  demoSectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 52,
  },
  chipIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  eyeButton: {
    padding: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    minHeight: 50,
    marginTop: 8,
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  switchModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 4,
  },
});

export default LoginScreen;
