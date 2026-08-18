import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChildProfile, listChildProfiles } from '@/lib/api';

export default function KidProfiles() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProfiles(await listChildProfiles());
    } catch {
      setError('Could not load profiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Who are you?</ThemedText>
          <Pressable onPress={() => router.replace('/')}>
            <ThemedText type="small" style={styles.link}>
              Home
            </ThemedText>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.center}>
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
            <Pressable onPress={load}>
              <ThemedText type="small" style={styles.link}>
                Retry
              </ThemedText>
            </Pressable>
          </View>
        ) : loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <FlatList
            data={profiles}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/(kid)/${item.id}`)}>
                <ThemedText type="default" style={styles.name}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small" style={styles.balance}>
                  {item.balance} Faye Coins
                </ThemedText>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  link: { color: '#3b6cff' },
  center: { alignItems: 'center', gap: 8, marginTop: 32 },
  error: { color: '#d33' },
  loader: { marginTop: 32 },
  list: { gap: 12 },
  card: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#ffd591',
    gap: 4,
  },
  name: { fontSize: 20 },
  balance: { color: '#b26a00' },
});
