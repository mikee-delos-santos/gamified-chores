import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { CoinChip } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useReviewQueueContext } from '@/hooks/review-queue-context';
import { useWebPullToRefresh } from '@/hooks/use-web-pull-to-refresh';
import { Chore } from '@/lib/api';
import { Color, Ink, Radius } from '@/theme/tokens';

export default function AdminReview() {
  const router = useRouter();
  const { queue, loading, refreshing, onRefresh, refetch } = useReviewQueueContext();
  const [scrollNode, setScrollNode] = useState<HTMLElement | null>(null);

  // Refresh the shared queue (list + tab-bar badge) every time this tab regains focus, so a
  // freshly submitted chore shows up without a manual pull.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const listRef = useCallback((r: FlatList<Chore> | null) => {
    setScrollNode((r as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.() ?? null);
  }, []);

  useWebPullToRefresh(scrollNode, onRefresh);

  return (
    <Screen padded={false}>
      <FlatList<Chore>
        ref={listRef}
        data={queue}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Color.primary} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {Platform.OS === 'web' && refreshing ? (
              <ActivityIndicator color={Color.primary} style={{ marginTop: 8 }} />
            ) : null}
            <View style={{ paddingTop: 8, paddingBottom: 16 }}>
              <AppText size={24} weight={800} color={Color.navy}>
                Needs review
              </AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Color.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <AppText size={15} weight={800} color={Color.navy}>
                All caught up
              </AppText>
              <AppText size={13} weight={700} color={Ink.t55} center style={{ marginTop: 4 }}>
                No chores waiting for review.
              </AppText>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ReviewRow
            chore={item}
            onPress={() =>
              router.push({ pathname: '/(admin)/chore/[cid]', params: { cid: item.id } })
            }
          />
        )}
      />
    </Screen>
  );
}

function ReviewRow({ chore, onPress }: { chore: Chore; onPress: () => void }) {
  const kidName = chore.proof_by?.name ?? 'A kid';
  const avatarName = chore.proof_by?.name ?? '?';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? Color.keyPress : Color.card,
        borderRadius: Radius.row,
        borderWidth: 2,
        borderColor: Color.softBlue,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#123a5e',
        shadowOpacity: 0.06,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      })}>
      <Avatar name={avatarName} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText size={13} weight={700} color={Ink.t55}>
          {kidName}
        </AppText>
        <AppText size={15} weight={800} color={Color.navy} numberOfLines={1}>
          {chore.title}
        </AppText>
      </View>
      <CoinChip amount={chore.reward_coins} />
      {chore.proof_photo_urls.length > 0 ? (
        <Image
          source={{ uri: chore.proof_photo_urls[0] }}
          style={{
            width: 52,
            height: 52,
            borderRadius: Radius.chip,
            backgroundColor: Color.softBlue,
          }}
          resizeMode="cover"
        />
      ) : null}
    </Pressable>
  );
}
