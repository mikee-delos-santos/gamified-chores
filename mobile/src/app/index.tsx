import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL, getHealth } from '@/lib/api';

type Status = 'checking' | 'online' | 'offline';

export default function HomeScreen() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let active = true;
    getHealth().then((ok) => {
      if (active) setStatus(ok ? 'online' : 'offline');
    });
    return () => {
      active = false;
    };
  }, []);

  const label =
    status === 'checking'
      ? 'Checking backend…'
      : status === 'online'
        ? 'Backend online ✓'
        : 'Backend unreachable ✗';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.centered}>
          Faye Coins
        </ThemedText>
        <ThemedText type="subtitle">Gamified chores</ThemedText>

        <ThemedView style={styles.statusBox}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small">{API_URL}</ThemedText>
        </ThemedView>

        <ThemedText type="small" style={styles.note}>
          Crude MVP scaffold. Admin &amp; kid flows arrive in PC-16 / PC-17.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  centered: {
    textAlign: 'center',
  },
  statusBox: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  note: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
