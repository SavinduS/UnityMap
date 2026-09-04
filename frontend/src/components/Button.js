import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getTextStyle, textProps } from '../theme/typography';

/**
 * Primary action button — SPT-005: 48dp, high-contrast, a11y.
 */
export const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  style,
  textStyle,
}) => {
  const { isHighContrast, palette, borderWidth } = useTheme();
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: isSecondary ? palette.secondaryBg : palette.primary,
          borderColor: isSecondary ? palette.secondaryBorder : isHighContrast ? '#000000' : palette.primary,
          borderWidth: isSecondary || isHighContrast ? borderWidth : 0,
          opacity: disabled ? 0.5 : 1,
        },
        isSecondary ? styles.secondaryButton : styles.primaryButton,
        style,
      ]}
    >
      <Text
        {...textProps}
        style={[
          styles.text,
          getTextStyle('base', { isHighContrast }),
          isSecondary ? { color: palette.secondaryText } : { color: palette.primaryText },
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
    minHeight: 48,
    minWidth: 48,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {},
  secondaryButton: {},
  text: {
    textAlign: 'center',
  },
  primaryText: {},
  secondaryText: {},
});

export default Button;
