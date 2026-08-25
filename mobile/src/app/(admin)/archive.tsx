import { useRouter } from 'expo-router';
import { Ban, Check, ChevronLeft, X } from 'lucide-react-native';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card, CoinChip } from '@/components/ui/card';
import { PhotoThumbs } from '@/components/ui/photo-thumbs';
import { Pop } from '@/components/ui/pop';
import { Screen } from '@/components/ui/screen';
import { Chore, ChoreStatus, listChores } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Color, Ink, Radius } from '@/theme/tokens';

const PER = 20;

const FILTERS: { key: ChoreStatus; label: string }[] = [
  { key: 'completed', label: 'Done' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired', label: 'Expired' },
];

// Done/rejected/expired chores, split off the main Chores tab (PC-72). One paginated,
// infinite-scroll list per status, chosen by the chips at the top.
export default function ChoreArchive() {
  const router = useRouter();
  const { token } = useSession();

  const [status, setStatus] = useState<ChoreStatus>('completed');
  const [chores, setChores] = useState<Chore[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (!token) return;
      setError(null);
      try {
        const batch = await listChores(token, { status, page: nextPage, per: PER });
        setChores((prev) => (replace ? batch : [...prev, ...batch]));
        setHasMore(batch.length === PER);
        setPage(nextPage);
      } catch {
        setError('Could not load these chores.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, status],
  );

  // Reset and load whenever the selected status changes.
  useEffect(() => {
    setLoading(true);
    setChores([]);
    setHasMore(true);
    loadPage(1, true);
  }, [loadPage]);

  const onEndReached = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadPage(page + 1, false);
  }, [loading, loadingMore, hasMore, page, loadPage]);

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
          <ChevronLeft size={22} color={Color.primary} strokeWidth={2.6} />
          <AppText size={15} weight={800} color={Color.primary}>
            Chores
          </AppText>
        </Pressable>

        <AppText size={24} weight={800} color={Color.navy} style={{ paddingTop: 4, paddingBottom: 14 }}>
          Done & archived
        </AppText>

        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 14 }}>
          {FILTERS.map((f) => {
            const on = status === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: Radius.pill,
                  borderWidth: 2,
                  borderColor: on ? Color.primary : Color.softBlue,
                  backgroundColor: on ? Color.primary : Color.card,
                }}>
                <AppText size={13} weight={800} color={on ? Color.white : Color.navy}>
                  {f.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList<Chore>
        data={chores}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        onEndReachedThreshold={0.4}
        onEndReached={onEndReached}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Color.primary} style={{ marginTop: 24 }} />
          ) : error ? (
            <AppText size={14} weight={700} color="#c8452f" center style={{ marginTop: 24 }}>
              {error}
            </AppText>
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
              <AppText size={15} weight={800} color={Color.navy}>
                Nothing here yet
              </AppText>
            </Card>
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={Color.primary} style={{ marginTop: 16 }} /> : null
        }
        renderItem={({ item, index }) => (
          <Pop delay={Math.min(index, 8) * 40} from={0.99} translateY={8} damping={16} stiffness={150}>
            <ArchiveRow
              chore={item}
              onPress={() => router.push({ pathname: '/(admin)/chore/[cid]', params: { cid: item.id } })}
            />
          </Pop>
        )}
      />
    </Screen>
  );
}

function ArchiveRow({ chore, onPress }: { chore: Chore; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}>
      <Card style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText size={16} weight={800} color={Color.navy}>
              {chore.title}
            </AppText>
            {chore.description ? (
              <AppText size={12} weight={600} color={Ink.t55}>
                {chore.description}
              </AppText>
            ) : null}
          </View>
          <CoinChip amount={chore.reward_coins} />
        </View>

        {chore.proof_photo_urls.length > 0 ? <PhotoThumbs urls={chore.proof_photo_urls} size={48} /> : null}

        <StatusPill status={chore.status} grade={chore.grade} />
      </Card>
    </Pressable>
  );
}

function StatusPill({ status, grade }: { status: ChoreStatus; grade: number | null }) {
  let fill: string;
  let circle: string;
  let icon: ReactNode;
  let label: string;
  if (status === 'completed') {
    fill = Color.successFill;
    circle = Color.success;
    icon = <Check size={13} color={Color.white} strokeWidth={3} />;
    label = `Awarded${grade ? ` · ${grade}/5` : ''}`;
  } else if (status === 'rejected') {
    fill = Color.dangerFill;
    circle = Color.danger;
    icon = <X size={13} color={Color.white} strokeWidth={3} />;
    label = 'Rejected';
  } else {
    fill = Color.softBlue;
    circle = Color.dashed;
    icon = <Ban size={12} color={Color.white} strokeWidth={3} />;
    label = 'Expired';
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: fill,
        borderRadius: Radius.chip,
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignSelf: 'flex-start',
      }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: circle,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {icon}
      </View>
      <AppText size={13} weight={800} color={Color.navy}>
        {label}
      </AppText>
    </View>
  );
}
