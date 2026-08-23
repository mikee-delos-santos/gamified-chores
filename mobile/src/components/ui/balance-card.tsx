// The Home balance card — the hero. Primary-blue fill, white text: "Your coins", a gold coin
// that drops in beside the big balance, and a row of coin pips. A diagonal white sheen sweeps
// across on a 2.6s loop (design "sheen"). Peso value never appears here, by design.
//
// Note: the API exposes a single ledger-summed balance, so the "Saved for later" split from the
// prototype is omitted until the Coin bank (PC-3) lands.

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { CoinIcon } from '@/components/ui/coin-icon';
import { CoinPips } from '@/components/ui/coin-pips';
import { Pop } from '@/components/ui/pop';
import { Color, Radius } from '@/theme/tokens';
import { fmtCoins } from '@/lib/format';

const CARD_WIDTH_GUESS = 360; // sheen travel distance; card clips overflow so exact width is fine

export function BalanceCard({ balance }: { balance: number }) {
  const x = useSharedValue(-CARD_WIDTH_GUESS);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(CARD_WIDTH_GUESS, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: '20deg' }] }));

  return (
    <View style={{ backgroundColor: Color.primary, borderRadius: Radius.balance, padding: 20, overflow: 'hidden' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -40,
            bottom: -40,
            width: 70,
            backgroundColor: 'rgba(255,255,255,0.14)',
          },
          sheen,
        ]}
      />

      <AppText size={14} weight={700} color="rgba(255,255,255,0.85)">
        Your coins
      </AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <Pop from={0.7} translateY={-26} damping={11} stiffness={160}>
          <CoinIcon size={42} />
        </Pop>
        <AppText size={50} weight={900} color={Color.white} tabular lineHeight={54}>
          {fmtCoins(balance)}
        </AppText>
      </View>

      <View style={{ marginTop: 14 }}>
        <CoinPips balance={balance} />
      </View>
    </View>
  );
}
