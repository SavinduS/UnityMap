import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Card — SPT-005: high-contrast border 2px, no shadow in hc.
 */
export const Card = ({ children, style, accessible = false }) => {
  const { isHighContrast, palette, borderWidth } = useTheme();
  return (
    <View
      accessible={accessible}
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.cardBorder,
          borderWidth,
          ...(isHighContrast ? { shadowOpacity: 0, elevation: 0 } : null),
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
});

export default Card;
