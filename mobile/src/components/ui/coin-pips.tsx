// A row of coin pips under the balance: one filled gold pip per 6 coins, capped at 9, rest
// empty. Each pips in with a staggered pop (design "pipIn"). 16px pips, 5px gap.

import { View } from 'react-native';

import { Pop } from '@/components/ui/pop';
import { Color } from '@/theme/tokens';

const PIP_COUNT = 9;
const COINS_PER_PIP = 6;
const PIP_SIZE = 16;

export function CoinPips({ balance }: { balance: number }) {
  const filled = Math.min(PIP_COUNT, Math.floor(Math.max(0, balance) / COINS_PER_PIP));
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: PIP_COUNT }).map((_, i) => (
        <Pop key={i} delay={i * 50} from={0.2} damping={9} stiffness={220}>
          <View
            style={{
              width: PIP_SIZE,
              height: PIP_SIZE,
              borderRadius: PIP_SIZE / 2,
              backgroundColor: i < filled ? Color.coinGold : Color.softBlue,
            }}
          />
        </Pop>
      ))}
    </View>
  );
}
