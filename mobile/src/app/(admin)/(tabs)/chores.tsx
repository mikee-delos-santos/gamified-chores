import { useFocusEffect, useRouter } from 'expo-router';
import { Ban, Check, ChevronRight, Pencil, Star, Trash2, X } from 'lucide-react-native';
import { ReactNode, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  GestureResponderEvent,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card, CoinChip } from '@/components/ui/card';
import { PhotoThumbs } from '@/components/ui/photo-thumbs';
import { usePhotoSource } from '@/components/ui/photo-source-sheet';
import { Pop } from '@/components/ui/pop';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useWebPullToRefresh } from '@/hooks/use-web-pull-to-refresh';
import {
  ChildProfile,
  Chore,
  ChoreTemplate,
  completeChore,
  createAndRewardChore,
  createChore,
  createChoreTemplate,
  deleteChore,
  deleteChoreTemplate,
  expireChore,
  listChildProfiles,
  listChores,
  listChoreTemplates,
  postChoreTemplate,
  updateChore,
  uploadHowToPhotos,
  uploadTemplateHowToPhotos,
} from '@/lib/api';
import { fmtCoins } from '@/lib/format';
import { useSession } from '@/lib/session';
import { Color, Ink, Radius } from '@/theme/tokens';

// award = grade/5 × reward, rounded to 2 decimals for display.
function awardFor(grade: number, reward: number): number {
  return Math.round((grade / 5) * reward * 100) / 100;
}

// Label for the shared photo picker: proof shots when rewarding on the spot, how-to guidance
// otherwise.
function photoButtonLabel(rewarding: boolean, count: number): string {
  if (rewarding) return count ? `Proof photos (${count})` : 'Add proof photos';
  return count ? `How-to photos (${count})` : 'Add how-to photos';
}

const PER = 20;

