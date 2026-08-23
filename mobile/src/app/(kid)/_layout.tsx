import { Stack } from 'expo-router';

import { useRefreshOnPush } from '@/hooks/use-refresh-on-push';

// The kid area is open (no login), so this is a plain stack with no guard.
export default function KidLayout() {
  // Hard-refresh the kid's screen whenever a chore-update push lands (web/PWA only).
  useRefreshOnPush();
  return <Stack screenOptions={{ headerShown: false }} />;
}
