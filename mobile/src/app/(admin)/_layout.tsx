import { Redirect, Stack, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useRefreshOnPush } from '@/hooks/use-refresh-on-push';
import { ReviewQueueProvider } from '@/hooks/review-queue-context';
import { BoundKid, getBoundKid } from '@/lib/device-session';
import { useSession } from '@/lib/session';
import { Color } from '@/theme/tokens';

// Guards the admin group. While the boot-time token check runs we show a spinner so the
// login screen never flashes for an already-signed-in admin. A signed-out admin is bounced to
// login — except when already on login, which would otherwise loop.
//
// On web the (admin) / (kid) route groups are hidden from the URL, so a kid's dashboard URL
// (e.g. /chores) is identical to the admin one and a hard refresh resolves the bare path into
// this admin group. Without the bound-kid check below, that signed-out kid device would be
// bounced to the grown-up login screen. So: on a session-less device that is bound to a kid,
// send it back to the kid dashboard instead of login. The "I'm a grown-up" button routes
// straight to /(admin)/login (onLogin) so a grown-up can still sign in on a kid-bound device.
export default function AdminLayout() {
  const { status } = useSession();
  const segments = useSegments();
  const onLogin = segments[segments.length - 1] === 'login';

  const [boundKid, setBoundKid] = useState<BoundKid | null>(null);
  const [checkedBound, setCheckedBound] = useState(false);

  useEffect(() => {
    (async () => {
      setBoundKid(await getBoundKid());
      setCheckedBound(true);
    })();
  }, []);

  // Hard-refresh the admin screen when a chore-update push lands (a kid finished/uploaded, a
  // cash-out came in), so the grown-up's lists are never stale. Web/PWA only.
  useRefreshOnPush();

  // Wait for both the token check and the bound-kid read before deciding where a signed-out
  // device goes, so we never flash login on a kid-bound device. The login screen itself does
  // not need the bound-kid read.
  if (status === 'loading' || (status === 'signedOut' && !onLogin && !checkedBound)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Color.appBg }}>
        <ActivityIndicator color={Color.primary} />
      </View>
    );
  }

  if (status === 'signedOut' && !onLogin) {
    if (boundKid) return <Redirect href="/(kid)/(tabs)/chores" />;
    return <Redirect href="/(admin)/login" />;
  }

  return (
    <ReviewQueueProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ReviewQueueProvider>
  );
}
