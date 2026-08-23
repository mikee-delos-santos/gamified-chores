import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { CoinIcon } from '@/components/ui/coin-icon';
import { Pop } from '@/components/ui/pop';
import { Screen } from '@/components/ui/screen';
import { Color } from '@/theme/tokens';

// Role gate: the home both areas return to. "Parent" enters the auth-guarded admin group
// (which bounces to login when there is no token); "Kid" opens the open kid area.
export default function RoleGate() {
  const router = useRouter();
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
