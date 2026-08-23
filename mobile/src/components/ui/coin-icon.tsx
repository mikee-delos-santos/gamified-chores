// The Faye coin: two concentric circles, Lucide-style, gold fill with navy stroke — matched
// to the prototype SVG. Small sizes (chips) drop the inner ring for clarity, as in the design.

import Svg, { Circle } from 'react-native-svg';

import { Color } from '@/theme/tokens';

export function CoinIcon({ size = 24, inner = true }: { size?: number; inner?: boolean }) {
  // Stroke thickens slightly at small sizes, mirroring the prototype (1.4 large, 1.6 small).
  const strokeWidth = size >= 40 ? 1.4 : 1.6;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle
        cx={12}
        cy={12}
        r={9}
        fill={Color.coinGold}
        stroke={Color.navy}
        strokeWidth={strokeWidth}
      />
      {inner ? (
        <Circle cx={12} cy={12} r={4.2} fill="none" stroke={Color.navy} strokeWidth={strokeWidth} />
      ) : null}
    </Svg>
  );
}
