import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getTextStyle, textProps } from '../theme/typography';

/**
 * Input — SPT-005: 48dp, high-contrast, scalable type.
 */
export const Input = ({ label, value, onChangeText, placeholder, secureTextEntry, error, accessibilityLabel }) => {
  const { isHighContrast, palette, borderWidth } = useTheme();
  return (
    <View style={styles.container}>
      {label && (
        <Text {...textProps} style={[styles.label, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: error ? palette.error : palette.border,
            borderWidth,
            color: palette.textPrimary,
          },
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.placeholder}
        secureTextEntry={secureTextEntry}
        accessible
        accessibilityLabel={accessibilityLabel || label || placeholder}
        accessibilityState={{}}
        {...textProps}
      />
      {error && (
        <Text {...textProps} style={[styles.errorText, getTextStyle('xs', { isHighContrast }), { color: palette.error }]}>
          {error}
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
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {},
  errorText: {
    marginTop: 4,
    fontWeight: '600',
  },
});

export default Input;
