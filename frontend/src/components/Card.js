import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, elevation } from '../theme/tokens';

/**
 * Card — SPT-005 / SPT-103:
 * Accessible card container with support for high-contrast border (2px),
 * selectable states, touch interactions, and custom elevation tokens.
 */
export const Card = ({
  children,
  style,
  onPress,
  selected = false,
  selectedBorderColor = '#2E8B57',
  accessible = true,
  accessibilityRole = onPress ? 'button' : 'summary',
  accessibilityLabel,
  accessibilityState,
  ...props
}) => {
  const { isHighContrast, palette, borderWidth } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: palette.surface,
      borderColor: selected
        ? isHighContrast
          ? '#000000'
          : selectedBorderColor
        : palette.cardBorder,
      borderWidth: selected ? Math.max(2, borderWidth) : borderWidth,
      ...(isHighContrast ? elevation.cardHighContrast : elevation.card),
    },
    selected && {
      shadowColor: selectedBorderColor,
      shadowOpacity: isHighContrast ? 0 : 0.25,
      shadowRadius: 10,
    },
    style,
  ];

  if (typeof onPress === 'function') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessible={accessible}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected, ...accessibilityState }}
        style={cardStyle}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
      {...props}
    >
      {children}
    </View>
  );
};

/**
 * StatusBadge helper component for accessibility / incline / elevator status display.
 */
export const StatusBadge = ({
  icon,
  label,
  color = '#2E8B57',
  bg = '#143823',
  borderColor = '#2E8B57',
  textColor = '#E8F5E9',
  style,
  textStyle,
}) => {
  const { isHighContrast } = useTheme();

  return (
    <View
      accessible={true}
      accessibilityLabel={label}
      style={[
        styles.badge,
        {
          backgroundColor: isHighContrast ? '#000000' : bg,
          borderColor: isHighContrast ? '#FFFFFF' : borderColor,
          borderWidth: isHighContrast ? 2 : 1,
        },
        style,
      ]}
    >
      {icon && <View style={styles.badgeIcon}>{icon}</View>}
      <Text
        style={[
          styles.badgeText,
          { color: isHighContrast ? '#FFFFFF' : textColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl, // 16px
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default Card;
