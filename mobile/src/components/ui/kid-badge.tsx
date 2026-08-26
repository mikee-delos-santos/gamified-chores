// A circular kid avatar ringed in the kid's card color. Shows the seeded photo when there is
// one, otherwise falls back to the initials Avatar inside the same ring. Used to mark which kid
// did a chore on the Done & archived cards, and inside the kid filter chips.

import { Image } from 'expo-image';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Color, Shadow } from '@/theme/tokens';

export function KidBadge({
  name,
  color,
  photoUrl,
  size = 44,
  ring = 3,
  shadow = true,
}: {
  name: string;
  color?: string | null;
  photoUrl?: string | null;
  size?: number;
  ring?: number;
  shadow?: boolean;
}) {
  const ringColor = color ?? Color.softBlueBorder;
  const inner = size - ring * 2;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ring,
          borderColor: ringColor,
          backgroundColor: Color.card,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        shadow ? Shadow.row : null,
      ]}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: inner, height: inner, borderRadius: inner / 2 }}
          contentFit="cover"
        />
      ) : (
        <Avatar name={name} size={inner} />
      )}
    </View>
  );
}
