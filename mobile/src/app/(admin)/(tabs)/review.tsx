import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Color, Ink } from '@/theme/tokens';

export default function AdminReview() {
  return (
    <Screen>
      <View style={{ paddingTop: 8, paddingBottom: 16 }}>
        <AppText size={24} weight={800} color={Color.navy}>
          Review
        </AppText>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <AppText size={15} weight={800} color={Color.navy}>
          All caught up
        </AppText>
        <AppText size={13} weight={700} color={Ink.t55} center>
          When a kid submits proof, it will show up here.
        </AppText>
      </View>
    </Screen>
  );
}
