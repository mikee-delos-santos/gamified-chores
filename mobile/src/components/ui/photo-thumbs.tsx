// A horizontal strip of photo thumbnails (how-to images or a proof image). Rounded, uniform
// squares using expo-image. Tapping a thumbnail opens it full size in a lightbox; pass
// `zoomable={false}` for a purely decorative strip.

import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ImageLightbox } from '@/components/ui/image-lightbox';
import { Color, Radius } from '@/theme/tokens';

export function PhotoThumbs({
  urls,
  size = 56,
  zoomable = true,
}: {
  urls: string[];
  size?: number;
  zoomable?: boolean;
}) {
  const [viewer, setViewer] = useState<number | null>(null);
  if (!urls || urls.length === 0) return null;

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {urls.map((url, i) => {
          const thumb = (
            <Image
              source={{ uri: url }}
              style={{
                width: size,
                height: size,
                borderRadius: Radius.chip,
                backgroundColor: Color.softBlue,
              }}
              contentFit="cover"
            />
          );
          return zoomable ? (
            <Pressable
              key={`${url}-${i}`}
              onPress={(e) => {
                e.stopPropagation();
                setViewer(i);
              }}
              hitSlop={4}>
              {thumb}
            </Pressable>
          ) : (
            <View key={`${url}-${i}`}>{thumb}</View>
          );
        })}
      </View>

      {zoomable ? (
        <ImageLightbox urls={urls} index={viewer} onIndexChange={setViewer} onClose={() => setViewer(null)} />
      ) : null}
    </>
  );
}
