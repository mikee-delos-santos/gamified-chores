import { useEffect } from 'react';
import { Stack } from 'expo-router';

import { resubscribeIfEnabled } from '@/lib/push';
import { useRefreshOnPush } from '@/hooks/use-refresh-on-push';

// The kid area is open (no login), so this is a plain stack with no guard.
export default function KidLayout() {
  // Hard-refresh the kid's screen whenever a chore-update push lands (web/PWA only).
  useRefreshOnPush();

  // Re-tag the push subscription with this kid's profile on mount, in case the device
  // enrolled before targeted push was available or needs to refresh its tag.
  useEffect(() => {
    resubscribeIfEnabled();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
