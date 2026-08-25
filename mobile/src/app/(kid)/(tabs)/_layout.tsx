import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { usePushAutoEnroll } from '@/hooks/use-push-auto-enroll';
import { useRefreshOnPush } from '@/hooks/use-refresh-on-push';
import { Color, Ink, Radius } from '@/theme/tokens';

// The kid's three tabs. No icons in the design — just text labels, with the active tab shown as
// a filled blue pill (see docs/design/kid-app). The device is bound to one kid, so each tab
// reads that kid from device-session rather than a route param.
const LABELS: Record<string, string> = {
  chores: 'Chores',
  bank: 'Coin bank',
  me: 'Me',
};

// Minimal shape of the props expo-router hands a custom tabBar — avoids depending on the
// @react-navigation/bottom-tabs types directly.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

function KidTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12 + insets.bottom,
        paddingHorizontal: 16,
        backgroundColor: Color.appBg,
        borderTopWidth: 2,
        borderTopColor: Color.softBlue,
      }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = LABELS[route.name] ?? route.name;
        return (
          <Pressable
            key={route.key}
            hitSlop={8}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 22,
              borderRadius: Radius.pill,
              backgroundColor: focused ? Color.primary : 'transparent',
            }}>
            <AppText size={15} weight={800} color={focused ? Color.white : Ink.t55}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function KidTabsLayout() {
  // Hard-refresh the kid's screen whenever a chore-update push lands (web/PWA only).
  useRefreshOnPush();
  // Silently re-subscribe for push on boot if already granted (no prompt).
  usePushAutoEnroll();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <KidTabBar {...(props as unknown as TabBarProps)} />}>
      <Tabs.Screen name="chores" />
      <Tabs.Screen name="bank" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
