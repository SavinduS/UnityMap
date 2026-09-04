import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Standard text input field with accessibility support.
 * SPT-005: 48dp minHeight, high-contrast border 2px, placeholder 5.7:1, error not color-only.
 */
export const Input = ({ label, value, onChangeText, placeholder, secureTextEntry, error, accessibilityHint }) => {
  const { colors, radii, isHighContrast } = useTheme();
  const hasError = !!error;
  const inputId = label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  return (
    <View style={styles.container}>
      {label && (
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          style={[styles.label, { color: colors.textSecondary }]}
          nativeID={inputId ? `${inputId}-label` : undefined}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            minHeight: 48,
            backgroundColor: colors.surface,
            borderColor: hasError ? colors.error : colors.borderDefault,
            borderWidth: isHighContrast ? 2 : 1,
            borderRadius: radii.md,
            color: colors.textPrimary,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        secureTextEntry={secureTextEntry}
        accessibilityLabel={label || placeholder}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ invalid: hasError }}
        accessibilityInvalid={hasError}
        allowFontScaling
      />
      {hasError && (
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          style={[styles.errorText, { color: colors.error }]}
          accessibilityLiveRegion="polite"
        >
          ⚠ {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default Input;
