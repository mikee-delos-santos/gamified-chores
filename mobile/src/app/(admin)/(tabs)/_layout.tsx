import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { useRefreshOnPush } from '@/hooks/use-refresh-on-push';
import { useReviewCount } from '@/hooks/use-review-count';
import { useSession } from '@/lib/session';
import { Color, Ink, Radius } from '@/theme/tokens';

const LABELS: Record<string, string> = {
  review: 'Review',
  chores: 'Chores',
  bank: 'Bank',
  kids: 'Kids',
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

function AdminTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const reviewCount = useReviewCount(token);

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
        const badge = route.name === 'review' && reviewCount > 0 ? reviewCount : null;
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
              paddingHorizontal: 18,
              borderRadius: Radius.pill,
              backgroundColor: focused ? Color.primary : 'transparent',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <AppText size={15} weight={800} color={focused ? Color.white : Ink.t55}>
                {label}
              </AppText>
              {badge != null ? (
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: focused ? Color.white : Color.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                  <AppText size={11} weight={800} color={focused ? Color.primary : Color.white} tabular>
                    {badge > 99 ? '99+' : String(badge)}
                  </AppText>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AdminTabsLayout() {
  useRefreshOnPush();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AdminTabBar {...(props as unknown as TabBarProps)} />}>
      <Tabs.Screen name="review" />
      <Tabs.Screen name="chores" />
      <Tabs.Screen name="bank" />
      <Tabs.Screen name="kids" />
    </Tabs>
  );
}
