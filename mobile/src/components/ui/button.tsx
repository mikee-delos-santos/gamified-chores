// Buttons in the kid design system.
// PrimaryButton: solid blue with the "depth" look — a darker bottom edge (the design's
//   0 6px 0 #1f5fa6). Pressing sinks it (translateY + thinner edge), matching the prototype.
// SecondaryButton: outline. Both are >= 44px tall tap targets.

import { Pressable, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Color, Radius } from '@/theme/tokens';

const DEPTH = 6;

export function PrimaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={style}>
      {({ pressed }) => (
        <View
          style={{
            backgroundColor: Color.primary,
            borderRadius: Radius.card,
            paddingVertical: 17,
            paddingHorizontal: 20,
            alignItems: 'center',
            borderBottomWidth: pressed ? 2 : DEPTH,
            borderBottomColor: Color.primaryPress,
            transform: [{ translateY: pressed ? 4 : 0 }],
          }}>
          <AppText size={19} weight={900} color={Color.white}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={style}>
      {({ pressed }) => (
        <View
          style={{
            backgroundColor: pressed ? Color.keyPress : Color.card,
            borderRadius: Radius.card,
            paddingVertical: 15,
            paddingHorizontal: 20,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: Color.primary,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          }}>
          <AppText size={16} weight={800} color={Color.primary}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
