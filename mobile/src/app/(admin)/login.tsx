import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { CoinIcon } from '@/components/ui/coin-icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Color, Ink } from '@/theme/tokens';

export default function AdminLogin() {
  const { status, signIn } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. the boot check resolved while here): go to the hub.
  if (status === 'signedIn') {
    return <Redirect href="/(admin)/(tabs)/chores" />;
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(admin)/(tabs)/chores');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('That email or password did not work.');
      } else {
        setError('Could not reach the server. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <CoinIcon size={30} />
          <AppText size={17} weight={800} color={Color.navy}>
            Faye Coins
          </AppText>
        </View>
        <AppText size={28} weight={900} color={Color.navy} lineHeight={32}>
          Grown-up sign in
        </AppText>
        <AppText size={13} weight={700} color={Ink.t62} lineHeight={20} style={{ marginBottom: 8 }}>
          Sign in to set chores and award coins.
        </AppText>

        <TextField
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

        {error ? (
          <AppText size={13} weight={700} color="#c8452f">
            {error}
          </AppText>
        ) : null}

        {submitting ? (
          <View
            style={{
              backgroundColor: Color.primary,
              borderRadius: 22,
              paddingVertical: 17,
              alignItems: 'center',
              borderBottomWidth: 6,
              borderBottomColor: Color.primaryPress,
            }}>
            <ActivityIndicator color={Color.white} />
          </View>
        ) : (
          <PrimaryButton label="Sign in" onPress={onSubmit} />
        )}

        <Pressable onPress={() => router.replace('/')} style={{ alignItems: 'center', marginTop: 4 }}>
          <AppText size={14} weight={800} color={Ink.t55}>
            Back
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
