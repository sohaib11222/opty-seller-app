import { Stack } from 'expo-router';

export default function AuthenticationLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
