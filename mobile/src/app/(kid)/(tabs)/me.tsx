import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { NotificationsCard } from '@/components/ui/notifications-card';
import { PinSheet } from '@/components/ui/pin-sheet';
import { Screen } from '@/components/ui/screen';
import { ChildProfileDetail, getChildProfile, getPinStatus, listOpenChores } from '@/lib/api';
import { clearBoundKid, getBoundKid } from '@/lib/device-session';
import { fmtCoins } from '@/lib/format';
import { Color, Ink, Radius } from '@/theme/tokens';

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: 16, gap: 4 }}>
      <AppText size={12} weight={700} color={Ink.t55}>
        {label}
      </AppText>
      <AppText size={30} weight={900} color={Color.navy} tabular>
        {value}
      </AppText>
    </Card>
  );
}

export default function KidMe() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [data, setData] = useState<ChildProfileDetail | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);

  const load = useCallback(async () => {
    const bound = await getBoundKid();
    if (!bound) {
      router.replace('/');
      return;
    }
    setName(bound.name);
    try {
      const [profile, open] = await Promise.all([getChildProfile(bound.id), listOpenChores()]);
      setData(profile);
      setOpenCount(open.length);
    } catch {
      // Leave stats blank on a read failure; Switch kid still works.
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Leaving the device binding is guarded by a grown-up PIN when the family has set one.
  async function doSwitch() {
    await clearBoundKid();
    router.replace('/');
  }
  async function onSwitch() {
    const hasPin = await getPinStatus().catch(() => false);
    if (hasPin) setShowPin(true);
    else await doSwitch();
  }

  const done = data?.completed_chores ?? [];
  const choresDone = done.length;
  const coinsAllTime = done.reduce((sum, c) => sum + (c.awarded ?? 0), 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8, paddingBottom: 20 }}>
          <Avatar name={name} size={60} />
          <View style={{ flex: 1 }}>
            <AppText size={28} weight={900} color={Color.navy}>
              {name}
            </AppText>
            <AppText size={13} weight={700} color={Ink.t55}>
              {openCount} chore{openCount === 1 ? '' : 's'} left today
            </AppText>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Color.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatTile label="Chores done" value={String(choresDone)} />
              <StatTile label="Coins all time" value={fmtCoins(coinsAllTime)} />
            </View>

            <NotificationsCard />
          </View>
        )}

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={onSwitch}
          style={{
            marginTop: 24,
            borderRadius: Radius.card,
            borderWidth: 2,
            borderColor: Color.softBlueBorder,
            paddingVertical: 15,
            alignItems: 'center',
          }}>
          <AppText size={16} weight={800} color={Color.navy}>
            Switch kid
          </AppText>
        </Pressable>
      </ScrollView>

      <PinSheet visible={showPin} onClose={() => setShowPin(false)} onSuccess={doSwitch} />
    </Screen>
  );
}
