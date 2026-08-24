import { useFocusEffect, useRouter } from 'expo-router';
import { Check, Pencil, Trash2, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DangerZone } from '@/components/ui/danger-zone';
import { Pop } from '@/components/ui/pop';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useWebPullToRefresh } from '@/hooks/use-web-pull-to-refresh';
import {
  ChildProfile,
  createChildProfile,
  deleteChildProfile,
  getPinStatus,
  listChildProfiles,
  renameChildProfile,
  setFamilyPin,
} from '@/lib/api';
import { useSession } from '@/lib/session';
import { Color, Ink, Radius } from '@/theme/tokens';

const DANGER = '#c8452f';

export default function AdminKids() {
  const { token, signOut } = useSession();
  const router = useRouter();

  const [kids, setKids] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [scrollNode, setScrollNode] = useState<HTMLElement | null>(null);
  // Super-admin tools stay hidden until a long-press on the title reveals them,
  // so the destructive actions aren't a stray tap away.
  const [showDanger, setShowDanger] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setKids(await listChildProfiles());
    } catch {
      setError('Could not load kids.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const listRef = useCallback((r: FlatList<ChildProfile> | null) => {
    setScrollNode((r as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.() ?? null);
  }, []);

  useWebPullToRefresh(scrollNode, onRefresh);

  async function onAdd() {
    if (!token || !newName.trim()) return;
    setBusy(true);
    try {
      await createChildProfile(token, newName.trim());
      setNewName('');
      await load();
    } catch {
      setError('Could not add that kid.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded={false}>
      <FlatList<ChildProfile>
        ref={listRef}
        data={kids}
        keyExtractor={(k) => String(k.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Color.primary} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {Platform.OS === 'web' && refreshing ? (
              <ActivityIndicator color={Color.primary} style={{ marginTop: 8 }} />
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                paddingBottom: 16,
              }}>
              <Pressable
                delayLongPress={1200}
                onLongPress={() => setShowDanger((v) => !v)}>
                <AppText size={24} weight={800} color={Color.navy}>
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

            <Card style={{ gap: 10, padding: 16, marginBottom: 18 }}>
              <AppText size={16} weight={800} color={Color.navy}>
                Add a kid
              </AppText>
              <TextField placeholder="Name" value={newName} onChangeText={setNewName} />
              <PrimaryButton label="Add kid" onPress={onAdd} />
            </Card>

            <PinManager token={token} />

            {error ? (
              <AppText size={13} weight={700} color={DANGER} style={{ marginBottom: 10 }}>
                {error}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Color.primary} style={{ marginTop: 24 }} />
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
              <AppText size={14} weight={700} color={Ink.t55}>
                No kids yet. Add one above.
              </AppText>
            </Card>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={
          showDanger ? (
            <View style={{ marginTop: 24 }}>
              <DangerZone token={token} onChanged={load} />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Pop delay={index * 50} from={0.99} translateY={10} damping={16} stiffness={150}>
            <KidRow kid={item} token={token} onChanged={load} />
          </Pop>
        )}
      />
    </Screen>
  );
}

function KidRow({
  kid,
  token,
  onChanged,
}: {
  kid: ChildProfile;
  token: string | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(kid.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!token || !name.trim()) return;
    setBusy(true);
    try {
      await renameChildProfile(token, kid.id, name.trim());
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!token) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteChildProfile(token, kid.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
        <TextField value={name} onChangeText={setName} autoFocus style={{ flex: 1 }} />
        <Pressable onPress={save} disabled={busy} hitSlop={6} style={iconBtn(Color.primary)}>
          <Check size={18} color={Color.white} strokeWidth={3} />
        </Pressable>
        <Pressable
          onPress={() => {
            setEditing(false);
            setName(kid.name);
          }}
          hitSlop={6}
          style={iconBtn(Color.softBlue)}>
          <X size={18} color={Color.navy} strokeWidth={3} />
        </Pressable>
      </Card>
    );
  }

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
      <Avatar name={kid.name} size={40} />
      <AppText size={16} weight={800} color={Color.navy} style={{ flex: 1 }}>
        {kid.name}
      </AppText>
      <Pressable onPress={() => setEditing(true)} hitSlop={6} style={iconBtn(Color.softBlue)}>
        <Pencil size={16} color={Color.primary} strokeWidth={2.4} />
      </Pressable>
      <Pressable
        onPress={remove}
        disabled={busy}
        hitSlop={6}
        style={iconBtn(confirmDelete ? DANGER : '#f7e2dd')}>
        <Trash2 size={16} color={confirmDelete ? Color.white : DANGER} strokeWidth={2.4} />
      </Pressable>
    </Card>
  );
}

function iconBtn(bg: string) {
  return {
    width: 36,
    height: 36,
    borderRadius: Radius.chip,
    backgroundColor: bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}

// Set/change the grown-up PIN kids need to switch which kid a device is bound to.
function PinManager({ token }: { token: string | null }) {
  const [pinSet, setPinSet] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPinStatus()
        .then(setPinSet)
        .catch(() => {});
    }, []),
  );

  async function save() {
    if (!token || busy) return;
    if (pin.length < 4) {
      setMsg('PIN must be at least 4 digits.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await setFamilyPin(token, pin);
      setPin('');
      setPinSet(true);
      setMsg('Grown-up PIN saved.');
    } catch {
      setMsg('Could not save the PIN.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 10, padding: 16, marginBottom: 18 }}>
      <AppText size={16} weight={800} color={Color.navy}>
        Grown-up PIN
      </AppText>
      <AppText size={12} weight={600} color={Ink.t55}>
        {pinSet
          ? 'A PIN is set — kids need it to switch accounts. Enter a new one to change it.'
          : "Set a PIN so a kid can't switch to another kid without a grown-up."}
      </AppText>
      <TextField
        placeholder="New PIN (4+ digits)"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
      />
      <PrimaryButton label={pinSet ? 'Change PIN' : 'Set PIN'} onPress={save} />
      {msg ? (
        <AppText size={12} weight={700} color={Ink.t60}>
          {msg}
        </AppText>
      ) : null}
    </Card>
  );
}
