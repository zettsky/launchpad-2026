import { Platform, Share } from 'react-native';

// React Native Web doesn't implement the Share API; fall back to the clipboard there
// instead of letting the call throw.
export async function shareText(message) {
  if (Platform.OS === 'web') {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      return { copiedToClipboard: true };
    }
    return { copiedToClipboard: false };
  }
  return Share.share({ message });
}
