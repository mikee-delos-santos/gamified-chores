// Screen shell for the kid app: app-background fill, top safe-area, and a centered content
// column capped at a phone width so the layout reads right on a wide web/PWA window too.

import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Color, SCREEN_PADDING } from '@/theme/tokens';

const MAX_WIDTH = 430; // iPhone-class; the design frame is 390 content width

export function Screen({
  children,
  padded = true,
  style,
}: {
  children: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: Color.appBg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View
          style={[
            {
              flex: 1,
              width: '100%',
              maxWidth: MAX_WIDTH,
              alignSelf: 'center',
              paddingHorizontal: padded ? SCREEN_PADDING : 0,
            },
            style,
          ]}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}
