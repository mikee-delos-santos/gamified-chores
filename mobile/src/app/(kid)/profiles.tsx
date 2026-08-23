import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Pop } from '@/components/ui/pop';
import { Screen } from '@/components/ui/screen';
import { ChildProfile, listChildProfiles } from '@/lib/api';
import { setBoundKid } from '@/lib/device-session';
import { Color, Ink } from '@/theme/tokens';

export default function KidProfiles() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProfiles(await listChildProfiles());
    } catch {
      setError('Could not load profiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <View style={{ paddingTop: 8, paddingBottom: 20 }}>
        <AppText size={28} weight={800} color={Color.navy} lineHeight={32}>
          Who&apos;s here?
        </AppText>
        <AppText size={13} weight={700} color={Ink.t62} lineHeight={20} style={{ marginTop: 6 }}>
          Tap your name to see your coins.
        </AppText>
      </View>

      {error ? (
        <View style={{ alignItems: 'center', gap: 8, marginTop: 32 }}>
          <AppText size={14} weight={700} color={Color.ink}>
            {error}
          </AppText>
          <Pressable onPress={load}>
            <AppText size={15} weight={800} color={Color.primary}>
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator color={Color.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          ListEmptyComponent={
            <AppText size={14} weight={700} color={Ink.t55} center style={{ marginTop: 24 }}>
              No kids yet. A grown-up can add them.
            </AppText>
          }
          renderItem={({ item, index }) => (
            <Pop delay={index * 60} from={0.99} translateY={10} damping={16} stiffness={150}>
              <Pressable
                onPress={async () => {
                  await setBoundKid({ id: item.id, name: item.name });
                  router.replace(`/(kid)/${item.id}`);
                }}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                  <Avatar name={item.name} size={44} />
                  <AppText size={18} weight={800} color={Color.navy} style={{ flex: 1 }}>
                    {item.name}
                  </AppText>
                  <ChevronRight size={22} color={Color.primary} strokeWidth={2.6} />
                </Card>
              </Pressable>
            </Pop>
          )}
        />
      )}
    </Screen>
  );
}
