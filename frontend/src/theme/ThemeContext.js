import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { getPalette, getBorderWidth, palettes } from './tokens';
import { loadHighContrast, saveHighContrast } from './storage';

const ThemeContext = createContext({
  isHighContrast: false,
  setHighContrast: () => {},
  toggleHighContrast: () => {},
  palette: palettes.light,
  borderWidth: 1,
  isScreenReaderEnabled: false,
  setIsScreenReaderEnabled: () => {},
  toggleScreenReader: () => {},
  isReduceMotionEnabled: false,
  setIsReduceMotionEnabled: () => {},
  toggleReduceMotion: () => {},
  screenReaderName: Platform.select({ android: 'TalkBack', ios: 'VoiceOver', default: 'Screen Reader' }),
  announce: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    loadHighContrast().then(setIsHighContrast);
  }, []);

  // Detect TalkBack / VoiceOver on launch and subscribe to OS changes
  useEffect(() => {
    let srSubscription;
    let rmSubscription;

    AccessibilityInfo.isScreenReaderEnabled()
      .then(setIsScreenReaderEnabled)
      .catch(() => {});

    if (AccessibilityInfo.isReduceMotionEnabled) {
      AccessibilityInfo.isReduceMotionEnabled()
        .then(setIsReduceMotionEnabled)
        .catch(() => {});
    }

    try {
      srSubscription = AccessibilityInfo.addEventListener('change', setIsScreenReaderEnabled);
    } catch (e) {
      try {
        // Legacy fallback for older RN
        AccessibilityInfo.addEventListener('screenReaderChanged', setIsScreenReaderEnabled);
      } catch (_) {}
    }

    try {
      if (AccessibilityInfo.addEventListener) {
        rmSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReduceMotionEnabled);
      }
    } catch (_) {}

    return () => {
      try {
        srSubscription?.remove?.();
      } catch (_) {
        try {
          AccessibilityInfo.removeEventListener('change', setIsScreenReaderEnabled);
        } catch (_) {}
      }
      try {
        rmSubscription?.remove?.();
      } catch (_) {
        try {
          AccessibilityInfo.removeEventListener('reduceMotionChanged', setIsReduceMotionEnabled);
        } catch (_) {}
      }
    };
  }, []);

  const setHighContrast = useCallback((value) => {
    setIsHighContrast(value);
    saveHighContrast(value);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setIsHighContrast((prev) => {
      const next = !prev;
      saveHighContrast(next);
      return next;
    });
  }, []);

  const setIsScreenReaderEnabledCb = useCallback((value) => {
    setIsScreenReaderEnabled(value);
  }, []);

  const toggleScreenReader = useCallback(() => {
    setIsScreenReaderEnabled((prev) => !prev);
  }, []);

  const setIsReduceMotionEnabledCb = useCallback((value) => {
    setIsReduceMotionEnabled(value);
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setIsReduceMotionEnabled((prev) => !prev);
  }, []);

  const announce = useCallback((message) => {
    if (!message) return;
    try {
      AccessibilityInfo.announceForAccessibility(message);
    } catch (_) {}
  }, []);

  const screenReaderName = useMemo(
    () => Platform.select({ android: 'TalkBack', ios: 'VoiceOver', default: 'Screen Reader' }),
    []
  );

  const value = useMemo(
    () => ({
      isHighContrast,
      setHighContrast,
      toggleHighContrast,
      palette: getPalette(isHighContrast),
      borderWidth: getBorderWidth(isHighContrast),
      isScreenReaderEnabled,
      setIsScreenReaderEnabled: setIsScreenReaderEnabledCb,
      toggleScreenReader,
      isReduceMotionEnabled,
      setIsReduceMotionEnabled: setIsReduceMotionEnabledCb,
      toggleReduceMotion,
      screenReaderName,
      announce,
    }),
    [
      isHighContrast,
      setHighContrast,
      toggleHighContrast,
      isScreenReaderEnabled,
      setIsScreenReaderEnabledCb,
      toggleScreenReader,
      isReduceMotionEnabled,
      setIsReduceMotionEnabledCb,
      toggleReduceMotion,
      screenReaderName,
      announce,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
