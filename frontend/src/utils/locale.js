export const LOCALE_BCP47 = {
  en: 'en-US',
  si: 'si-LK',
  ta: 'ta-LK',
};

export const SPEECH_LANG_FALLBACK = {
  'si-LK': 'en-US',
  'ta-LK': 'ta-IN',
};

export const mapLocaleToBCP47 = (locale) => LOCALE_BCP47[locale] || locale || 'en-US';

export const getAvailableLocales = () => [
  { code: 'en', label: 'English', bcp47: 'en-US' },
  { code: 'si', label: 'Sinhala', bcp47: 'si-LK' },
  { code: 'ta', label: 'Tamil', bcp47: 'ta-LK' },
];
