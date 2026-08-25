import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { BalanceCard } from '@/components/ui/balance-card';
import { Card, CoinChip } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useWebPullToRefresh } from '@/hooks/use-web-pull-to-refresh';
import { ChildProfileDetail, Chore, CompletedChore, getChildProfile, listOpenChores } from '@/lib/api';
import { getBoundKid, getSeenEarned, setSeenEarned } from '@/lib/device-session';
import { fmtCoins } from '@/lib/format';
import { Color, Ink } from '@/theme/tokens';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Sum of coins a grown-up has actually awarded (graded chores). Drives both the "coins added"
// award moment and the all-time total on Me.
function earnedTotal(done: CompletedChore[]): number {
  return done.reduce((sum, c) => sum + (c.awarded ?? 0), 0);
}

export default function KidChores() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [data, setData] = useState<ChildProfileDetail | null>(null);
  const [openChores, setOpenChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The FlatList's scrollable DOM node, used to power pull-to-refresh on web (see hook below).
  const [scrollNode, setScrollNode] = useState<HTMLElement | null>(null);

  // If a grown-up has awarded new coins since this kid last looked, celebrate once. Baseline the
  // first time (no confetti for coins earned before the feature existed).
  const maybeCelebrate = useCallback(
    async (kidId: number, profile: ChildProfileDetail) => {
      const earned = earnedTotal(profile.completed_chores);
      const seen = await getSeenEarned(kidId);
      await setSeenEarned(kidId, earned);
      if (seen == null || earned <= seen) return;
      const delta = earned - seen;
      // Name the most recently finished chore in the celebration.
      const latest = [...profile.completed_chores].sort((a, b) =>
        (b.completed_at ?? '').localeCompare(a.completed_at ?? ''),
      )[0];
      router.push({
        pathname: '/(kid)/award',
        params: {
          coins: String(delta),
          title: latest?.title ?? '',
          total: String(profile.balance),
          name: profile.name,
        },
      });
    },
    [router],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const bound = await getBoundKid();
      if (!bound) {
        router.replace('/');
        return;
      }
      setName(bound.name);
      const [profile, open] = await Promise.all([getChildProfile(bound.id), listOpenChores(bound.id)]);
      setData(profile);
      setOpenChores(open);
      await maybeCelebrate(bound.id, profile);
    } catch {
      setError('Could not load your chores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, maybeCelebrate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Stable ref so React doesn't re-run this (and setScrollNode) on every render.
  const listRef = useCallback((r: FlatList<CompletedChore> | null) => {
    setScrollNode(
      (r as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.() ?? null,
    );
  }, []);

  // Restore pull-to-refresh on the PWA, where RefreshControl's gesture does nothing.
  useWebPullToRefresh(scrollNode, onRefresh);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={Color.primary} style={{ marginTop: 48 }} />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <AppText size={15} weight={700} color={Color.ink}>
            {error ?? 'Not found.'}
          </AppText>
          <Pressable onPress={load}>
            <AppText size={15} weight={800} color={Color.primary}>
              Try again
            </AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const done = data.completed_chores;
  const totalEarned = earnedTotal(done);
  const openTotal = openChores.reduce((sum, c) => sum + c.reward_coins, 0);

  return (
    <Screen padded={false}>
      <FlatList<CompletedChore>
        ref={listRef}
        data={done}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Color.primary} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {Platform.OS === 'web' && refreshing ? (
              <ActivityIndicator color={Color.primary} style={{ marginTop: 8 }} />
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                paddingBottom: 16,
              }}>
              <AppText size={20} weight={800} color={Color.navy}>
                Hi, {name}
              </AppText>
              <Avatar name={name} size={34} />
            </View>

            <BalanceCard balance={data.balance} />

            {openChores.length > 0 ? (
              <View style={{ marginTop: 22 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}>
                  <AppText size={18} weight={800} color={Color.navy}>
                    {openChores.length} chore{openChores.length === 1 ? '' : 's'} left today
                  </AppText>
                  <AppText size={13} weight={700} color={Color.primary} tabular>
                    {fmtCoins(openTotal)} coins
                  </AppText>
                </View>
                <View style={{ gap: 10 }}>
                  {openChores.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() =>
                        router.push(`/(kid)/chore/${c.id}?name=${encodeURIComponent(name)}`)
                      }>
                      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText size={16} weight={800} color={Color.navy}>
                            {c.title}
                          </AppText>
                          {c.description ? (
                            <AppText size={12} weight={600} color={Ink.t55}>
                              {c.description}
                            </AppText>
                          ) : null}
                        </View>
                        <CoinChip amount={c.reward_coins} />
                        <ChevronRight size={20} color={Color.primary} strokeWidth={2.6} />
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 22,
                marginBottom: 10,
              }}>
              <AppText size={18} weight={800} color={Color.navy}>
                Chores you finished
              </AppText>
              {done.length > 0 ? (
                <AppText size={13} weight={700} color={Color.primary} tabular>
                  {fmtCoins(totalEarned)} coins
                </AppText>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
            <AppText size={15} weight={800} color={Color.navy}>
              No chores done yet
            </AppText>
            <AppText size={13} weight={700} color={Ink.t55} center style={{ marginTop: 4 }}>
              Finish a chore and your coins land here.
            </AppText>
          </Card>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText size={16} weight={800} color={Color.navy}>
                {item.title}
              </AppText>
              <AppText size={12} weight={600} color={Ink.t55}>
                {formatDate(item.completed_at)}
              </AppText>
            </View>
            <CoinChip amount={item.awarded} />
          </Card>
        )}
      />
    </Screen>
  );
}
