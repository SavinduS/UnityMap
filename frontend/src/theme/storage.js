import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@unitymap/highContrast';

export const loadHighContrast = async () => {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'true';
  } catch {
    return false;
  }
};

export const saveHighContrast = async (value) => {
  try {
    await AsyncStorage.setItem(KEY, value ? 'true' : 'false');
  } catch {}
};

export default { loadHighContrast, saveHighContrast };
