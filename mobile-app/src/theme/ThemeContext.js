import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Appearance, AccessibilityInfo } from 'react-native';
import { palette, spacing, radii, touch, shadows } from './tokens';
import { fontSize, lineHeight, fontWeight, maxFontSizeMultiplier, variants } from './typography';

const ThemeContext = createContext(null);

/**
 * Provides { mode, isHighContrast, colors, spacing, radii, touch, shadows, typography, toggleMode }
 */
export const ThemeProvider = ({ children, initialMode = 'light' }) => {
  const [mode, setMode] = useState(initialMode);
  const isHighContrast = mode === 'highContrast';

  // Sync with system high-contrast / colorScheme where available
  useEffect(() => {
    let mounted = true;

    // Try to read system high-contrast (Android) / reduceMotion as proxy is not needed
    const checkHighContrast = async () => {
      try {
        // AccessibilityInfo.isHighTextContrastEnabled is experimental; fallback gracefully
        if (AccessibilityInfo.isHighTextContrastEnabled) {
          const enabled = await AccessibilityInfo.isHighTextContrastEnabled();
          if (mounted && enabled) setMode('highContrast');
        } else if (AccessibilityInfo.isHighContrastEnabled) {
          const enabled = await AccessibilityInfo.isHighContrastEnabled();
          if (mounted && enabled) setMode('highContrast');
        }
      } catch {
        // ignore — manual toggle still works
      }
    };
    checkHighContrast();

    const sub1 = Appearance.addChangeListener(() => {
      // No auto-switch on colorScheme alone; highContrast is explicit per WCAG
    });

    // Listen for highContrast changes if API exists
    let sub2 = null;
    if (AccessibilityInfo.addEventListener) {
      try {
        sub2 = AccessibilityInfo.addEventListener('highTextContrastChanged', (enabled) => {
          if (enabled) setMode('highContrast');
        });
      } catch {
        // not supported on this RN version
      }
    }

    return () => {
      mounted = false;
      sub1?.remove?.();
      sub2?.remove?.();
    };
  }, []);

  const toggleMode = () => setMode((m) => (m === 'light' ? 'highContrast' : 'light'));

  const colors = isHighContrast ? palette.highContrast : palette.light;
  const shadowSet = isHighContrast ? shadows.highContrast : shadows.light;

  const value = useMemo(
    () => ({
      mode,
      isHighContrast,
      colors,
      spacing,
      radii,
      touch,
      shadows: shadowSet,
      typography: { fontSize, lineHeight, fontWeight, maxFontSizeMultiplier, variants },
      toggleMode,
      setMode,
    }),
    [mode, isHighContrast, colors, shadowSet]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;