export default function AdminChores() {
  const { token } = useSession();
  const router = useRouter();

  // Which segment is showing: the paginated active (open) chores, or the recurring templates.
  const [tab, setTab] = useState<'active' | 'recurring'>('active');

  // Active list — paginated, infinite scroll.
  const [chores, setChores] = useState<Chore[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
  const [kids, setKids] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollNode, setScrollNode] = useState<HTMLElement | null>(null);

  // Create form (shared by both segments; the recurring segment hides the assignee picker).
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  // Optional assignee for a new one-off chore; null = open to any kid.
  const [assignId, setAssignId] = useState<number | null>(null);
  // Parent-initiated proof: reward a kid the moment the chore is created (no proof needed).
  const [rewardNow, setRewardNow] = useState(false);
  const [rewardChildId, setRewardChildId] = useState<number | null>(null);
  const [rewardGrading, setRewardGrading] = useState(false);
  const [rewardGrade, setRewardGrade] = useState(5);

  // Award sheet + edit sheet
  const [target, setTarget] = useState<Chore | null>(null);
  const [editTarget, setEditTarget] = useState<Chore | null>(null);

  const { choose, sheet } = usePhotoSource();

  const loadActive = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (!token) return;
      const batch = await listChores(token, { status: 'open', page: nextPage, per: PER });
      setChores((prev) => (replace ? batch : [...prev, ...batch]));
      setHasMore(batch.length === PER);
      setPage(nextPage);
    },
    [token],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [templateList, kidList] = await Promise.all([
        listChoreTemplates(token),
        listChildProfiles(),
      ]);
      setTemplates(templateList);
      setKids(kidList);
      await loadActive(1, true);
    } catch {
      setError('Could not load chores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, loadActive]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Load the next active page when the list nears its end (active segment only).
  const onEndReached = useCallback(() => {
    if (tab !== 'active' || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadActive(page + 1, false)
      .catch(() => setError('Could not load more chores.'))
      .finally(() => setLoadingMore(false));
  }, [tab, loading, loadingMore, hasMore, page, loadActive]);

  // Shared by both lists; only used to grab the scrollable DOM node for web pull-to-refresh.
  const listRef = useCallback((r: { getScrollableNode?: () => HTMLElement } | null) => {
    setScrollNode(r?.getScrollableNode?.() ?? null);
  }, []);

  useWebPullToRefresh(scrollNode, onRefresh);

  async function onCreate() {
    if (!token) return;
    const coins = Number(reward);
    if (!title.trim() || Number.isNaN(coins) || coins <= 0) {
      setError('Enter a title and a reward above 0.');
      return;
    }
    const isRecurring = tab === 'recurring';
    // Reward-now is only for one-off active chores, and needs a kid picked.
    const rewarding = !isRecurring && rewardNow;
    if (rewarding && rewardChildId == null) {
      setError('Pick which kid to reward.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const input = {
        title: title.trim(),
        description: description.trim() || undefined,
        reward_coins: coins,
      };
      if (isRecurring) {
        const template = await createChoreTemplate(token, input);
        if (newPhotos.length) {
          await uploadTemplateHowToPhotos(token, template.id, newPhotos);
        }
      } else if (rewarding) {
        // Create the chore already completed and awarded; the attached photos are the proof.
        await createAndRewardChore(token, {
          ...input,
          child_profile_id: assignId,
          award_to: rewardChildId as number,
          grade: rewardGrading ? rewardGrade : 5,
          proofPhotos: newPhotos,
        });
      } else {
        // Assignment only applies to one-time chores; templates are family-wide.
        const chore = await createChore(token, { ...input, child_profile_id: assignId });
        if (newPhotos.length) {
          await uploadHowToPhotos(token, chore.id, newPhotos);
        }
      }
      setTitle('');
      setDescription('');
      setReward('');
      setNewPhotos([]);
      setAssignId(null);
      setRewardNow(false);
      setRewardChildId(null);
      setRewardGrading(false);
      setRewardGrade(5);
      await load();
    } catch {
      setError(isRecurring ? 'Could not create the template.' : 'Could not create the chore.');
    } finally {
      setCreating(false);
    }
  }

  async function addNewPhotos() {
    const uris = await choose(true);
    if (uris.length) setNewPhotos((prev) => [...prev, ...uris]);
  }

  // The create form + the tab-specific bits above each list. Kept as an element (not a component)
  // so React doesn't remount it on each keystroke and drop the TextField focus.
  const header = (
    <View>
      {Platform.OS === 'web' && refreshing ? (
        <ActivityIndicator color={Color.primary} style={{ marginTop: 8 }} />
      ) : null}
      <View style={{ paddingTop: 8, paddingBottom: 14 }}>
        <AppText size={24} weight={800} color={Color.navy}>
          Chores
        </AppText>
      </View>

      <Segmented value={tab} onChange={setTab} />

      <Card style={{ gap: 10, padding: 16, marginTop: 16, marginBottom: 18 }}>
        <AppText size={16} weight={800} color={Color.navy}>
          {tab === 'recurring' ? 'New recurring chore' : 'New chore'}
        </AppText>
        <TextField placeholder="Chore title" value={title} onChangeText={setTitle} />
        <TextField
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
        />
        <TextField
          placeholder="Reward coins"
          keyboardType="numeric"
          value={reward}
          onChangeText={setReward}
        />
        {newPhotos.length > 0 ? <PhotoThumbs urls={newPhotos} size={48} /> : null}
        <SecondaryButton
          label={photoButtonLabel(rewardNow && tab === 'active', newPhotos.length)}
          onPress={addNewPhotos}
        />
        {tab === 'active' && kids.length > 0 ? (
          <AssignPicker kids={kids} value={assignId} onChange={setAssignId} />
        ) : null}
        {tab === 'active' && kids.length > 0 ? (
          <RewardSection
            enabled={rewardNow}
            onToggle={() => {
              setError(null);
              setRewardNow((on) => !on);
            }}
            kids={kids}
            childId={rewardChildId}
            onPickChild={setRewardChildId}
            grading={rewardGrading}
            onToggleGrading={() => {
              setRewardGrading((g) => !g);
              setRewardGrade(5);
            }}
            grade={rewardGrade}
            onSetGrade={setRewardGrade}
            reward={Number(reward) || 0}
          />
        ) : null}
        {creating ? (
          <View
            style={{
              backgroundColor: Color.primary,
              borderRadius: Radius.card,
              paddingVertical: 17,
              alignItems: 'center',
              borderBottomWidth: 6,
              borderBottomColor: Color.primaryPress,
            }}>
            <ActivityIndicator color={Color.white} />
          </View>
        ) : (
          <PrimaryButton
            label={
              tab === 'recurring'
                ? 'Save recurring chore'
                : rewardNow
                  ? 'Add & reward'
                  : 'Add chore'
            }
            onPress={onCreate}
          />
        )}
      </Card>

      {tab === 'active' ? (
        <Pressable
          onPress={() => router.push('/(admin)/archive')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: Color.card,
            borderRadius: Radius.card,
            borderWidth: 2,
            borderColor: Color.softBlue,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 18,
          }}>
          <AppText size={15} weight={800} color={Color.navy}>
            Done & archived
          </AppText>
          <ChevronRight size={20} color={Color.primary} strokeWidth={2.6} />
        </Pressable>
      ) : null}

      {error ? (
        <AppText size={13} weight={700} color="#c8452f" style={{ marginBottom: 10 }}>
          {error}
        </AppText>
      ) : null}

      {tab === 'active' && !loading && chores.length > 0 ? (
        <AppText size={18} weight={800} color={Color.navy} style={{ marginBottom: 10 }}>
          Active chores
        </AppText>
      ) : null}
      {tab === 'recurring' && templates.length > 0 ? (
        <AppText size={18} weight={800} color={Color.navy} style={{ marginBottom: 10 }}>
          Recurring chores
        </AppText>
      ) : null}
    </View>
  );

  const refreshControl = (
    <RefreshControl refreshing={refreshing} tintColor={Color.primary} onRefresh={onRefresh} />
  );

  return (
    <Screen padded={false}>
      {sheet}
      {tab === 'active' ? (
        <FlatList<Chore>
          ref={listRef}
          data={chores}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={refreshControl}
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          ListHeaderComponent={header}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={Color.primary} style={{ marginTop: 24 }} />
            ) : (
              <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
                <AppText size={15} weight={800} color={Color.navy}>
                  No active chores
                </AppText>
                <AppText size={13} weight={700} color={Ink.t55} center style={{ marginTop: 4 }}>
                  Add one above to get started.
                </AppText>
              </Card>
            )
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={Color.primary} style={{ marginTop: 16 }} /> : null
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item, index }) => (
            <Pop delay={Math.min(index, 8) * 50} from={0.99} translateY={10} damping={16} stiffness={150}>
              <ChoreRow
                chore={item}
                token={token}
                onAward={() => setTarget(item)}
                onEdit={() => setEditTarget(item)}
                onChanged={load}
              />
            </Pop>
          )}
        />
      ) : (
        <FlatList<ChoreTemplate>
          ref={listRef}
          data={templates}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={refreshControl}
          ListHeaderComponent={header}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={Color.primary} style={{ marginTop: 24 }} />
            ) : (
              <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
                <AppText size={15} weight={800} color={Color.navy}>
                  No recurring chores
                </AppText>
                <AppText size={13} weight={700} color={Ink.t55} center style={{ marginTop: 4 }}>
                  Save one above to post it again anytime.
                </AppText>
              </Card>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <TemplateRow template={item} token={token} onChanged={load} />
          )}
        />
      )}

      <AwardSheet
        chore={target}
        token={token}
        onClose={() => setTarget(null)}
        onDone={async () => {
          setTarget(null);
          await load();
        }}
      />

      <EditChoreSheet
        chore={editTarget}
        kids={kids}
        token={token}
        onClose={() => setEditTarget(null)}
        onDone={async () => {
          setEditTarget(null);
          await load();
        }}
      />
    </Screen>
  );
}

