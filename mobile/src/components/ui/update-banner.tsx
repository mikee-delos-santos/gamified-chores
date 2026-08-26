import { X } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';

import { useAppUpdate } from '@/hooks/use-app-update';
import { Color, Radius } from '@/theme/tokens';

import { AppText } from './app-text';

// App-wide "a new version is ready" banner (web/PWA only). Pinned to the bottom so it never
// blocks what the user is doing; tapping Refresh reloads into the new build, X hides it until
// the next deploy. Driven by useAppUpdate (polls version.json).
export function UpdateBanner() {
  const { updateReady, reload, dismiss } = useAppUpdate();

  if (Platform.OS !== 'web' || !updateReady) return null;

  return (
    <View
      // position: 'fixed' keeps it in place over scrolling content on web; RN types don't list
      // it, so cast the style object.
      style={
        {
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 12,
          zIndex: 9999,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: Radius.card,
          backgroundColor: Color.navy,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        } as object
      }>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText size={15} weight={800} color={Color.white}>
          A new version is ready
        </AppText>
        <AppText size={13} weight={600} color="rgba(255,255,255,0.8)">
          Refresh to get the latest fixes.
        </AppText>
      </View>

      <Pressable
        onPress={reload}
        style={{
          backgroundColor: Color.white,
          paddingHorizontal: 16,
          paddingVertical: 9,
          borderRadius: Radius.chip,
        }}>
        <AppText size={14} weight={800} color={Color.navy}>
          Refresh
        </AppText>
      </Pressable>

      <Pressable onPress={dismiss} hitSlop={8} accessibilityLabel="Dismiss update notice">
        <X size={20} color="rgba(255,255,255,0.85)" strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}
