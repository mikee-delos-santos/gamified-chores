import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChildProfileDetail, getChildProfile } from '@/lib/api';

function stars(n: number | null): string {
  if (!n) return '';
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export default function KidBalance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = Number(id);

  const [data, setData] = useState<ChildProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getChildProfile(childId));
    } catch {
      setError('Could not load this profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={styles.loader} />
      </ThemedView>
    );
  }

  if (error || !data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centerScreen}>
          <ThemedText type="small" style={styles.error}>
            {error ?? 'Not found.'}
          </ThemedText>
          <Pressable onPress={load}>
            <ThemedText type="small" style={styles.link}>
              Retry
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.replace('/')}>
            <ThemedText type="small" style={styles.link}>
              Home
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={data.completed_chores}
          keyExtractor={(c) => String(c.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListHeaderComponent={
            <View style={styles.head}>
              <View style={styles.headTop}>
                <ThemedText type="subtitle">{data.name}</ThemedText>
                <Pressable onPress={() => router.replace('/')}>
                  <ThemedText type="small" style={styles.link}>
                    Home
                  </ThemedText>
                </Pressable>
              </View>
              <ThemedText style={styles.bigBalance}>{data.balance}</ThemedText>
              <ThemedText type="small" style={styles.balanceLabel}>
                Faye Coins
              </ThemedText>
              <ThemedText type="default" style={styles.sectionTitle}>
                Completed chores
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" style={styles.empty}>
              No chores done yet.
            </ThemedText>
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ThemedView style={styles.row}>
              <View style={styles.rowMain}>
                <ThemedText type="default">{item.title}</ThemedText>
                <ThemedText type="small" style={styles.muted}>
                  {stars(item.grade)}  ·  {formatDate(item.completed_at)}
                </ThemedText>
              </View>
              <ThemedText type="default" style={styles.awarded}>
                +{item.awarded}
              </ThemedText>
            </ThemedView>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loader: { marginTop: 48 },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  head: { padding: 16, gap: 2 },
  headTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigBalance: { fontSize: 56, fontWeight: '800', lineHeight: 64, marginTop: 8 },
  balanceLabel: { color: '#b26a00' },
  sectionTitle: { marginTop: 24 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  empty: { textAlign: 'center', opacity: 0.7, marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  rowMain: { flex: 1, gap: 2 },
  muted: { opacity: 0.7 },
  awarded: { color: '#1a8a3a' },
  link: { color: '#3b6cff' },
  error: { color: '#d33' },
});
