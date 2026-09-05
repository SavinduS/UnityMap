import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_CONTRAST_KEY = '@unitymap/highContrast';
const WHEELCHAIR_ACCESSIBLE_KEY = '@unitymap/wheelchairAccessible';
const RECENT_SEARCHES_KEY = '@unitymap/recentSearches';

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

export default {
  loadHighContrast,
  saveHighContrast,
  loadWheelchairAccessible,
  saveWheelchairAccessible,
  loadRecentSearches,
  saveRecentSearches,
};

