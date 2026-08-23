// Family-wide push enrollment control. Web/PWA only — renders nothing where push is
// unsupported (native, or a browser without the APIs). When an adminToken is passed it also
// offers a "Send test" trigger so a grown-up can fire a test notification to every device.

import { BellRing } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import {
  enableNotifications,
  isPushSupported,
  isSubscribed,
  permissionState,
  sendTestNotification,
} from '@/lib/push';
import { Color, Ink, Radius } from '@/theme/tokens';

export function NotificationsCard({ adminToken }: { adminToken?: string | null }) {
  const [supported] = useState(() => isPushSupported());
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    (async () => {
      setEnabled((await isSubscribed()) && permissionState() === 'granted');
    })();
  }, [supported]);

  if (!supported) return null;

  async function onEnable() {
    setBusy(true);
    setMsg(null);
    const res = await enableNotifications();
    setBusy(false);
    if (res.ok) {
      setEnabled(true);
      setMsg('Notifications are on for this device.');
    } else if (res.reason === 'denied') {
      setMsg('Notifications are blocked. Allow them in your browser settings, then try again.');
    } else if (res.reason === 'unsupported') {
      setMsg('This browser cannot show notifications.');
    } else if (res.reason === 'no-key') {
      setMsg('Push is not configured yet.');
    } else {
      setMsg('Could not turn on notifications. Try again.');
    }
  }

  async function onTest() {
    if (!adminToken) return;
    setBusy(true);
    setMsg(null);
    try {
      const n = await sendTestNotification(adminToken);
      setMsg(`Test sent to ${n} device${n === 1 ? '' : 's'}.`);
    } catch {
      setMsg('Could not send the test.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 10, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: Color.softBlue,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <BellRing size={18} color={Color.primary} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText size={15} weight={800} color={Color.navy}>
            Notifications
          </AppText>
          <AppText size={12} weight={600} color={Ink.t55}>
            Tell this device about new chores and awards.
          </AppText>
        </View>
      </View>

      {enabled ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: Color.softBlue,
            borderRadius: Radius.chip,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}>
          <AppText size={13} weight={800} color={Color.primary}>
            On for this device
          </AppText>
          {adminToken ? (
            <Pressable onPress={onTest} disabled={busy} hitSlop={6} style={{ marginLeft: 'auto' }}>
              <AppText size={13} weight={800} color={Color.primary}>
                {busy ? 'Sending…' : 'Send test'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={onEnable}
          disabled={busy}
          style={{
            backgroundColor: Color.primary,
            borderRadius: Radius.card,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 5,
            borderBottomColor: Color.primaryPress,
            opacity: busy ? 0.7 : 1,
          }}>
          <AppText size={15} weight={900} color={Color.white}>
            {busy ? 'Turning on…' : 'Turn on notifications'}
          </AppText>
        </Pressable>
      )}

      {msg ? (
        <AppText size={12} weight={700} color={Ink.t60}>
          {msg}
        </AppText>
      ) : null}
    </Card>
  );
}
