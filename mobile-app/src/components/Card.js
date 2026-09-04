import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Card container component for structured UI items.
 * SPT-005: theme-aware background/border with high-contrast support.
 */
export const Card = ({ children, style }) => {
  const { colors, radii, shadows, isHighContrast } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderDefault,
          borderRadius: radii.xl,
          borderWidth: isHighContrast ? 2 : 1,
          ...(isHighContrast ? shadows.card : shadows.card),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 8,
  },
});

export default Card;
