import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function AdminLogin() {
  const { status, signIn } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. the boot check resolved while here): go to the hub.
  if (status === 'signedIn') {
    return <Redirect href="/(admin)/chores" />;
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(admin)/chores');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Could not reach the server. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Parent login</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          disabled={submitting}
          onPress={onSubmit}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="default" style={styles.buttonLabel}>
              Log in
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace('/')}>
          <ThemedText type="small" style={styles.back}>
            Back
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', gap: 12, padding: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  error: { color: '#d33' },
  button: {
    backgroundColor: '#3b6cff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonLabel: { color: '#fff', fontSize: 16 },
  back: { textAlign: 'center', marginTop: 8, opacity: 0.7 },
});
