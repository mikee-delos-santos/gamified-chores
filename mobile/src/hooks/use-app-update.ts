import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// The build id baked into this bundle at export time (see scripts/gen-build-id.js). Empty in dev
// (no export), which disables the whole check.
const BUILD_ID = process.env.EXPO_PUBLIC_BUILD_ID ?? '';
const POLL_MS = 5 * 60 * 1000;

// Web/PWA only: detect when a newer build has been deployed while this tab stayed open.
//
// The service worker is network-first + skipWaiting, so a reload always lands on fresh code; the
// gap is a tab that never reloads. We poll the same-origin version.json (written at build time)
// and, when its buildId differs from the one baked into the running bundle, expose updateReady so
// the UI can prompt a refresh. We never reload on our own — a kid could be mid proof upload.
export function useAppUpdate(): { updateReady: boolean; reload: () => void; dismiss: () => void } {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const dismissed = useRef<Set<string>>(new Set());

  const enabled = Platform.OS === 'web' && !!BUILD_ID;

  const check = useCallback(async () => {
    if (!enabled) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      const res = await fetch('/version.json', { cache: 'no-store' });
      if (!res.ok) return;
      const { buildId } = (await res.json()) as { buildId?: string };
      if (buildId && buildId !== BUILD_ID && !dismissed.current.has(buildId)) {
        setPendingId(buildId);
      }
    } catch {
      // Offline, or version.json not deployed yet: ignore and try again next tick.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    check();
    const interval = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [enabled, check]);

  const reload = useCallback(() => {
    if (typeof window !== 'undefined') window.location.reload();
  }, []);

  // Hide the prompt for this specific new build; a later deploy re-prompts.
  const dismiss = useCallback(() => {
    if (pendingId) dismissed.current.add(pendingId);
    setPendingId(null);
  }, [pendingId]);

  return { updateReady: pendingId != null, reload, dismiss };
}
