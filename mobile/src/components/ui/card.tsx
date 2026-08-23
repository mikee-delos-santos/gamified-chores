// White card and the gold coin chip — the two most-repeated surfaces in the kid app.
// Card: white fill, 2px soft-blue border, row radius, resting shadow. CoinChip: the
// "#fff6e0" pill with a coin icon and a tabular amount used on chore rows.

import { View, type ViewProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { CoinIcon } from '@/components/ui/coin-icon';
import { fmtCoins } from '@/lib/format';
import { Color, Radius, Shadow } from '@/theme/tokens';

export function Card({ style, children, ...rest }: ViewProps & { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: Color.card,
          borderRadius: Radius.row,
          borderWidth: 2,
          borderColor: Color.softBlue,
          padding: 15,
          ...Shadow.row,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

export function CoinChip({ amount }: { amount: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Color.coinChip,
        borderRadius: Radius.chip,
        paddingVertical: 6,
        paddingHorizontal: 10,
      }}>
      <CoinIcon size={16} inner={false} />
      <AppText size={15} weight={800} color={Color.navy} tabular>
        {fmtCoins(amount)}
      </AppText>
    </View>
  );
}
