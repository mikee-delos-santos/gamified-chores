// A horizontal strip of photo thumbnails (how-to images or a proof image). Rounded, uniform
// squares using expo-image. Read-only display.

import { Image } from 'expo-image';
import { View } from 'react-native';

import { Color, Radius } from '@/theme/tokens';

export function PhotoThumbs({ urls, size = 56 }: { urls: string[]; size?: number }) {
  if (!urls || urls.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {urls.map((url, i) => (
        <Image
          key={`${url}-${i}`}
          source={{ uri: url }}
          style={{
            width: size,
            height: size,
            borderRadius: Radius.chip,
            backgroundColor: Color.softBlue,
          }}
          contentFit="cover"
        />
      ))}
    </View>
  );
}
