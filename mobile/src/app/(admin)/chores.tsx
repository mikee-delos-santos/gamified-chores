import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ChildProfile,
  Chore,
  completeChore,
  createChore,
  listChildProfiles,
  listChores,
} from '@/lib/api';
import { useSession } from '@/lib/session';

// award = grade/5 × reward, rounded to 2 decimals for display.
function awardFor(grade: number, reward: number): number {
  return Math.round((grade / 5) * reward * 100) / 100;
}

function stars(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
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
  const [creating, setCreating] = useState(false);

  // Mark-done modal
  const [target, setTarget] = useState<Chore | null>(null);

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
      setError('Enter a title and a positive reward.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createChore(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        reward_coins: coins,
      });
      setTitle('');
      setDescription('');
      setReward('');
      await load();
    } catch {
      setError('Could not create the chore.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Chores</ThemedText>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.replace('/')}>
              <ThemedText type="small" style={styles.headerLink}>
                Home
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={async () => {
                await signOut();
                router.replace('/');
              }}>
              <ThemedText type="small" style={styles.headerLink}>
                Log out
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="New chore title"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
          />
          <TextInput
            style={styles.input}
            placeholder="Reward coins"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={reward}
            onChangeText={setReward}
          />
          <Pressable
            style={[styles.primary, creating && styles.disabled]}
            disabled={creating}
            onPress={onCreate}>
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="default" style={styles.primaryLabel}>
                Add chore
              </ThemedText>
            )}
          </Pressable>
        </View>

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <FlatList
            data={chores}
            keyExtractor={(c) => String(c.id)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText type="small" style={styles.empty}>
                No chores yet. Add one above.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <ChoreRow chore={item} onMarkDone={() => setTarget(item)} />
            )}
          />
        )}
      </SafeAreaView>

      <MarkDoneModal
        chore={target}
        token={token}
        onClose={() => setTarget(null)}
        onDone={async () => {
          setTarget(null);
          await load();
        }}
      />
    </ThemedView>
  );
}

function ChoreRow({ chore, onMarkDone }: { chore: Chore; onMarkDone: () => void }) {
  const done = chore.status !== 'open';
  return (
    <ThemedView style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText type="default">{chore.title}</ThemedText>
        <ThemedText type="small" style={styles.muted}>
          {chore.reward_coins} coins
          {done && chore.grade ? `  ·  done ${stars(chore.grade)}` : ''}
          {done && !chore.grade ? `  ·  ${chore.status}` : ''}
        </ThemedText>
      </View>
      {!done ? (
        <Pressable style={styles.markBtn} onPress={onMarkDone}>
          <ThemedText type="small" style={styles.markLabel}>
            Mark done
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

function MarkDoneModal({
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

  // Load the profile picker each time the modal opens for a chore.
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
      setErr('Could not mark it done.');
    } finally {
      setBusy(false);
    }
  }

  const preview = awardFor(grade, chore.reward_coins);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.sheet}>
          <ThemedText type="subtitle">{chore.title}</ThemedText>

          <ThemedText type="small" style={styles.muted}>
            Who did it?
          </ThemedText>
          <View style={styles.chips}>
            {profiles.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.chip, childId === p.id && styles.chipOn]}
                onPress={() => setChildId(p.id)}>
                <ThemedText type="small" style={childId === p.id ? styles.chipOnLabel : undefined}>
                  {p.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" style={styles.muted}>
            Grade
          </ThemedText>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setGrade(n)}>
                <ThemedText style={[styles.star, n <= grade && styles.starOn]}>★</ThemedText>
              </Pressable>
            ))}
          </View>
          <ThemedText type="small" style={styles.preview}>
            {grade}★ → {preview} of {chore.reward_coins} coins
          </ThemedText>

          {err ? (
            <ThemedText type="small" style={styles.error}>
              {err}
            </ThemedText>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable style={styles.secondary} onPress={onClose} disabled={busy}>
              <ThemedText type="small">Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.primary, styles.flex1, busy && styles.disabled]}
              onPress={confirm}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText type="default" style={styles.primaryLabel}>
                  Confirm
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerLink: { color: '#3b6cff' },
  form: { gap: 8, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#fff',
  },
  primary: {
    backgroundColor: '#3b6cff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryLabel: { color: '#fff' },
  disabled: { opacity: 0.6 },
  loader: { marginTop: 24 },
  list: { gap: 8, paddingBottom: 24 },
  empty: { textAlign: 'center', opacity: 0.7, marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  rowMain: { flex: 1, gap: 2 },
  muted: { opacity: 0.7 },
  markBtn: {
    backgroundColor: '#e6efff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  markLabel: { color: '#3b6cff' },
  error: { color: '#d33', marginVertical: 4 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipOn: { backgroundColor: '#3b6cff', borderColor: '#3b6cff' },
  chipOnLabel: { color: '#fff' },
  starRow: { flexDirection: 'row', gap: 4 },
  star: { fontSize: 32, color: '#ccc' },
  starOn: { color: '#ffb400' },
  preview: { opacity: 0.9 },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  secondary: { paddingVertical: 12, paddingHorizontal: 16 },
  flex1: { flex: 1 },
});
