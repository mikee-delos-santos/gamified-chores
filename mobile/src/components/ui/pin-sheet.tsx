// Grown-up PIN sheet: a kid can't switch which kid the device is bound to without a grown-up
// entering the PIN. Four dots + a numeric keypad (kid-proof, no keyboard). Verifies against
// the family PIN; calls onSuccess when correct.

import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { verifyFamilyPin } from '@/lib/api';
import { Color, Ink, Radius } from '@/theme/tokens';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Close', '0', 'del'];

export function PinSheet({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setDigits('');
    setError(false);
    setBusy(false);
  }

  async function submit(pin: string) {
    setBusy(true);
    setError(false);
    const ok = await verifyFamilyPin(pin).catch(() => false);
    if (ok) {
      reset();
      onSuccess();
    } else {
      setError(true);
      setDigits('');
      setBusy(false);
    }
  }

  function press(key: string) {
    if (busy) return;
    if (key === 'Close') {
      reset();
      onClose();
      return;
    }
    if (key === 'del') {
      setError(false);
      setDigits((d) => d.slice(0, -1));
      return;
    }
    setError(false);
    setDigits((d) => {
      if (d.length >= 4) return d;
      const next = d + key;
      if (next.length === 4) submit(next);
      return next;
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,58,94,0.45)' }}>
        <View
          style={{
            backgroundColor: Color.appBg,
            borderTopLeftRadius: Radius.sheet,
            borderTopRightRadius: Radius.sheet,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: 28,
            gap: 16,
            alignItems: 'center',
          }}>
          <AppText size={22} weight={900} color={Color.navy}>
            Grown-up PIN
          </AppText>
          <AppText size={13} weight={700} color={Ink.t60} center lineHeight={19}>
            Switching kids needs a grown-up, so chores never get done on the wrong account.
          </AppText>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: Radius.input,
                  borderWidth: 2,
                  borderColor: error ? '#c8452f' : Color.softBlueBorder,
                  backgroundColor: i < digits.length ? Color.primary : Color.softBlue,
                }}
              />
            ))}
          </View>

          {error ? (
            <AppText size={13} weight={700} color="#c8452f">
              Wrong PIN. Try again.
            </AppText>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, width: 3 * 72 + 2 * 9, justifyContent: 'center' }}>
            {KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => press(key)}
                style={{
                  width: 72,
                  paddingVertical: 15,
                  borderRadius: Radius.key,
                  borderWidth: 2,
                  borderColor: Color.softBlue,
                  backgroundColor: Color.card,
                  alignItems: 'center',
                }}>
                <AppText size={key === 'Close' ? 13 : 20} weight={800} color={Color.navy}>
                  {key === 'del' ? '⌫' : key}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
