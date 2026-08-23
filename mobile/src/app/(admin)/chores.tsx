import { useFocusEffect, useRouter } from 'expo-router';
import { Check, Pencil, Star, Trash2, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card, CoinChip } from '@/components/ui/card';
import { DangerZone } from '@/components/ui/danger-zone';
import { NotificationsCard } from '@/components/ui/notifications-card';
import { PhotoThumbs } from '@/components/ui/photo-thumbs';
import { Pop } from '@/components/ui/pop';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import {
  ChildProfile,
  Chore,
  completeChore,
  createChore,
  deleteChore,
  listChildProfiles,
  listChores,
  updateChore,
  uploadHowToPhotos,
} from '@/lib/api';
import { pickImages } from '@/lib/pick-images';
import { fmtCoins } from '@/lib/format';
import { useSession } from '@/lib/session';
import { Color, Ink, Radius } from '@/theme/tokens';

// award = grade/5 × reward, rounded to 2 decimals for display.
function awardFor(grade: number, reward: number): number {
  return Math.round((grade / 5) * reward * 100) / 100;
}

export default function AdminChores() {
  const { token, signOut } = useSession();
  const router = useRouter();

  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-chore form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Award sheet + edit sheet
  const [target, setTarget] = useState<Chore | null>(null);
  const [editTarget, setEditTarget] = useState<Chore | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      setChores(await listChores(token));
    } catch {
      setError('Could not load chores.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onCreate() {
    if (!token) return;
    const coins = Number(reward);
    if (!title.trim() || Number.isNaN(coins) || coins <= 0) {
      setError('Enter a title and a reward above 0.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const chore = await createChore(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        reward_coins: coins,
      });
      if (newPhotos.length) {
        await uploadHowToPhotos(token, chore.id, newPhotos);
      }
      setTitle('');
      setDescription('');
      setReward('');
      setNewPhotos([]);
      await load();
    } catch {
      setError('Could not create the chore.');
    } finally {
      setCreating(false);
    }
  }

  async function addNewPhotos() {
    const uris = await pickImages(true);
    if (uris.length) setNewPhotos((prev) => [...prev, ...uris]);
  }

  return (
    <Screen padded={false}>
      <FlatList<Chore>
        data={chores}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                paddingBottom: 16,
              }}>
              <AppText size={24} weight={800} color={Color.navy}>
                Chores
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push('/(admin)/kids')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Users size={16} color={Color.primary} strokeWidth={2.4} />
                  <AppText size={14} weight={800} color={Color.primary}>
                    Kids
                  </AppText>
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={async () => {
                    await signOut();
                    router.replace('/');
                  }}>
                  <AppText size={14} weight={800} color={Ink.t55}>
                    Sign out
                  </AppText>
                </Pressable>
              </View>
            </View>

            <Card style={{ gap: 10, padding: 16, marginBottom: 18 }}>
              <AppText size={16} weight={800} color={Color.navy}>
                New chore
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
                label={newPhotos.length ? `How-to photos (${newPhotos.length})` : 'Add how-to photos'}
                onPress={addNewPhotos}
              />
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
                <PrimaryButton label="Add chore" onPress={onCreate} />
              )}
            </Card>

            <View style={{ marginBottom: 18 }}>
              <NotificationsCard adminToken={token} />
            </View>

            {error ? (
              <AppText size={13} weight={700} color="#c8452f" style={{ marginBottom: 10 }}>
                {error}
              </AppText>
            ) : null}

            {!loading && chores.length > 0 ? (
              <AppText size={18} weight={800} color={Color.navy} style={{ marginBottom: 10 }}>
                All chores
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Color.primary} style={{ marginTop: 24 }} />
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
              <AppText size={15} weight={800} color={Color.navy}>
                No chores yet
              </AppText>
              <AppText size={13} weight={700} color={Ink.t55} center style={{ marginTop: 4 }}>
                Add one above to get started.
              </AppText>
            </Card>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={
          <View style={{ marginTop: 24 }}>
            <DangerZone token={token} onChanged={load} />
          </View>
        }
        renderItem={({ item, index }) => (
          <Pop delay={index * 50} from={0.99} translateY={10} damping={16} stiffness={150}>
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

  return (
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

      {chore.how_to_photo_urls.length > 0 ? <PhotoThumbs urls={chore.how_to_photo_urls} size={48} /> : null}

      {chore.proof_photo_url ? (
        <View style={{ gap: 4 }}>
          <AppText size={12} weight={700} color={Ink.t55}>
            Proof from kid
          </AppText>
          <PhotoThumbs urls={[chore.proof_photo_url]} size={64} />
        </View>
      ) : null}

      {done ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: Color.softBlue,
            borderRadius: Radius.chip,
            paddingVertical: 8,
            paddingHorizontal: 10,
          }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: Color.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Check size={13} color={Color.white} strokeWidth={3} />
          </View>
          <AppText size={13} weight={800} color={Color.navy}>
            Awarded{chore.grade ? ` · ${chore.grade}/5` : ''}
          </AppText>
        </View>
      ) : (
        <SecondaryButton label="Award to a kid" onPress={onAward} />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable onPress={onEdit} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Pencil size={14} color={Ink.t55} strokeWidth={2.4} />
          <AppText size={13} weight={800} color={Ink.t55}>
            Edit
          </AppText>
        </Pressable>
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

function EditChoreSheet({
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!chore) return;
      setTitle(chore.title);
      setDescription(chore.description ?? '');
      setReward(String(chore.reward_coins));
      setPendingPhotos([]);
      setErr(null);
    }, [chore]),
  );

  if (!chore) return null;

  async function addPhotos() {
    const uris = await pickImages(true);
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
