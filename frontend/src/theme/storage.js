import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_CONTRAST_KEY = '@unitymap/highContrast';
const WHEELCHAIR_ACCESSIBLE_KEY = '@unitymap/wheelchairAccessible';
const RECENT_SEARCHES_KEY = '@unitymap/recentSearches';
const VOLUNTEER_DRAFT_KEY = '@unitymap/volunteerDraft';
const AUDIO_LAUNCHER_KEY = '@unitymap/audioLauncherEnabled';

export const loadHighContrast = async () => {
  try {
    const v = await AsyncStorage.getItem(HIGH_CONTRAST_KEY);
    return v === 'true';
  } catch {
    return false;
  }
};

export const saveHighContrast = async (value) => {
  try {
    await AsyncStorage.setItem(HIGH_CONTRAST_KEY, value ? 'true' : 'false');
  } catch {}
};

export const loadWheelchairAccessible = async () => {
  try {
    const v = await AsyncStorage.getItem(WHEELCHAIR_ACCESSIBLE_KEY);
    return v !== null ? v === 'true' : true;
  } catch {
    return true;
  }
};

export const saveWheelchairAccessible = async (value) => {
  try {
    await AsyncStorage.setItem(WHEELCHAIR_ACCESSIBLE_KEY, value ? 'true' : 'false');
  } catch {}
};

export const loadRecentSearches = async () => {
  try {
    const v = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
};

export const saveRecentSearches = async (searches) => {
  try {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {}
};

/**
 * Volunteer draft shape for SPT-109 3-tap audit form:
 * { imageUri, exifResult, category, rating, notes, updatedAt }
 * Backward compatible with legacy drafts that only had { imageUri, exifResult, updatedAt }
 */
export const loadVolunteerDraft = async () => {
  try {
    const v = await AsyncStorage.getItem(VOLUNTEER_DRAFT_KEY);
    if (!v) return null;
    const parsed = JSON.parse(v);
    if (!parsed || typeof parsed !== 'object') return null;
    // Normalize for backward compatibility – older drafts lack category/rating/notes
    return {
      imageUri: parsed.imageUri ?? null,
      exifResult: parsed.exifResult ?? null,
      category: parsed.category ?? null,
      rating: parsed.rating ?? null,
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return null;
  }
};

export const saveVolunteerDraft = async (draft) => {
  try {
    if (!draft || typeof draft !== 'object') return;
    const normalized = {
      imageUri: draft.imageUri ?? null,
      exifResult: draft.exifResult ?? null,
      category: draft.category ?? null,
      rating: draft.rating ?? null,
      notes: typeof draft.notes === 'string' ? draft.notes : '',
      updatedAt: draft.updatedAt || new Date().toISOString(),
    };
    // Preserve exifResult sub-shape if already stringified日期; keep as-is
    await AsyncStorage.setItem(VOLUNTEER_DRAFT_KEY, JSON.stringify(normalized));
  } catch {}
};

export const clearVolunteerDraft = async () => {
  try {
    await AsyncStorage.removeItem(VOLUNTEER_DRAFT_KEY);
  } catch {}
};

export const loadAudioLauncherEnabled = async () => {
  try {
    const v = await AsyncStorage.getItem(AUDIO_LAUNCHER_KEY);
    return v !== null ? v === 'true' : false;
  } catch {
    return false;
  }
};

export const saveAudioLauncherEnabled = async (value) => {
  try {
    await AsyncStorage.setItem(AUDIO_LAUNCHER_KEY, value ? 'true' : 'false');
  } catch {}
};

const PREFERRED_STT_LOCALE_KEY = '@unitymap/preferredSTTLocale';

export const loadPreferredSTTLocale = async () => {
  try {
    const v = await AsyncStorage.getItem(PREFERRED_STT_LOCALE_KEY);
    return v || 'en';
  } catch {
    return 'en';
  }
};

export const savePreferredSTTLocale = async (locale) => {
  try {
    await AsyncStorage.setItem(PREFERRED_STT_LOCALE_KEY, locale);
  } catch {}
};

export default {
  loadHighContrast,
  saveHighContrast,
  loadWheelchairAccessible,
  saveWheelchairAccessible,
  loadRecentSearches,
  saveRecentSearches,
  loadVolunteerDraft,
  saveVolunteerDraft,
  clearVolunteerDraft,
  loadAudioLauncherEnabled,
  saveAudioLauncherEnabled,
  loadPreferredSTTLocale,
  savePreferredSTTLocale,
};

