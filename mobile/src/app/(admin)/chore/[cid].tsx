import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, Star } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { CoinChip } from '@/components/ui/card';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { PhotoThumbs } from '@/components/ui/photo-thumbs';
import { Screen } from '@/components/ui/screen';
import { ChildProfile, Chore, completeChore, listChildProfiles, listChores } from '@/lib/api';
import { fmtCoins } from '@/lib/format';
import { useSession } from '@/lib/session';
import { Color, Ink, Radius } from '@/theme/tokens';

// award = grade/5 × reward, rounded to 2 decimals for display.
function awardFor(grade: number, reward: number): number {
  return Math.round((grade / 5) * reward * 100) / 100;
}

// One-line summary of a chore that is no longer open, shown in place of the award controls.
function outcomeLabel(chore: Chore): string {
  switch (chore.status) {
    case 'completed':
      return chore.grade
        ? `Awarded ${chore.grade}/5 · ${fmtCoins(awardFor(chore.grade, chore.reward_coins))} coins`
        : `Awarded · ${fmtCoins(chore.reward_coins)} coins`;
    case 'rejected':
      return 'Sent back to redo';
    case 'expired':
      return 'Expired';
    default:
      return '';
  }
}

// Admin chore detail. For an open chore that a kid has submitted, compare the how-to against the
// proof (full size) and award the full reward or grade it down. For a chore that is already done
// (completed / rejected / expired) the same screen opens read-only with its outcome.
export default function AdminChoreDetail() {
  const { cid } = useLocalSearchParams<{ cid: string }>();
  const router = useRouter();
  const { token } = useSession();
  const choreId = Number(cid);

  const [chore, setChore] = useState<Chore | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [childId, setChildId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [proofZoom, setProofZoom] = useState(false);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState(5);
  const [busy, setBusy] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [chores, kids] = await Promise.all([listChores(token), listChildProfiles()]);
      setProfiles(kids);
      const found = chores.find((c) => c.id === choreId) ?? null;
      setChore(found);
      setChildId((prev) => prev ?? found?.proof_by?.id ?? null);
    } catch {
      setError('Could not load this chore.');
    } finally {
      setLoading(false);
    }
  }, [token, choreId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Deep-linked from a notification means there's no history to pop, so fall back to the tab.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(admin)/(tabs)/review');
  }

  async function award(g: number) {
    if (!token || !chore) return;
    if (childId == null) {
      setAwardError('Pick a kid first.');
      return;
    }
    setBusy(true);
    setAwardError(null);
    try {
      await completeChore(token, chore.id, { child_profile_id: childId, grade: g });
      router.replace('/(admin)/(tabs)/review');
    } catch {
      setAwardError('Could not award it. Try again.');
      setBusy(false);
    }
  }

  const canAward = chore?.status === 'open';

  return (
    <Screen>
      <Pressable
        onPress={() => goBack()}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
        <ChevronLeft size={22} color={Color.primary} strokeWidth={2.6} />
        <AppText size={15} weight={800} color={Color.primary}>
          {canAward ? 'Needs review' : 'Chore'}
        </AppText>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={Color.primary} style={{ marginTop: 40 }} />
      ) : !chore ? (
        <View style={{ marginTop: 24, gap: 8 }}>
          <AppText size={15} weight={700} color={Color.ink}>
            {error ?? 'Chore not found.'}
          </AppText>
          <Pressable onPress={() => goBack()}>
            <AppText size={14} weight={800} color={Color.primary}>
              Back
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
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
                How it should look
              </AppText>
              <PhotoThumbs urls={chore.how_to_photo_urls} size={92} />
            </View>
          ) : null}

          {canAward ? (
            <View style={{ gap: 8 }}>
              <AppText size={15} weight={800} color={Color.navy}>
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
          ) : chore.proof_by ? (
            <View style={{ gap: 8 }}>
              <AppText size={15} weight={800} color={Color.navy}>
                Who did it?
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar name={chore.proof_by.name} size={24} />
                <AppText size={13} weight={800} color={Color.navy}>
                  {chore.proof_by.name}
                </AppText>
              </View>
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <AppText size={15} weight={800} color={Color.navy}>
              Their proof
            </AppText>
            {chore.proof_photo_url ? (
              <Pressable onPress={() => setProofZoom(true)}>
                <Image
                  source={{ uri: chore.proof_photo_url }}
                  style={{
                    width: '100%',
                    height: 260,
                    borderRadius: Radius.card,
                    backgroundColor: Color.softBlue,
                  }}
                  contentFit="cover"
                />
                <AppText size={12} weight={700} color={Ink.t55} style={{ marginTop: 6 }}>
                  Tap to see it full size
                </AppText>
              </Pressable>
            ) : (
              <AppText size={13} weight={700} color={Ink.t55}>
                No proof photo yet.
              </AppText>
            )}
          </View>

          {canAward ? (
            <>
              {grading ? (
                <View style={{ gap: 8 }}>
                  <AppText size={15} weight={800} color={Color.navy}>
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
                    Earns {fmtCoins(awardFor(grade, chore.reward_coins))} of {fmtCoins(chore.reward_coins)} coins
                  </AppText>
                </View>
              ) : null}

              {awardError ? (
                <AppText size={13} weight={700} color="#c8452f">
                  {awardError}
                </AppText>
              ) : null}

              <View style={{ gap: 12, marginTop: 4 }}>
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
                ) : grading ? (
                  <PrimaryButton label="Give coins" onPress={() => award(grade)} />
                ) : (
                  <PrimaryButton label="Give full coins" onPress={() => award(5)} />
                )}

                <SecondaryButton
                  label={grading ? 'Give full coins instead' : 'Grade instead'}
                  onPress={() => {
                    if (busy) return;
                    setAwardError(null);
                    if (grading) {
                      setGrading(false);
                    } else {
                      setGrade(5);
                      setGrading(true);
                    }
                  }}
                />
              </View>
            </>
          ) : (
            <View
              style={{
                backgroundColor: Color.softBlue,
                borderRadius: Radius.card,
                paddingVertical: 14,
                paddingHorizontal: 14,
                marginTop: 4,
              }}>
              <AppText size={14} weight={800} color={Color.navy}>
                {outcomeLabel(chore)}
              </AppText>
            </View>
          )}
        </ScrollView>
      )}

      <ImageLightbox
        urls={chore?.proof_photo_url ? [chore.proof_photo_url] : []}
        index={proofZoom ? 0 : null}
        onIndexChange={() => {}}
        onClose={() => setProofZoom(false)}
      />
    </Screen>
  );
}
