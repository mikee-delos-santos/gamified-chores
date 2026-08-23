import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { CoinIcon } from '@/components/ui/coin-icon';
import { Pop } from '@/components/ui/pop';
import { fmtCoins } from '@/lib/format';
import { Color, Radius, SCREEN_PADDING } from '@/theme/tokens';

// The award moment ("coin delight"): a full-bleed celebration shown when a grown-up has awarded
// new coins since the kid last looked. Praise and the chore first, the number second — and never
// a peso value here, by design.
export default function KidAward() {
  const router = useRouter();
  const { coins, title, total, name } = useLocalSearchParams<{
    coins?: string;
    title?: string;
    total?: string;
    name?: string;
  }>();

  const added = Number(coins ?? 0);
  const newTotal = Number(total ?? 0);

  function done() {
    if (router.canGoBack()) router.back();
    else router.replace('/(kid)/(tabs)/chores');
  }

  return (
    <View style={{ flex: 1, backgroundColor: Color.primary }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING, paddingVertical: 20 }}>
          <AppText size={15} weight={800} color="rgba(255,255,255,0.85)">
            Nice work, {name || 'you'}!
          </AppText>

          <View style={{ flex: 1 }} />

          <Pop from={0.5} translateY={0} damping={9} stiffness={200}>
            <CoinIcon size={76} />
          </Pop>
          <AppText size={74} weight={900} color={Color.white} tabular lineHeight={80} style={{ marginTop: 8 }}>
            +{fmtCoins(added)}
          </AppText>
          <AppText size={20} weight={800} color={Color.white}>
            coins added
          </AppText>

          <View
            style={{
              marginTop: 20,
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderRadius: Radius.card,
              padding: 16,
            }}>
            {title ? (
              <AppText size={17} weight={800} color={Color.white}>
                {title}
              </AppText>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: title ? 8 : 0,
              }}>
              <AppText size={14} weight={700} color="rgba(255,255,255,0.85)">
                New total
              </AppText>
              <AppText size={28} weight={900} color={Color.white} tabular>
                {fmtCoins(newTotal)}
              </AppText>
            </View>
          </View>

          <Pressable
            onPress={done}
            style={({ pressed }) => ({
              marginTop: 20,
              backgroundColor: Color.white,
              borderRadius: Radius.card,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transform: [{ translateY: pressed ? 3 : 0 }],
            })}>
            <AppText size={18} weight={900} color={Color.primary}>
              What&apos;s next
            </AppText>
            <ChevronRight size={20} color={Color.primary} strokeWidth={2.8} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
