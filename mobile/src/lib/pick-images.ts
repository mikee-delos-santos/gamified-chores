// Pick or capture images from the device/browser. Photo-only (ADR 0002). Returns local URIs
// suitable for upload (see uploadHowToPhotos / uploadProofPhoto in api.ts).
//
// Two sources: the gallery (pickImages) and the camera (capturePhoto). The UI lets the user
// choose between them via usePhotoSource — see components/ui/photo-source-sheet.tsx.

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function pickImages(multiple = true): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    quality: 0.7,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => a.uri);
}

// Capture a single photo with the device camera. On web/PWA this opens the browser's
// camera-capable file input directly (no separate permission prompt). On native we ask for
// camera permission first. The permission request is skipped on web so the file-input click
// stays inside the tap's user-gesture context (browsers block camera inputs otherwise).
export async function capturePhoto(): Promise<string[]> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return [];
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => a.uri);
}
