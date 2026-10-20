import { Stack } from 'expo-router';

export default function JaapLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="practice" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="mala" />
      <Stack.Screen name="mantras" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="sankalp" />
      <Stack.Screen name="history" />
    </Stack>
  );
}

