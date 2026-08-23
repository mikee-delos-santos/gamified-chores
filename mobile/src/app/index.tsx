import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { CoinIcon } from '@/components/ui/coin-icon';
import { Pop } from '@/components/ui/pop';
import { Screen } from '@/components/ui/screen';
import { BoundKid, getBoundKid } from '@/lib/device-session';
import { useSession } from '@/lib/session';
import { Color } from '@/theme/tokens';

// Role gate: the home both areas return to. If there's already an admin session, skip straight
// to the admin area; if this device is bound to a kid, go straight to that kid's home. Only a
// fresh device is asked "kid or grown-up?" — and switching a bound kid needs a grown-up PIN.
export default function RoleGate() {
  const router = useRouter();
  const { status } = useSession();
  const [bound, setBound] = useState<BoundKid | null>(null);
  const [checkedBound, setCheckedBound] = useState(false);

  useEffect(() => {
    (async () => {
      setBound(await getBoundKid());
      setCheckedBound(true);
    })();
  }, []);

  if (status === 'loading' || !checkedBound) return null; // brief; avoids flashing the gate
  if (status === 'signedIn') return <Redirect href="/(admin)/chores" />;
  if (bound) return <Redirect href={`/(kid)/${bound.id}`} />;

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
        <Pop from={0.6} translateY={-16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CoinIcon size={34} />
            <AppText size={17} weight={800} color={Color.navy}>
              Faye Coins
            </AppText>
          </View>
        </Pop>

        <AppText size={34} weight={900} color={Color.navy} lineHeight={39} style={{ marginTop: 12 }}>
          Do a chore,{'\n'}earn your coins
        </AppText>
        <AppText size={13} weight={700} color={Color.ink} lineHeight={20} style={{ opacity: 0.62 }}>
          Who is using the tablet right now?
        </AppText>

        <View style={{ gap: 12, marginTop: 24 }}>
          <PrimaryButton label="I'm a kid" onPress={() => router.push('/(kid)/profiles')} />
          <SecondaryButton label="I'm a grown-up" onPress={() => router.push('/(admin)/chores')} />
        </View>
      </View>
    </Screen>
  );
}
