/**
 * SPT-005: Accessible Typography Scale
 * All sizes respect Dynamic Type via allowFontScaling + maxFontSizeMultiplier.
 * Minimum body 14px, lineHeight 1.5 for WCAG 1.4.12.
 */

export const fontSize = {
  xs: 12, // badges/metadata only, not body
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 22,
  '3xl': 28,
};

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.6,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const maxFontSizeMultiplier = {
  badge: 1.3, // small text caps to avoid overflow
  body: 1.5,  // body scales up to 150%
  heading: 1.4,
};

// Variant presets for <Text> component
export const variants = {
  h1: { fontSize: fontSize['3xl'], lineHeight: lineHeight.tight, fontWeight: fontWeight.bold },
  h2: { fontSize: fontSize['2xl'], lineHeight: lineHeight.tight, fontWeight: fontWeight.bold },
  h3: { fontSize: fontSize.xl, lineHeight: lineHeight.tight, fontWeight: fontWeight.bold },
  body: { fontSize: fontSize.base, lineHeight: lineHeight.normal, fontWeight: fontWeight.regular },
  bodySmall: { fontSize: fontSize.sm, lineHeight: lineHeight.normal, fontWeight: fontWeight.regular },
  label: { fontSize: fontSize.sm, lineHeight: lineHeight.normal, fontWeight: fontWeight.medium },
  badge: { fontSize: fontSize.xs, lineHeight: lineHeight.normal, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
  caption: { fontSize: fontSize.sm, lineHeight: lineHeight.normal, fontWeight: fontWeight.regular },
};

export default { fontSize, lineHeight, fontWeight, maxFontSizeMultiplier, variants };
