// Web Push enrollment (web/PWA only). Native builds no-op — Expo/native push would use a
// different path, and the app is PWA-first. See ADR 0002.
//
// Flow: ask permission (must be from a user tap on iOS) -> subscribe via the service worker
// with the VAPID public key -> send the subscription to the backend, which stores it per family.

import { Platform } from 'react-native';

import { apiFetch, API_URL } from './api';
import { getBoundKid } from './device-session';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'no-key' | 'error'; detail?: string };

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function isPushSupported(): boolean {
  return (
    isWeb() &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// Already subscribed on this device?
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}

export async function enableNotifications(): Promise<EnableResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no-key' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // On a kid device, tag the subscription with the bound kid so a chore assigned to that kid
    // notifies only them (plus parents). Admin devices have no bound kid and stay untagged.
    const bound = await getBoundKid();
    await apiFetch('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: sub.toJSON(),
        ...(bound ? { child_profile_id: bound.id } : {}),
      }),
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'error', detail: err instanceof Error ? err.message : String(err) };
  }
}

// Admin-only: fire a family-wide test notification. Returns the server's count, or throws.
export async function sendTestNotification(token: string): Promise<number> {
  const res = await apiFetch('/push/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as { sent_to?: number };
  return body.sent_to ?? 0;
}

export { API_URL };

// VAPID keys are base64url; PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
