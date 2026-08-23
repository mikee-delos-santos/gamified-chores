// Photo source chooser: when a user adds a photo, ask whether to take a new one with the
// camera or pick from the gallery. Before this, uploads went straight to the gallery and the
// camera was never offered (on the Android PWA the multi-select file input hides the camera).
//
// usePhotoSource() returns { choose, sheet }: render {sheet} once in the screen, then call
// `await choose(multiple)` to open the sheet and get back the selected image URIs ([] if the
// user cancels). Camera capture is always a single photo; gallery honors the `multiple` flag.

import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { capturePhoto, pickImages } from '@/lib/pick-images';
import { Color, Ink, Radius } from '@/theme/tokens';

function SourceRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: Radius.card,
        borderWidth: 2,
        borderColor: Color.softBlueBorder,
        backgroundColor: pressed ? Color.softBlue : Color.card,
        width: '100%',
      })}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: Radius.input ?? 14,
          backgroundColor: Color.softBlue,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <AppText size={16} weight={800} color={Color.navy}>
          {label}
        </AppText>
        <AppText size={12} weight={700} color={Ink.t60}>
          {hint}
        </AppText>
      </View>
    </Pressable>
  );
}

function PhotoSourceSheet({
  visible,
  onCamera,
  onGallery,
  onCancel,
  multiple,
}: {
  visible: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onCancel: () => void;
  multiple: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: 'rgba(18,58,94,0.45)', justifyContent: 'flex-end' }}>
        {/* Stop taps inside the sheet from closing it. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: Color.appBg,
            borderTopLeftRadius: Radius.sheet,
            borderTopRightRadius: Radius.sheet,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: 28,
            gap: 12,
          }}>
          <AppText size={20} weight={900} color={Color.navy} center>
            Add a photo
          </AppText>

          <SourceRow
            icon={<Camera size={22} color={Color.primary} strokeWidth={2.4} />}
            label="Take Photo"
            hint="Use the camera"
            onPress={onCamera}
          />
          <SourceRow
            icon={<ImageIcon size={22} color={Color.primary} strokeWidth={2.4} />}
            label="Choose from Gallery"
            hint={multiple ? 'Pick one or more' : 'Pick from your photos'}
            onPress={onGallery}
          />

          <Pressable onPress={onCancel} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <AppText size={15} weight={800} color={Ink.t60}>
              Cancel
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function usePhotoSource() {
  const [visible, setVisible] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const resolver = useRef<((uris: string[]) => void) | null>(null);

  const settle = useCallback((uris: string[]) => {
    resolver.current?.(uris);
    resolver.current = null;
  }, []);

  const choose = useCallback((multi = false) => {
    setMultiple(multi);
    setVisible(true);
    return new Promise<string[]>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const onCamera = useCallback(async () => {
    setVisible(false);
    settle(await capturePhoto());
  }, [settle]);

  const onGallery = useCallback(async () => {
    setVisible(false);
    settle(await pickImages(multiple));
  }, [settle, multiple]);

  const onCancel = useCallback(() => {
    setVisible(false);
    settle([]);
  }, [settle]);

  const sheet = (
    <PhotoSourceSheet
      visible={visible}
      multiple={multiple}
      onCamera={onCamera}
      onGallery={onGallery}
      onCancel={onCancel}
    />
  );

  return { choose, sheet };
}
