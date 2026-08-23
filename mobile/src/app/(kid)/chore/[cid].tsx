import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card, CoinChip } from '@/components/ui/card';
import { PhotoThumbs } from '@/components/ui/photo-thumbs';
import { Screen } from '@/components/ui/screen';
import { Chore, listOpenChores, uploadProofPhoto } from '@/lib/api';
import { pickImages } from '@/lib/pick-images';
import { Color, Ink, Radius } from '@/theme/tokens';

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
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const open = await listOpenChores();
      const found = open.find((c) => c.id === choreId) ?? null;
      setChore(found);
      if (found?.proof_photo_url) setSent(true);
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

  async function addPhoto() {
    const uris = await pickImages(false);
    if (uris[0]) setPicked(uris[0]);
  }

  async function iDidIt() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await uploadProofPhoto(choreId, picked);
      setSent(true);
    } catch {
      setError('Could not send your photo. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Pressable
        onPress={() => router.back()}
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
          <Pressable onPress={() => router.back()}>
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
                  Photo sent!
                </AppText>
                {(picked || chore.proof_photo_url) ? (
                  <PhotoThumbs urls={[picked ?? (chore.proof_photo_url as string)]} size={92} />
                ) : null}
                <AppText size={13} weight={700} color={Ink.t60}>
                  Sent as {kidName}. Coins land when a grown-up says nice work.
                </AppText>
                <SecondaryButton label="Back to chores" onPress={() => router.back()} />
              </Card>
            ) : (
              <View style={{ gap: 10 }}>
                {picked ? <PhotoThumbs urls={[picked]} size={92} /> : null}
                <SecondaryButton label={picked ? 'Pick a different photo' : 'Add a photo'} onPress={addPhoto} />
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
                  <View style={{ opacity: picked ? 1 : 0.5 }}>
                    <PrimaryButton label="I did it!" onPress={iDidIt} />
                  </View>
                )}
                {!picked ? (
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
