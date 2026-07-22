import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'launchpad_device_id';

function generateId() {
  return `device-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function getDeviceId() {
  let id = await AsyncStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateId();
    await AsyncStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
