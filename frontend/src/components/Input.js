import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getTextStyle, textProps } from '../theme/typography';
import { spacing, radius, elevation } from '../theme/tokens';

/**
 * Input — SPT-005 / SPT-101: 48dp, high-contrast, scalable type, clear action, auto-suggest.
 */
export const Input = ({
  label,
  value,
  onChangeText,
  onClear,
  placeholder,
  secureTextEntry,
  error,
  accessibilityLabel,
  clearAccessibilityLabel = 'Clear input',
  showClear = true,
  leftIcon,
  rightIcon,
  suggestions = [],
  onSelectSuggestion,
  showSuggestions = false,
  containerStyle,
  style,
  inputStyle,
  suggestionsContainerStyle,
}) => {
  const { isHighContrast, palette, borderWidth } = useTheme();

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChangeText) {
      onChangeText('');
    }
  };

  const hasClearButton = showClear && !!value && (onClear || onChangeText);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text {...textProps} style={[styles.label, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: palette.surface,
            borderColor: error ? palette.error : palette.border,
            borderWidth,
          },
          style,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: palette.textPrimary,
            },
            leftIcon ? { paddingLeft: 0 } : null,
            (hasClearButton || rightIcon) ? { paddingRight: 8 } : null,
            inputStyle,
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

        {hasClearButton && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel={clearAccessibilityLabel}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View
              style={[
                styles.clearIconCircle,
                {
                  backgroundColor: isHighContrast ? palette.surfaceAlt : palette.secondaryBg,
                  borderColor: palette.border,
                  borderWidth: isHighContrast ? borderWidth : 0,
                },
              ]}
            >
              <Feather
                name="x"
                size={14}
                color={isHighContrast ? palette.textPrimary : palette.textMuted}
              />
            </View>
          </TouchableOpacity>
        )}

        {rightIcon && !hasClearButton && (
          <View style={styles.rightIconContainer}>{rightIcon}</View>
        )}
      </View>

      {error && (
        <Text {...textProps} style={[styles.errorText, getTextStyle('xs', { isHighContrast }), { color: palette.error }]}>
          {error}
        </Text>
      )}

      {/* Auto-suggest dropdown container styled with tokens */}
      {(showSuggestions || (suggestions && suggestions.length > 0 && !!value)) && suggestions.length > 0 && (
        <View
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
              borderWidth,
            },
            isHighContrast ? elevation.cardHighContrast : elevation.card,
            suggestionsContainerStyle,
          ]}
        >
          {suggestions.map((item, idx) => {
            const itemLabel = typeof item === 'string' ? item : item.title || item.name || item.label || '';
            const itemSub = typeof item === 'object' ? item.subtitle || item.desc || item.address : null;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.suggestionItem,
                  {
                    borderBottomColor: palette.border,
                    borderBottomWidth: idx < suggestions.length - 1 ? 1 : 0,
                  },
                ]}
                onPress={() => onSelectSuggestion && onSelectSuggestion(item)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Select suggestion: ${itemLabel}`}
                activeOpacity={0.7}
              >
                <Feather
                  name="map-pin"
                  size={16}
                  color={palette.primary}
                  style={styles.suggestionIcon}
                />
                <View style={styles.suggestionTextContainer}>
                  <Text
                    {...textProps}
                    style={[
                      styles.suggestionText,
                      getTextStyle('sm', { isHighContrast }),
                      { color: palette.textPrimary },
                    ]}
                  >
                    {itemLabel}
                  </Text>
                  {itemSub && (
                    <Text
                      {...textProps}
                      style={[
                        styles.suggestionSubtext,
                        getTextStyle('xs', { isHighContrast }),
                        { color: palette.textMuted },
                      ]}
                    >
                      {itemSub}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    width: '100%',
    position: 'relative',
    zIndex: 10,
  },
  label: {
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  leftIconContainer: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIconCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputError: {},
  errorText: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  suggestionsContainer: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  suggestionItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  suggestionIcon: {
    marginRight: spacing.md,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontWeight: '600',
  },
  suggestionSubtext: {
    marginTop: 2,
  },
});

export default Input;

