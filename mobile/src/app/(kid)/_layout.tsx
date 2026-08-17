import { Stack } from 'expo-router';

// The kid area is open (no login), so this is a plain stack with no guard.
export default function KidLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
