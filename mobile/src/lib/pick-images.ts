// Pick one or more images from the device/browser. Photo-only (ADR 0002). Returns local URIs
// suitable for upload (see uploadHowToPhotos / uploadProofPhoto in api.ts).

import * as ImagePicker from 'expo-image-picker';

export async function pickImages(multiple = true): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    quality: 0.7,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => a.uri);
}
