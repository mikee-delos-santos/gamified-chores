// Kid avatar: an initial in a soft-blue circle. Stands in for a real avatar image if the
// product adds one later. On-blue variant (inverted) is used inside the balance card header.

import { View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Color } from '@/theme/tokens';

export function Avatar({
  name,
  size = 34,
  onPrimary = false,
  style,
}: {
  name: string;
  size?: number;
  onPrimary?: boolean;
  style?: ViewStyle;
}) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const bg = onPrimary ? 'rgba(255,255,255,0.22)' : Color.softBlue;
  const fg = onPrimary ? Color.white : Color.primary;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <AppText size={size * 0.44} weight={900} color={fg}>
        {initial}
      </AppText>
    </View>
  );
}
