// Text in the kid design system. Nunito throughout, weight via fontFamily (not fontWeight),
// numbers can be tabular. Defaults: 16px / 700 / ink.

import { Text, type TextProps, type TextStyle } from 'react-native';

import { Color, Font, type FontWeight } from '@/theme/tokens';

export type AppTextProps = TextProps & {
  size?: number;
  weight?: FontWeight;
  color?: string;
  lineHeight?: number;
  tabular?: boolean;
  center?: boolean;
};

export function AppText({
  size = 16,
  weight = 700,
  color = Color.ink,
  lineHeight,
  tabular = false,
  center = false,
  style,
  ...rest
}: AppTextProps) {
  const base: TextStyle = {
    fontFamily: Font[weight],
    fontSize: size,
    color,
    ...(lineHeight ? { lineHeight } : null),
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
    ...(center ? { textAlign: 'center' } : null),
  };
  return <Text style={[base, style]} {...rest} />;
}
