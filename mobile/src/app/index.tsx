import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Role gate: the home both areas return to. "Parent" enters the auth-guarded admin
// group (which bounces to login when there is no token); "Kid" opens the open kid area.
export default function RoleGate() {
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.centered}>
          Faye Coins
        </ThemedText>
        <ThemedText type="subtitle" style={styles.centered}>
          {"Who's here?"}
        </ThemedText>

        <ThemedView style={styles.buttons}>
          <Pressable
            style={[styles.button, styles.parent]}
            onPress={() => router.push('/(admin)/chores')}>
            <ThemedText type="default" style={styles.buttonLabel}>
              {"I'm a Parent"}
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.button, styles.kid]}
            onPress={() => router.push('/(kid)/profiles')}>
            <ThemedText type="default" style={styles.buttonLabel}>
              {"I'm a Kid"}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  centered: { textAlign: 'center' },
  buttons: { width: '100%', gap: 16, marginTop: 24 },
  button: {
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  parent: { backgroundColor: '#3b6cff' },
  kid: { backgroundColor: '#ff9500' },
  buttonLabel: { color: '#fff', fontSize: 18 },
});
