import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_DATA: '@ai_readsmart_user',
  PREFERENCES: '@ai_readsmart_prefs',
};

export const storage = {
  async saveUser(user) {
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
  },

  async getUser() {
    const data = await AsyncStorage.getItem(KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  async savePreferences(prefs) {
    await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
  },

  async getPreferences() {
    const data = await AsyncStorage.getItem(KEYS.PREFERENCES);
    return data ? JSON.parse(data) : null;
  },

  async clearAll() {
    await AsyncStorage.multiRemove([KEYS.USER_DATA, KEYS.PREFERENCES]);
  },
};