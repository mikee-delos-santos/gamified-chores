import { useEffect } from 'react';
import { Platform } from 'react-native';

// Web/PWA only: the service worker relays every chore-update push to open tabs (see public/sw.js).
// When one arrives, hard-refresh the page so the kid always sees the latest chores and balance
// without having to pull to refresh. No-op on native and where the service worker API is absent.
export function useRefreshOnPush() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'chore-update') {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);
}