// The Active | Recurring segmented control at the top of the Chores tab.
function Segmented({
  value,
  onChange,
}: {
  value: 'active' | 'recurring';
  onChange: (v: 'active' | 'recurring') => void;
}) {
  const options: { key: 'active' | 'recurring'; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'recurring', label: 'Recurring' },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: Color.softBlue,
        borderRadius: Radius.pill,
        padding: 4,
        gap: 4,
      }}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 9,
              borderRadius: Radius.pill,
              backgroundColor: on ? Color.primary : 'transparent',
            }}>
            <AppText size={14} weight={800} color={on ? Color.white : Ink.t55}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// A done-state pill on a chore card: a colored circle icon plus a label. Awarded is green,
// rejected is red, expired is neutral.
function StatusBadge({
  fill,
  circle,
  icon,
  label,
}: {
  fill: string;
  circle: string;
  icon: ReactNode;
  label: string;
}) {
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

function ChoreRow({
  chore,
  token,
  onAward,
  onEdit,
  onChanged,
}: {
  chore: Chore;
  token: string | null;
  onAward: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const done = chore.status !== 'open';
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!token) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteChore(token, chore.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function onExpire() {
    if (!token) return;
    setBusy(true);
    try {
      await expireChore(token, chore.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  // Inner controls stop propagation so their tap doesn't also bubble to the card-open press on web.
  function stop(e: GestureResponderEvent) {
    e.stopPropagation();
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(admin)/chore/[cid]', params: { cid: chore.id } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}>
      <Card style={{ padding: 14, gap: 12, ...(chore.proof_by?.color ? { borderColor: chore.proof_by.color } : null) }}>
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

        {chore.how_to_photo_urls.length > 0 ? <PhotoThumbs urls={chore.how_to_photo_urls} size={48} /> : null}

        {chore.proof_photo_urls.length > 0 ? (
          <View style={{ gap: 4 }}>
            <AppText size={12} weight={700} color={Ink.t55}>
              {`Proof from ${chore.proof_by?.name ?? 'kid'}`}
            </AppText>
            <PhotoThumbs urls={chore.proof_photo_urls} size={64} />
          </View>
        ) : null}

        {chore.status === 'open' ? (
          <SecondaryButton
            label="View"
            onPress={(e?: GestureResponderEvent) => {
              e?.stopPropagation();
              onAward();
            }}
          />
        ) : chore.status === 'completed' ? (
          <StatusBadge
            fill={Color.successFill}
            circle={Color.success}
            icon={<Check size={13} color={Color.white} strokeWidth={3} />}
            label={`Awarded${chore.grade ? ` · ${chore.grade}/5` : ''}`}
          />
        ) : chore.status === 'rejected' ? (
          <StatusBadge
            fill={Color.dangerFill}
            circle={Color.danger}
            icon={<X size={13} color={Color.white} strokeWidth={3} />}
            label="Rejected"
          />
        ) : (
          <StatusBadge
            fill={Color.softBlue}
            circle={Color.dashed}
            icon={<Ban size={12} color={Color.white} strokeWidth={3} />}
            label="Expired"
          />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable
            onPress={(e) => {
              stop(e);
              onEdit();
            }}
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Pencil size={14} color={Ink.t55} strokeWidth={2.4} />
            <AppText size={13} weight={800} color={Ink.t55}>
              Edit
            </AppText>
          </Pressable>
          {!done ? (
            <Pressable
              onPress={(e) => {
                stop(e);
                onExpire();
              }}
              disabled={busy}
              hitSlop={6}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ban size={14} color={Ink.t55} strokeWidth={2.4} />
              <AppText size={13} weight={800} color={Ink.t55}>
                Expire
              </AppText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={(e) => {
              stop(e);
              onDelete();
            }}
            disabled={busy}
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Trash2 size={14} color="#c8452f" strokeWidth={2.4} />
            <AppText size={13} weight={800} color="#c8452f">
              {confirmDelete ? 'Tap to confirm' : 'Delete'}
            </AppText>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

function TemplateRow({
  template,
  token,
  onChanged,
}: {
  template: ChoreTemplate;
  token: string | null;
  onChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onPost() {
    if (!token) return;
    setBusy(true);
    try {
      await postChoreTemplate(token, template.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!token) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteChoreTemplate(token, template.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText size={16} weight={800} color={Color.navy}>
            {template.title}
          </AppText>
          {template.description ? (
            <AppText size={12} weight={600} color={Ink.t55}>
              {template.description}
            </AppText>
          ) : null}
        </View>
        <CoinChip amount={template.reward_coins} />
      </View>

      {template.how_to_photo_urls.length > 0 ? (
        <PhotoThumbs urls={template.how_to_photo_urls} size={48} />
      ) : null}

      {busy ? (
        <View
          style={{
            backgroundColor: Color.primary,
            borderRadius: Radius.card,
            paddingVertical: 17,
            alignItems: 'center',
            borderBottomWidth: 6,
            borderBottomColor: Color.primaryPress,
          }}>
          <ActivityIndicator color={Color.white} />
        </View>
      ) : (
        <PrimaryButton label="Post this chore" onPress={onPost} />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable
          onPress={onDelete}
          disabled={busy}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Trash2 size={14} color="#c8452f" strokeWidth={2.4} />
          <AppText size={13} weight={800} color="#c8452f">
            {confirmDelete ? 'Tap to confirm' : 'Delete'}
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

// Pick which kid a chore is for. "Anyone" (null) leaves it open to all kids; a kid chip assigns
// it to that one kid. Mirrors the "Who did it?" chip styling in the award sheet.
function AssignPicker({
  kids,
  value,
  onChange,
}: {
  kids: ChildProfile[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  function chip(on: boolean, label: string, key: string, onPress: () => void, avatar?: string) {
    return (
      <Pressable
        key={key}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 7,
          paddingHorizontal: 12,
          borderRadius: Radius.pill,
          borderWidth: 2,
          borderColor: on ? Color.primary : Color.softBlue,
          backgroundColor: on ? Color.primary : Color.card,
        }}>
        {avatar ? <Avatar name={avatar} size={24} onPrimary={on} /> : null}
        <AppText size={13} weight={800} color={on ? Color.white : Color.navy}>
          {label}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <AppText size={13} weight={700} color={Ink.t60}>
        Assign to
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chip(value === null, 'Anyone', 'anyone', () => onChange(null))}
        {kids.map((k) => chip(value === k.id, k.name, String(k.id), () => onChange(k.id), k.name))}
      </View>
    </View>
  );
}

// Parent-initiated proof: a toggle that, when on, reveals a kid picker and a full-coins/grade
// control so a new chore is rewarded the moment it's created (the kid had no phone to submit proof).
function RewardSection({
  enabled,
  onToggle,
  kids,
  childId,
  onPickChild,
  grading,
  onToggleGrading,
  grade,
  onSetGrade,
  reward,
}: {
  enabled: boolean;
  onToggle: () => void;
  kids: ChildProfile[];
  childId: number | null;
  onPickChild: (id: number) => void;
  grading: boolean;
  onToggleGrading: () => void;
  grade: number;
  onSetGrade: (n: number) => void;
  reward: number;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Pressable
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: Radius.card,
          borderWidth: 2,
          borderColor: enabled ? Color.primary : Color.softBlue,
          backgroundColor: enabled ? Color.primary : Color.card,
          paddingVertical: 12,
          paddingHorizontal: 14,
        }}>
        <AppText size={14} weight={800} color={enabled ? Color.white : Color.navy}>
          Reward a kid now
        </AppText>
        <View
          style={{
            width: 46,
            height: 26,
            borderRadius: 13,
            backgroundColor: enabled ? Color.white : Color.softBlue,
            padding: 3,
            alignItems: enabled ? 'flex-end' : 'flex-start',
          }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: enabled ? Color.primary : Color.dashed,
            }}
          />
        </View>
      </Pressable>

      {enabled ? (
        <>
          <View style={{ gap: 8 }}>
            <AppText size={13} weight={700} color={Ink.t60}>
              Who did it?
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {kids.map((k) => {
                const on = childId === k.id;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => onPickChild(k.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      borderRadius: Radius.pill,
                      borderWidth: 2,
                      borderColor: on ? Color.primary : Color.softBlue,
                      backgroundColor: on ? Color.primary : Color.card,
                    }}>
                    <Avatar name={k.name} size={24} onPrimary={on} />
                    <AppText size={13} weight={800} color={on ? Color.white : Color.navy}>
                      {k.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {grading ? (
            <View style={{ gap: 8 }}>
              <AppText size={13} weight={700} color={Ink.t60}>
                How well?
              </AppText>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => onSetGrade(n)} hitSlop={4}>
                    <Star
                      size={30}
                      color={n <= grade ? Color.coinGold : Color.dashed}
                      fill={n <= grade ? Color.coinGold : 'transparent'}
                      strokeWidth={2}
                    />
                  </Pressable>
                ))}
              </View>
              <AppText size={13} weight={700} color={Ink.t55} tabular>
                Earns {fmtCoins(awardFor(grade, reward))} of {fmtCoins(reward)} coins
              </AppText>
            </View>
          ) : null}

          <Pressable onPress={onToggleGrading} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
            <AppText size={13} weight={800} color={Color.primary}>
              {grading ? 'Give full coins instead' : 'Grade instead'}
            </AppText>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function EditChoreSheet({
  chore,
  kids,
  token,
  onClose,
  onDone,
}: {
  chore: Chore | null;
  kids: ChildProfile[];
  token: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [assignId, setAssignId] = useState<number | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { choose, sheet } = usePhotoSource();

  useFocusEffect(
    useCallback(() => {
      if (!chore) return;
      setTitle(chore.title);
      setDescription(chore.description ?? '');
      setReward(String(chore.reward_coins));
      setAssignId(chore.assigned_to?.id ?? null);
      setPendingPhotos([]);
      setErr(null);
    }, [chore]),
  );

  if (!chore) return null;

  async function addPhotos() {
    const uris = await choose(true);
    if (uris.length) setPendingPhotos((prev) => [...prev, ...uris]);
  }

  async function save() {
    if (!token || !chore) return;
    const coins = Number(reward);
    if (!title.trim() || Number.isNaN(coins) || coins <= 0) {
      setErr('Enter a title and a reward above 0.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await updateChore(token, chore.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        reward_coins: coins,
        child_profile_id: assignId,
      });
      if (pendingPhotos.length) {
        await uploadHowToPhotos(token, chore.id, pendingPhotos);
      }
      onDone();
    } catch {
      setErr('Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,58,94,0.45)' }}>
        <View
          style={{
            backgroundColor: Color.appBg,
            borderTopLeftRadius: Radius.sheet,
            borderTopRightRadius: Radius.sheet,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: 28,
            gap: 12,
          }}>
          {sheet}
          <AppText size={22} weight={900} color={Color.navy}>
            Edit chore
          </AppText>
          <TextField placeholder="Chore title" value={title} onChangeText={setTitle} />
          <TextField
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
          />
          <TextField
            placeholder="Reward coins"
            keyboardType="numeric"
            value={reward}
            onChangeText={setReward}
          />

          {kids.length > 0 ? (
            <AssignPicker kids={kids} value={assignId} onChange={setAssignId} />
          ) : null}

          <View style={{ gap: 8 }}>
            <AppText size={13} weight={700} color={Ink.t60}>
              How-to photos
            </AppText>
            {chore.how_to_photo_urls.length > 0 ? <PhotoThumbs urls={chore.how_to_photo_urls} /> : null}
            {pendingPhotos.length > 0 ? <PhotoThumbs urls={pendingPhotos} /> : null}
            <SecondaryButton
              label={pendingPhotos.length ? `Add more (${pendingPhotos.length} new)` : 'Add how-to photos'}
              onPress={addPhotos}
            />
          </View>

          {err ? (
            <AppText size={13} weight={700} color="#c8452f">
              {err}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <SecondaryButton label="Cancel" onPress={onClose} style={{ flex: 1 }} />
            {busy ? (
              <View
                style={{
                  flex: 1,
                  backgroundColor: Color.primary,
                  borderRadius: Radius.card,
                  paddingVertical: 17,
                  alignItems: 'center',
                  borderBottomWidth: 6,
                  borderBottomColor: Color.primaryPress,
                }}>
                <ActivityIndicator color={Color.white} />
              </View>
            ) : (
              <PrimaryButton label="Save" onPress={save} style={{ flex: 1 }} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AwardSheet({
  chore,
  token,
  onClose,
  onDone,
}: {
  chore: Chore | null;
  token: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [childId, setChildId] = useState<number | null>(null);
  const [grade, setGrade] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!chore) return;
      setChildId(null);
      setGrade(5);
      setErr(null);
      listChildProfiles()
        .then(setProfiles)
        .catch(() => setErr('Could not load kids.'));
    }, [chore]),
  );

  if (!chore) return null;

  async function confirm() {
    if (!token || !chore || childId == null) {
      setErr('Pick a kid first.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await completeChore(token, chore.id, { child_profile_id: childId, grade });
      onDone();
    } catch {
      setErr('Could not award it. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const preview = awardFor(grade, chore.reward_coins);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,58,94,0.45)' }}>
        <View
          style={{
            backgroundColor: Color.appBg,
            borderTopLeftRadius: Radius.sheet,
            borderTopRightRadius: Radius.sheet,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: 28,
            gap: 14,
          }}>
          <AppText size={22} weight={900} color={Color.navy}>
            {chore.title}
          </AppText>

          <View style={{ gap: 8 }}>
            <AppText size={13} weight={700} color={Ink.t60}>
              Who did it?
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profiles.map((p) => {
                const on = childId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setChildId(p.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      borderRadius: Radius.pill,
                      borderWidth: 2,
                      borderColor: on ? Color.primary : Color.softBlue,
                      backgroundColor: on ? Color.primary : Color.card,
                    }}>
                    <Avatar name={p.name} size={24} onPrimary={on} />
                    <AppText size={13} weight={800} color={on ? Color.white : Color.navy}>
                      {p.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <AppText size={13} weight={700} color={Ink.t60}>
              How well?
            </AppText>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setGrade(n)} hitSlop={4}>
                  <Star
                    size={34}
                    color={n <= grade ? Color.coinGold : Color.dashed}
                    fill={n <= grade ? Color.coinGold : 'transparent'}
                    strokeWidth={2}
                  />
                </Pressable>
              ))}
            </View>
            <AppText size={13} weight={700} color={Ink.t55} tabular>
              Earns {fmtCoins(preview)} of {fmtCoins(chore.reward_coins)} coins
            </AppText>
          </View>

          {chore.proof_photo_urls.length === 0 ? (
            <AppText size={12} weight={700} color={Ink.t55}>
              No proof photo - you&apos;re rewarding without one.
            </AppText>
          ) : null}

          {err ? (
            <AppText size={13} weight={700} color="#c8452f">
              {err}
            </AppText>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <SecondaryButton label="Cancel" onPress={onClose} style={{ flex: 1 }} />
            {busy ? (
              <View
                style={{
                  flex: 1,
                  backgroundColor: Color.primary,
                  borderRadius: Radius.card,
                  paddingVertical: 17,
                  alignItems: 'center',
                  borderBottomWidth: 6,
                  borderBottomColor: Color.primaryPress,
                }}>
                <ActivityIndicator color={Color.white} />
              </View>
            ) : (
              <PrimaryButton label="Give coins" onPress={confirm} style={{ flex: 1 }} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
