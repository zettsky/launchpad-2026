import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'launchpad_active_session';

export async function getStoredSession() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setStoredSession(session) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}