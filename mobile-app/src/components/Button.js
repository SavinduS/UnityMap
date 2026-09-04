import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { HIT_SLOP_48, getA11yProps } from '../theme/a11y';

/**
 * Primary action button component for UnityMap design system.
 * SPT-005: enforces 48dp min touch target, high-contrast support, and a11y roles.
 */
export const Button = ({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  disabled,
}) => {
  const { colors, isHighContrast, radii, shadows } = useTheme();
  const isSecondary = variant === 'secondary';

  const a11yProps = getA11yProps('button', {
    label: accessibilityLabel || title,
    hint: accessibilityHint,
    disabled,
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP_48}
      activeOpacity={0.8}
      {...a11yProps}
      style={[
        styles.button,
        {
          minHeight: 48,
          minWidth: 48,
          borderRadius: radii.lg,
          backgroundColor: isSecondary ? colors.surface : colors.primaryBg,
          borderColor: isSecondary ? colors.borderDefault : colors.primaryBorder,
          borderWidth: isHighContrast ? 2 : isSecondary ? 1 : 0,
          ...(isHighContrast ? shadows.card : shadows.card),
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.4}
        style={[
          styles.text,
          { color: isSecondary ? colors.textPrimary : colors.primaryFg },
          isHighContrast && { fontWeight: '700' },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Button;
