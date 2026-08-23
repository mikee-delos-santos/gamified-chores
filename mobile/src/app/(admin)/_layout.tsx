import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useRefreshOnPush } from '@/hooks/use-refresh-on-push';
import { useSession } from '@/lib/session';
import { Color } from '@/theme/tokens';

// Guards the admin group. While the boot-time token check runs we show a spinner so the
// login screen never flashes for an already-signed-in admin. A signed-out admin is
// bounced to login — except when already on login, which would otherwise loop.
export default function AdminLayout() {
  const { status } = useSession();
  const segments = useSegments();
  const onLogin = segments[segments.length - 1] === 'login';

  // Hard-refresh the admin screen when a chore-update push lands (a kid finished/uploaded, a
  // cash-out came in), so the grown-up's lists are never stale. Web/PWA only.
  useRefreshOnPush();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Color.appBg }}>
        <ActivityIndicator color={Color.primary} />
      </View>
    );
  }

  if (status === 'signedOut' && !onLogin) {
    return <Redirect href="/(admin)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
