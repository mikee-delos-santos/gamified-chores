// Platform-aware token storage. Native uses expo-secure-store (Keychain / Keystore);
// web uses localStorage, since SecureStore has no web implementation and throws there.
//
// The app is device-bound and family-only, and only the admin area holds a token, so
// localStorage on web is an acceptable place to keep the JWT. The async interface matches
// SecureStore so callers stay platform-agnostic.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function getToken(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setToken(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteToken(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
