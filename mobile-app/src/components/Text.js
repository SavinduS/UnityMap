import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * SPT-005: Accessible Text wrapper
 * Enforces allowFontScaling + maxFontSizeMultiplier and variant scale.
 * Props: variant='body'|'bodySmall'|'label'|'badge'|'caption'|'h1'|'h2'|'h3', color override, style
 */
export const Text = ({ variant = 'body', children, style, color, maxFontSizeMultiplier, allowFontScaling = true, ...props }) => {
  const { isHighContrast, colors, typography } = useTheme();
  const preset = typography.variants[variant] || typography.variants.body;

  const multiplier =
    maxFontSizeMultiplier ??
    (variant === 'badge' || variant === 'caption' ? typography.maxFontSizeMultiplier.badge
      : variant === 'h1' || variant === 'h2' || variant === 'h3' ? typography.maxFontSizeMultiplier.heading
      : typography.maxFontSizeMultiplier.body);

  // High-contrast forces stronger weight for small text readability
  const hcAdjust = isHighContrast && (variant === 'badge' || variant === 'caption' || variant === 'label') ? { fontWeight: '700' } : null;

  const defaultColor = variant === 'badge' ? colors.textMuted : colors.textPrimary;

  return (
    <RNText
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={multiplier}
      style={[preset, { color: color || defaultColor }, hcAdjust, style]}
      {...props}
    >
      {children}
    </RNText>
  );
};

export default Text;
