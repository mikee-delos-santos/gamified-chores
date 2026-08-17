import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useSession } from '@/lib/session';

// Guards the admin group. While the boot-time token check runs we show a spinner so the
// login screen never flashes for an already-signed-in admin. A signed-out admin is
// bounced to login — except when already on login, which would otherwise loop.
export default function AdminLayout() {
  const { status } = useSession();
  const segments = useSegments();
  const onLogin = segments[segments.length - 1] === 'login';

  if (status === 'loading') {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (status === 'signedOut' && !onLogin) {
    return <Redirect href="/(admin)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
