import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { BalanceCard } from '@/components/ui/balance-card';
import { Card, CoinChip } from '@/components/ui/card';
import { NotificationsCard } from '@/components/ui/notifications-card';
import { PinSheet } from '@/components/ui/pin-sheet';
import { Pop } from '@/components/ui/pop';
import { Screen } from '@/components/ui/screen';
import { ChildProfileDetail, Chore, CompletedChore, getChildProfile, getPinStatus, listOpenChores } from '@/lib/api';
import { clearBoundKid } from '@/lib/device-session';
import { fmtCoins } from '@/lib/format';
import { Color, Ink } from '@/theme/tokens';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function KidHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = Number(id);

  const [data, setData] = useState<ChildProfileDetail | null>(null);
  const [openChores, setOpenChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Switching kids leaves the device binding — guarded by a grown-up PIN when one is set.
  async function doSwitch() {
    await clearBoundKid();
    router.replace('/');
  }
  async function onSwitch() {
    const hasPin = await getPinStatus().catch(() => false);
    if (hasPin) setShowPin(true);
    else await doSwitch();
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      const [profile, open] = await Promise.all([getChildProfile(childId), listOpenChores()]);
      setData(profile);
      setOpenChores(open);
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
          <Pressable onPress={onSwitch}>
            <AppText size={14} weight={800} color={Ink.t55}>
              Switch kid
            </AppText>
          </Pressable>
        </View>
        <PinSheet visible={showPin} onClose={() => setShowPin(false)} onSuccess={doSwitch} />
      </Screen>
    );
  }

  const done = data.completed_chores;
  const totalEarned = done.reduce((sum, c) => sum + (c.awarded ?? 0), 0);

  return (
    <Screen padded={false}>
      <FlatList<CompletedChore>
        data={done}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Color.primary}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                paddingBottom: 16,
              }}>
              <Pressable
                onPress={onSwitch}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ChevronLeft size={22} color={Color.primary} strokeWidth={2.6} />
                <AppText size={20} weight={800} color={Color.navy}>
                  Hi, {data.name}
                </AppText>
              </Pressable>
              <Avatar name={data.name} size={34} />
            </View>

            <BalanceCard balance={data.balance} />

            <View style={{ marginTop: 14 }}>
              <NotificationsCard />
            </View>

            {openChores.length > 0 ? (
              <View style={{ marginTop: 22 }}>
                <AppText size={18} weight={800} color={Color.navy} style={{ marginBottom: 10 }}>
                  Chores to do
                </AppText>
                <View style={{ gap: 10 }}>
                  {openChores.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() =>
                        router.push(`/(kid)/chore/${c.id}?name=${encodeURIComponent(data.name)}`)
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
        renderItem={({ item, index }) => (
          <Pop delay={index * 60} from={0.99} translateY={10} damping={16} stiffness={150}>
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
          </Pop>
        )}
      />
      <PinSheet visible={showPin} onClose={() => setShowPin(false)} onSuccess={doSwitch} />
    </Screen>
  );
}
