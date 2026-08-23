// Mount animation primitive for the kid app's "physical, short" motion (see the design's
// animation table): scales up from `from`, optionally drops in from `translateY`, and fades.
// Used for coin pips (pipIn), the balance coin (coinDrop), and rows/cards (rowIn).

import { type ReactNode, useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

export function Pop({
  delay = 0,
  from = 0.5,
  translateY = 0,
  damping = 12,
  stiffness = 180,
  children,
  style,
}: {
  delay?: number;
  from?: number;
  translateY?: number;
  damping?: number;
  stiffness?: number;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withSpring(1, { damping, stiffness, mass: 0.6 }));
    // shared values are stable; only re-run if the delay changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  const anim = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: from + (1 - from) * p.value }, { translateY: (1 - p.value) * translateY }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
