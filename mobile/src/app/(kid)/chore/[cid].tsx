import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card, CoinChip } from '@/components/ui/card';
import { PhotoThumbs } from '@/components/ui/photo-thumbs';
import { usePhotoSource } from '@/components/ui/photo-source-sheet';
import { Screen } from '@/components/ui/screen';
import { Chore, listOpenChores, uploadProofPhotos } from '@/lib/api';
import { BoundKid, getBoundKid } from '@/lib/device-session';
import { Color, Ink, Radius } from '@/theme/tokens';

// Picked-but-not-yet-sent proof photos, each with a tap-to-remove badge.
function RemovableThumbs({ uris, onRemove }: { uris: string[]; onRemove: (uri: string) => void }) {
  const size = 92;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {uris.map((uri, i) => (
        <View key={`${uri}-${i}`}>
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: Radius.chip, backgroundColor: Color.softBlue }}
            contentFit="cover"
          />
          <Pressable
            onPress={() => onRemove(uri)}
            hitSlop={8}
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: Color.navy,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <X size={14} color={Color.white} strokeWidth={3} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// Kid chore detail: see the how-to, add a photo showing it's done, and send it. A grown-up
// awards the coins later (this never self-awards — append-only ledger).
export default function KidChoreDetail() {
  const { cid, name } = useLocalSearchParams<{ cid: string; name?: string }>();
  const router = useRouter();
  const choreId = Number(cid);
  const kidName = name ?? 'you';

  const [chore, setChore] = useState<Chore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [boundKid, setBoundKid] = useState<BoundKid | null>(null);
  const { choose, sheet } = usePhotoSource();

  const load = useCallback(async () => {
    setError(null);
    try {
      // Fetch the bound kid first so the open-chores list is scoped to this device's kid.
      // Without the id the backend returns only unassigned chores, so a chore assigned to
      // this kid would be missing here and the screen would show "not available".
      const kid = await getBoundKid();
      setBoundKid(kid);
      const open = await listOpenChores(kid?.id ?? undefined);
      const found = open.find((c) => c.id === choreId) ?? null;
      setChore(found);
      if (found && found.proof_photo_urls.length > 0) setSent(true);
    } catch {
      setError('Could not load this chore.');
    } finally {
      setLoading(false);
    }
  }, [choreId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // When deep-linked from a notification there's no history to pop, so fall back to home.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(kid)/(tabs)/chores');
  }

  async function addPhoto() {
    const uris = await choose(true);
    if (uris.length) setPicked((prev) => [...prev, ...uris]);
  }

  function removePhoto(uri: string) {
    setPicked((prev) => prev.filter((u) => u !== uri));
  }

  async function iDidIt() {
    if (!picked.length) return;
    setBusy(true);
    setError(null);
    try {
      await uploadProofPhotos(choreId, picked, kidName, boundKid?.id);
      setSent(true);
    } catch {
      setError('Could not send your photos. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {sheet}
      <Pressable
        onPress={() => goBack()}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
        <ChevronLeft size={22} color={Color.primary} strokeWidth={2.6} />
        <AppText size={15} weight={800} color={Color.primary}>
          Chores
        </AppText>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={Color.primary} style={{ marginTop: 40 }} />
      ) : !chore ? (
        <View style={{ marginTop: 24, gap: 8 }}>
          <AppText size={15} weight={700} color={Color.ink}>
            {error ?? 'This chore is not available.'}
          </AppText>
          <Pressable onPress={() => goBack()}>
            <AppText size={14} weight={800} color={Color.primary}>
              Back
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <AppText size={27} weight={800} color={Color.navy} lineHeight={31} style={{ flex: 1 }}>
              {chore.title}
            </AppText>
            <CoinChip amount={chore.reward_coins} />
          </View>
          {chore.description ? (
            <AppText size={14} weight={600} color={Ink.t62} lineHeight={21}>
              {chore.description}
            </AppText>
          ) : null}

          {chore.how_to_photo_urls.length > 0 ? (
            <View style={{ gap: 8 }}>
              <AppText size={15} weight={800} color={Color.navy}>
                How to do it
              </AppText>
              <PhotoThumbs urls={chore.how_to_photo_urls} size={92} />
            </View>
          ) : null}

          <View style={{ gap: 10 }}>
            <AppText size={15} weight={800} color={Color.navy}>
              Show it&apos;s done
            </AppText>

            {sent ? (
              <Card style={{ gap: 10, padding: 16, backgroundColor: Color.softBlue, borderColor: Color.softBlueBorder }}>
                <AppText size={16} weight={800} color={Color.navy}>
                  {picked.length > 1 || chore.proof_photo_urls.length > 1 ? 'Photos sent!' : 'Photo sent!'}
                </AppText>
                {(picked.length > 0 || chore.proof_photo_urls.length > 0) ? (
                  <PhotoThumbs urls={picked.length > 0 ? picked : chore.proof_photo_urls} size={92} />
                ) : null}
                <AppText size={13} weight={700} color={Ink.t60}>
                  Sent as {kidName}. Coins land when a grown-up says nice work.
                </AppText>
                <SecondaryButton label="Back to chores" onPress={() => goBack()} />
              </Card>
            ) : (
              <View style={{ gap: 10 }}>
                {picked.length > 0 ? <RemovableThumbs uris={picked} onRemove={removePhoto} /> : null}
                <SecondaryButton label={picked.length > 0 ? 'Add more photos' : 'Add a photo'} onPress={addPhoto} />
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
                  <View style={{ opacity: picked.length > 0 ? 1 : 0.5 }}>
                    <PrimaryButton label="I did it!" onPress={iDidIt} />
                  </View>
                )}
                {picked.length === 0 ? (
                  <AppText size={12} weight={700} color={Ink.t55}>
                    Add a photo first, then tap I did it.
                  </AppText>
                ) : null}
              </View>
            )}

            {error ? (
              <AppText size={13} weight={700} color="#c8452f">
                {error}
              </AppText>
            ) : null}
          </View>
        </View>
      )}
    </Screen>
  );
}
