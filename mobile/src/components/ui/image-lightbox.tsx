// A full-screen image viewer. Renders one image from `urls` at `index` (contain-fit on a dark
// scrim); when the strip holds more than one photo, left/right controls page through them. Tap
// the scrim or the close button to dismiss. `index === null` keeps it hidden.

import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';

import { Color } from '@/theme/tokens';

const roundBtn = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(255,255,255,0.16)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

export function ImageLightbox({
  urls,
  index,
  onIndexChange,
  onClose,
}: {
  urls: string[];
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const visible = index != null && index >= 0 && index < urls.length;
  const url = visible ? urls[index] : null;
  const many = urls.length > 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(6,20,34,0.92)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '80%' }} contentFit="contain" /> : null}

        {many && visible && index > 0 ? (
          <Pressable
            onPress={() => onIndexChange(index - 1)}
            hitSlop={10}
            style={{ position: 'absolute', left: 16, top: '50%', ...roundBtn }}>
            <ChevronLeft size={24} color={Color.white} strokeWidth={2.6} />
          </Pressable>
        ) : null}

        {many && visible && index < urls.length - 1 ? (
          <Pressable
            onPress={() => onIndexChange(index + 1)}
            hitSlop={10}
            style={{ position: 'absolute', right: 16, top: '50%', ...roundBtn }}>
            <ChevronRight size={24} color={Color.white} strokeWidth={2.6} />
          </Pressable>
        ) : null}

        <Pressable onPress={onClose} hitSlop={10} style={{ position: 'absolute', top: 48, right: 20, ...roundBtn }}>
          <X size={22} color={Color.white} strokeWidth={2.6} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
